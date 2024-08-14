// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

import "./Roles.sol";
import "./interfaces/IWinnablesTicketManager.sol";
import "./interfaces/IWinnablesTicket.sol";
import "./BaseCCIPSender.sol";
import "./BaseCCIPReceiver.sol";

contract WinnablesTicketManager is Roles, VRFConsumerBaseV2, IWinnablesTicketManager, BaseCCIPSender, BaseCCIPReceiver {
    using SafeERC20 for IERC20;

    uint256 constant internal MIN_RAFFLE_DURATION = 60;

    address immutable internal VRF_COORDINATOR;
    address immutable private TICKETS_CONTRACT;

    /// @dev The key hash of the Chainlink VRF
    bytes32 private immutable KEY_HASH;

    /// @dev The subscription ID of the Chainlink VRF
    uint64 public immutable SUBSCRIPTION_ID;

    /// @dev Mapping from Chainlink request id to struct RequestStatus
    mapping(uint256 => RequestStatus) internal _chainlinkRequests;

    /// @dev Mapping from raffle ID to struct Raffle
    mapping(uint256 => Raffle) private _raffles;

    /// @dev Nonces used in the signature that allows ticket sales to avoid signature reuse
    mapping(address => uint256) private _userNonces;

    /// @dev ETH locked in the contract because it might be needed for a refund
    uint256 private _lockedETH;

    /// @dev Contract constructor
    /// @param _linkToken Address of the LINK ERC20 token on the chain you are deploying to
    /// @param _vrfCoordinator Address of the Chainlink VRFCoordinator contract on the chain you are deploying to
    /// @param _subscriptionId ID of the Chainlink VRF subscription that will fund Random Number request
    /// @param _keyHash The key hash of the Chainlink VRF
    /// @param _tickets Address of the ERC1155 collection of the tickets
    /// @param _ccipRouter Address of the Chainlink CCIP Router
    constructor(
        address _linkToken,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _tickets,
        address _ccipRouter
    ) VRFConsumerBaseV2(_vrfCoordinator) BaseCCIPContract(_ccipRouter) BaseLinkConsumer(_linkToken) {
        VRF_COORDINATOR = _vrfCoordinator;
        SUBSCRIPTION_ID = _subscriptionId;
        KEY_HASH = _keyHash;
        TICKETS_CONTRACT = _tickets;
        _setRole(msg.sender, 0, true); // Deployer is admin by default
        LinkTokenInterface(LINK_TOKEN).approve(_ccipRouter, type(uint256).max);
    }

    // =============================================================
    // -- Public Views
    // =============================================================

    /// @notice (Public) Get general information about the state of a raffle
    /// @param id ID of the Raffle
    /// @return startsAt timestamp of when the raffle starts
    /// @return endsAt timestamp of when the raffle ends
    /// @return minTicketsThreshold minimum number of tickets that needs to be sold before
    ///         this raffle is elligible for drawing a winner
    /// @return maxTicketSupply maximum number of tickets that can be sold for this raffle
    /// @return maxHoldings maximum number of tickets that one address may hold
    /// @return totalRaised amount of ETH raised by this raffle
    /// @return status status of the raffle
    /// @return chainlinkRequestId ID of the Chainlink VRF request
    function getRaffle(uint256 id) external view returns(
        uint64 startsAt,
        uint64 endsAt,
        uint32 minTicketsThreshold,
        uint32 maxTicketSupply,
        uint32 maxHoldings,
        uint256 totalRaised,
        RaffleStatus status,
        uint256 chainlinkRequestId
    ) {
        Raffle storage raffle = _raffles[id];
        startsAt = raffle.startsAt;
        endsAt = raffle.endsAt;
        minTicketsThreshold = raffle.minTicketsThreshold;
        maxTicketSupply = raffle.maxTicketSupply;
        maxHoldings = raffle.maxHoldings;
        totalRaised = raffle.totalRaised;
        status = raffle.status;
        chainlinkRequestId = raffle.chainlinkRequestId;
    }

    /// @notice (Public) Shows the participation details of a participant to a raffle
    /// @param raffleId ID of the raffle
    /// @param participant Address of the participant
    /// @return totalSpent Total spent by address participant for raffle raffleId
    /// @return totalPurchased Total number of tickets purchased
    /// @return withdrawn Whether this player has been refunded for this raffle or not
    function getParticipation(uint256 raffleId, address participant) external view returns(
        uint128 totalSpent,
        uint32 totalPurchased,
        bool withdrawn
    ) {
        bytes32 participation = _raffles[raffleId].participations[participant];
        totalSpent = uint128(uint256(participation));
        totalPurchased = uint32(uint256(participation) >> 128);
        withdrawn = uint8((uint256(participation) >> 160) & 1) == 1;
    }

    /// @notice (Public) Shows the address of the winner of a raffle
    /// @param raffleId ID of the raffle
    /// @return winner Address of the winner
    function getWinner(uint256 raffleId) external view returns(address winner) {
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.status < RaffleStatus.FULFILLED || raffle.status == RaffleStatus.CANCELED) {
            revert RaffleNotFulfilled();
        }
        winner = _getWinnerByRequestId(raffle.chainlinkRequestId);
    }

    /// @notice (Public) Get the status of a Chainlink request
    /// @param requestId ID of the Chainlink request
    /// @return fulfilled The fulfillment status
    /// @return randomWord the Random number if the request is fulfilled
    /// @return raffleId the ID of the associated raffle
    function getRequestStatus(uint256 requestId) external view returns (
        bool fulfilled,
        uint256 randomWord,
        uint256 raffleId
    ) {
        RequestStatus storage request = _chainlinkRequests[requestId];
        Raffle storage raffle = _raffles[request.raffleId];
        if (raffle.status == RaffleStatus.NONE) revert RequestNotFound(requestId);
        fulfilled = raffle.status == RaffleStatus.FULFILLED;
        randomWord = request.randomWord;
        raffleId = request.raffleId;
    }

    /// @notice (Public) Check if a raffle should draw a winner
    /// @param raffleId Raffle ID
    /// @return true if the winner should be drawn, false otherwise
    function shouldDrawRaffle(uint256 raffleId) external view returns(bool) {
        _checkShouldDraw(raffleId);
        return true;
    }

    /// @notice (Public) Check if a raffle should be canceled
    /// @param raffleId Raffle ID
    /// @return true if the raffle should be canceled, false otherwise
    function shouldCancelRaffle(uint256 raffleId) external view returns(bool) {
        _checkShouldCancel(raffleId);
        return true;
    }

    /// @notice (Public) Get the nonce of a given address to use for a ticket purchase approval signature
    /// @param buyer Address of the account that wants to purchase a ticket
    /// @return nonce for this account
    function getNonce(address buyer) external view returns(uint256) {
        return _userNonces[buyer];
    }


    // =============================================================
    // -- Public functions
    // =============================================================

    /// @notice (Public) Participate in a raffle
    /// @param raffleId ID of the Raffle
    /// @param ticketCount Number of tickets purchased
    /// @param blockNumber Number of the block when the signature expires
    /// @param signature Signature provided by the API to authorize this ticket sale at given price
    function buyTickets(
        uint256 raffleId,
        uint16 ticketCount,
        uint256 blockNumber,
        bytes calldata signature
    ) external payable {
        if (ticketCount == 0) revert InvalidTicketCount();
        _checkTicketPurchaseable(raffleId, ticketCount);
        _checkPurchaseSig(raffleId, ticketCount, blockNumber, signature);

        Raffle storage raffle = _raffles[raffleId];
        uint256 participation = uint256(raffle.participations[msg.sender]);
        uint128 totalPaid = uint128(participation) + uint128(msg.value);
        uint32 totalPurchased = uint32(participation >> 128) + uint32(ticketCount);
        unchecked {
            raffle.participations[msg.sender] = bytes32(
                (participation & type(uint256).max << 160)
                | totalPaid |
                uint256(totalPurchased) << 128
            );
        }
        unchecked {
            raffle.totalRaised += msg.value;
            _userNonces[msg.sender]++;
            _lockedETH += msg.value;
        }
        IWinnablesTicket(TICKETS_CONTRACT).mint(msg.sender, raffleId, ticketCount);
        IWinnablesTicket(TICKETS_CONTRACT).refreshMetadata(raffleId);
    }

    /// @notice (Public) Refund their participation to a list of players for a canceled Raffle ID
    /// @param raffleId ID of the canceled Raffle
    /// @param players List of players to refund
    function refundPlayers(uint256 raffleId, address[] calldata players) external {
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.status != RaffleStatus.CANCELED) revert InvalidRaffle();
        for (uint256 i = 0; i < players.length; ) {
            address player = players[i];
            uint256 participation = uint256(raffle.participations[player]);
            if (((participation >> 160) & 1) == 1) revert PlayerAlreadyRefunded(player);
            raffle.participations[player] = bytes32(participation | (1 << 160));
            uint256 amountToSend = (participation & type(uint128).max);
            _sendETH(amountToSend, player);
            emit PlayerRefund(raffleId, player, bytes32(participation));
            unchecked { ++i; }
        }
    }

    // =============================================================
    // -- Admin functions
    // =============================================================

    /// @notice (Admin) Manage approved counterpart CCIP contracts
    /// @param contractAddress Address of counterpart contract on the remote chain
    /// @param chainSelector CCIP Chain selector of the remote chain
    /// @param enabled Boolean representing whether this counterpart should be allowed or denied
    function setCCIPCounterpart(
        address contractAddress,
        uint64 chainSelector,
        bool enabled
    ) external onlyRole(0) {
        _setCCIPCounterpart(contractAddress, chainSelector, enabled);
    }

    /// @notice (Admin) Create NFT Raffle for an prize NFT previously sent to this contract
    /// @param raffleId ID Of the raffle shared with the remote chain
    /// @param startsAt Epoch timestamp in seconds of the raffle start time
    /// @param endsAt Epoch timestamp in seconds of the raffle end time
    /// @param minTickets Minimum number of tickets required to be sold for this raffle
    /// @param maxHoldings Maximum number of tickets one player can hold
    function createRaffle(
        uint256 raffleId,
        uint64 startsAt,
        uint64 endsAt,
        uint32 minTickets,
        uint32 maxTickets,
        uint32 maxHoldings
    ) external onlyRole(0) {
        _checkRaffleTimings(startsAt, endsAt);
        if (maxTickets == 0) revert RaffleRequiresTicketSupplyCap();
        if (maxHoldings == 0) revert RaffleRequiresMaxHoldings();
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.status != RaffleStatus.PRIZE_LOCKED) revert PrizeNotLocked();

        raffle.status = RaffleStatus.IDLE;
        raffle.startsAt = startsAt;
        raffle.endsAt = endsAt;
        raffle.minTicketsThreshold = minTickets;
        raffle.maxTicketSupply = maxTickets;
        raffle.maxHoldings = maxHoldings;

        emit NewRaffle(raffleId);
    }

    /// @notice (Public) Cancel a raffle if it can be canceled
    /// @param raffleId ID of the raffle to cancel
    function cancelRaffle(address prizeManager, uint64 chainSelector, uint256 raffleId) external {
        _checkShouldCancel(raffleId);

        _raffles[raffleId].status = RaffleStatus.CANCELED;
        _sendCCIPMessage(
            prizeManager,
            chainSelector,
            abi.encodePacked(uint8(CCIPMessageType.RAFFLE_CANCELED), raffleId)
        );
        IWinnablesTicket(TICKETS_CONTRACT).refreshMetadata(raffleId);
    }

    /// @notice (Admin) Withdraw Link or any ERC20 tokens accidentally sent here
    /// @param tokenAddress Address of the token contract
    function withdrawTokens(address tokenAddress, uint256 amount) external onlyRole(0) {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (amount < balance) revert InsufficientBalance();
        token.safeTransfer(msg.sender, amount);
    }

    /// @notice (Admin) Withdraw ETH from a canceled raffle or ticket sales
    function withdrawETH() external onlyRole(0) {
        uint256 balance;
        unchecked {
            balance = address(this).balance - _lockedETH;
        }
        _sendETH(balance, msg.sender);
    }

    /// @notice (Public) Send a request for random number from Chainlink VRF
    /// @param raffleId ID of the Raffle we wish to draw a winner for
    function drawWinner(uint256 raffleId) external {
        Raffle storage raffle = _raffles[raffleId];
        _checkShouldDraw(raffleId);
        raffle.status = RaffleStatus.REQUESTED;

        uint256 requestId = VRFCoordinatorV2Interface(VRF_COORDINATOR).requestRandomWords(
            KEY_HASH,
            SUBSCRIPTION_ID,
            3,
            100_000,
            1
        );
        _chainlinkRequests[requestId] = RequestStatus({
            raffleId: raffleId,
            randomWord: 0
        });
        raffle.chainlinkRequestId = requestId;
        emit RequestSent(requestId, raffleId);
        IWinnablesTicket(TICKETS_CONTRACT).refreshMetadata(raffleId);
    }

    /// @notice (Public) Send a cross-chain message to the Prize Manager to
    ///         mark the prize as claimable by the winner
    /// @param raffleId ID of the Raffle we wish to draw a winner for
    function propagateRaffleWinner(address prizeManager, uint64 chainSelector, uint256 raffleId) external {
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.status != RaffleStatus.FULFILLED) revert InvalidRaffleStatus();
        raffle.status = RaffleStatus.PROPAGATED;
        address winner = _getWinnerByRequestId(raffle.chainlinkRequestId);

        _sendCCIPMessage(prizeManager, chainSelector, abi.encodePacked(uint8(CCIPMessageType.WINNER_DRAWN), raffleId, winner));
        IWinnablesTicket(TICKETS_CONTRACT).refreshMetadata(raffleId);
        unchecked {
            _lockedETH -= raffle.totalRaised;
        }
    }

    /// @notice (Chainlink VRF Coordinator) Use given random number as a result to determine the winner of a Raffle
    /// @param requestId ID of the VRF request to fulfill
    /// @param randomWords Array of 32 bytes integers sent back from the oracle
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RequestStatus storage request = _chainlinkRequests[requestId];
        Raffle storage raffle = _raffles[request.raffleId];
        if (raffle.status != RaffleStatus.REQUESTED) revert RequestNotFound(requestId);
        request.randomWord = randomWords[0];
        raffle.status = RaffleStatus.FULFILLED;
        emit WinnerDrawn(requestId);
        IWinnablesTicket(TICKETS_CONTRACT).refreshMetadata(request.raffleId);
    }

    /// @notice (Chainlink CCIP Router) Mark prize as locked
    /// @param message CCIP Message
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (address _senderAddress) = abi.decode(message.sender, (address));
        bytes32 counterpart = _packCCIPContract(_senderAddress, message.sourceChainSelector);
        if (!_ccipContracts[counterpart]) revert UnauthorizedCCIPSender();
        (uint256 raffleId) = abi.decode(message.data, (uint256));
        if (_raffles[raffleId].status != RaffleStatus.NONE) {
            // The raffle cannot be created, send back a cancel message to unlock the prize
            _sendCCIPMessage(
                _senderAddress,
                message.sourceChainSelector,
                abi.encodePacked(uint8(CCIPMessageType.RAFFLE_CANCELED), raffleId)
            );
            return;
        }
        _raffles[raffleId].status = RaffleStatus.PRIZE_LOCKED;

        emit RafflePrizeLocked(
            message.messageId,
            message.sourceChainSelector,
            raffleId
        );
    }

    // =============================================================
    // -- Internal functions
    // =============================================================

    /// @dev Checks that a raffle's start time and end time are consistent with the rules:
    ///      - If startsAt is less than block.timestamp use block.timestamp as the reference
    ///      - Raffle duration should be at least MIN_RAFFLE_DURATION
    /// @param startsAt Raffle scheduled starting time
    /// @param endsAt Raffle scheduled ending time
    function _checkRaffleTimings(uint64 startsAt, uint64 endsAt) internal view {
        if (startsAt < block.timestamp) startsAt = uint64(block.timestamp);
        if (startsAt + MIN_RAFFLE_DURATION > endsAt) revert RaffleClosingTooSoon();
    }

    /// @dev Checks that all the necessary conditions are met to purchase a ticket
    /// @param raffleId ID of the raffle for which the tickets are being sold
    /// @param ticketCount Number of tickets to be sold
    function _checkTicketPurchaseable(uint256 raffleId, uint256 ticketCount) internal view {
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.startsAt > block.timestamp) revert RaffleHasNotStarted();
        if (raffle.status != RaffleStatus.IDLE) revert RaffleHasEnded();
        if (block.timestamp > raffle.endsAt) revert RaffleHasEnded();
        uint256 ticketPurchased = uint256(uint32(uint256(raffle.participations[msg.sender]) >> 128));
        unchecked {
            if (ticketPurchased + ticketCount > raffle.maxHoldings) revert TooManyTickets();
        }
        uint256 supply = IWinnablesTicket(TICKETS_CONTRACT).supplyOf(raffleId);
        unchecked {
            if (supply + ticketCount > raffle.maxTicketSupply) revert TooManyTickets();
        }
    }

    function _checkShouldDraw(uint256 raffleId) internal view {
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.status != RaffleStatus.IDLE) revert InvalidRaffle();
        uint256 currentTicketSold = IWinnablesTicket(TICKETS_CONTRACT).supplyOf(raffleId);
        if (currentTicketSold == 0) revert NoParticipants();

        if (block.timestamp < raffle.endsAt) {
            if (currentTicketSold < raffle.maxTicketSupply) revert RaffleIsStillOpen();
        }
        if (currentTicketSold < raffle.minTicketsThreshold) revert TargetTicketsNotReached();
    }

    function _checkShouldCancel(uint256 raffleId) internal view {
        Raffle storage raffle = _raffles[raffleId];
        if (raffle.status == RaffleStatus.PRIZE_LOCKED) return;
        if (raffle.status != RaffleStatus.IDLE) revert InvalidRaffle();
        if (raffle.endsAt > block.timestamp) revert RaffleIsStillOpen();
        uint256 supply = IWinnablesTicket(TICKETS_CONTRACT).supplyOf(raffleId);
        if (supply > raffle.minTicketsThreshold) revert TargetTicketsReached();
    }

    /// @dev Checks the validity of a signature to allow the purchase of tickets at a given price
    /// @param raffleId ID of the Raffle
    /// @param ticketCount Number of tickets purchased
    /// @param blockNumber Number of the block when the signature expires
    /// @param signature Signature to check
    function _checkPurchaseSig(uint256 raffleId, uint16 ticketCount, uint256 blockNumber, bytes calldata signature) internal view {
        if (blockNumber < block.number) revert ExpiredCoupon();
        address signer = _getSigner(
            keccak256(
                abi.encodePacked(
                    msg.sender, _userNonces[msg.sender], raffleId, ticketCount, blockNumber, msg.value
                )
            ), signature
        );
        if (!_hasRole(signer, 1)) revert Unauthorized();
    }

    /// @dev Extracts the address of the signer from a signed message
    /// @param message SHA-3 Hash of the signed message
    /// @param signature Signature
    /// @return Address of the signer
    function _getSigner(bytes32 message, bytes calldata signature) internal pure returns(address) {
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        return ECDSA.recover(hash, signature);
    }

    /// @dev Get the address of the winner of a raffle for a given Chainlink request
    /// @param requestId ID of the Chainlink request
    /// @return Address of the winner of the raffle
    function _getWinnerByRequestId(uint256 requestId) internal view returns(address) {
        RequestStatus storage request = _chainlinkRequests[requestId];
        uint256 supply = IWinnablesTicket(TICKETS_CONTRACT).supplyOf(request.raffleId);
        uint256 winningTicketNumber = request.randomWord % supply;
        return IWinnablesTicket(TICKETS_CONTRACT).ownerOf(request.raffleId, winningTicketNumber);
    }

    /// @dev Sends ETH to an account and handles error cases
    /// @param amount The amount to send
    /// @param to The recipient
    function _sendETH(uint256 amount, address to) internal {
        if (amount == 0) revert NothingToSend();
        (bool success, ) = to.call{ value: amount }("");
        if (!success) revert ETHTransferFail();
    }
}
