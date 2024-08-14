// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

interface IWinnables {
    error InvalidPrize();
    error RaffleHasNotStarted();
    error RaffleHasEnded();
    error NothingToWithdraw();
    error RaffleIsStillOpen();
    error TooManyTickets();
    error InvalidRaffle();
    error RaffleNotFulfilled();
    error NoParticipants();
    error RequestNotFound(uint256 requestId);
    error TokenWithdrawFailed(address token, address receiver, uint256 amount);
    error ExpiredCoupon();
    error PlayerAlreadyRefunded(address player);
    error NothingToSend();
    error Unauthorized();
    error NothingToRefund();
    error TargetTicketsNotReached();
    error TargetTicketsReached();
    error RaffleClosingTooSoon();
    error InsufficientBalance();
    error NoWinner();
    error ETHTransferFail();
    error RaffleRequiresTicketSupplyCap();
    error RaffleRequiresMaxHoldings();

    event WinnerDrawn(uint256 indexed requestId);
    event RequestSent(uint256 indexed requestId, uint256 indexed raffleId);
    event NewRaffle(uint256 indexed id);
    event PrizeClaimed(uint256 indexed raffleId, address indexed winner);
    event PlayerRefund(uint256 indexed raffleId, address indexed player, bytes32 indexed participation);

    enum RaffleType { NONE, NFT, ETH, TOKEN }
    enum RaffleStatus { NONE, PRIZE_LOCKED, IDLE, REQUESTED, FULFILLED, PROPAGATED, CLAIMED, CANCELED }

    struct RequestStatus {
        uint256 raffleId;
        uint256 randomWord;
    }

    struct Raffle {
        RaffleStatus status;
        uint64 startsAt;
        uint64 endsAt;
        uint32 minTicketsThreshold;
        uint32 maxTicketSupply;
        uint32 maxHoldings;
        uint256 totalRaised;
        uint256 chainlinkRequestId;
        mapping(address => bytes32) participations;
    }
}
