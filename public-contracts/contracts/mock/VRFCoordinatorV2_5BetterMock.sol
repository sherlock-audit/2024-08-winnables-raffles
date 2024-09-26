// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRF.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

contract VRFCoordinatorV2_5BetterMock is VRF {
    LinkTokenInterface public LINK;

    event SubscriptionCreated(uint256 indexed subId, address owner);
    event SubscriptionFunded(uint256 indexed subId, uint256 oldBalance, uint256 newBalance);
    event SubscriptionConsumerAdded(uint256 indexed subId, address consumer);
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint256 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        bytes extraArgs,
        address indexed sender
    );

    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256 outputSeed,
        uint256 indexed subId,
        uint96 payment,
        bool nativePayment,
        bool success,
        bool onlyPremium
    );

    uint256 public s_currentReqId = 1;
    uint64 public s_currentSubNonce;
    uint8 public minConfirmations = 3;
    mapping(uint256 => uint256) /* reqId */ /* subId */ public s_requestSubs;
    mapping(uint256 => address) /* subID */ /* owner */ public s_subOwner;
    mapping(uint256 => uint256) /* subID */ /* balance */ public s_subscriptions;
    mapping(uint256 => uint256) /* subID */ /* reqCount */ public s_reqCounts;
    mapping(uint256 => address) /* reqId */ /* requester */ public s_requests;
    mapping(uint256 => mapping(address => bool)) /* subID */ /* consumer */ /* status */ public s_consumers;

    constructor(address linkToken) {
        LINK = LinkTokenInterface(linkToken);
    }

    function createSubscription() external returns (uint256 subId) {
        uint64 currentSubNonce = s_currentSubNonce;
        subId = uint256(
            keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), address(this), currentSubNonce))
        );
        s_currentSubNonce = currentSubNonce + 1;
        s_subscriptions[subId] = 0;
        s_subOwner[subId] = msg.sender;
        emit SubscriptionCreated(subId, msg.sender);
    }

    function addConsumer(uint256 subId, address consumer) external {
        if (msg.sender != s_subOwner[subId]) revert();
        s_consumers[subId][consumer] = true;

        emit SubscriptionConsumerAdded(subId, consumer);
    }

    function onTokenTransfer(address, uint256 amount, bytes calldata data) external {
        if (msg.sender != address(LINK)) {
            revert();
        }
        if (data.length != 32) {
            revert();
        }
        uint256 subId = abi.decode(data, (uint256));
        uint256 oldBalance = s_subscriptions[subId];
        s_subscriptions[subId] = oldBalance + amount;
        emit SubscriptionFunded(subId, oldBalance, oldBalance + amount);
    }

    /**
     * @notice Request a set of random words.
     * @param req - a struct containing following fiels for randomness request:
     * keyHash - Corresponds to a particular oracle job which uses
     * that key for generating the VRF proof. Different keyHash's have different gas price
     * ceilings, so you can select a specific one to bound your maximum per request cost.
     * subId  - The ID of the VRF subscription. Must be funded
     * with the minimum subscription balance required for the selected keyHash.
     * requestConfirmations - How many blocks you'd like the
     * oracle to wait before responding to the request. See SECURITY CONSIDERATIONS
     * for why you may want to request more. The acceptable range is
     * [minimumRequestBlockConfirmations, 200].
     * callbackGasLimit - How much gas you'd like to receive in your
     * fulfillRandomWords callback. Note that gasleft() inside fulfillRandomWords
     * may be slightly less than this amount because of gas used calling the function
     * (argument decoding etc.), so you may need to request slightly more than you expect
     * to have inside fulfillRandomWords. The acceptable range is
     * [0, maxGasLimit]
     * numWords - The number of uint256 random values you'd like to receive
     * in your fulfillRandomWords callback. Note these numbers are expanded in a
     * secure way by the VRFCoordinator from a single random value supplied by the oracle.
     * extraArgs - Encoded extra arguments that has a boolean flag for whether payment
     * should be made in native or LINK. Payment in LINK is only available if the LINK token is available to this contract.
     * @return requestId - A unique identifier of the request. Can be used to match
     * a request to a response in fulfillRandomWords.
     */
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId) {
        uint256 subId = req.subId;
        if (!s_consumers[subId][msg.sender]) revert();
        if (req.requestConfirmations < minConfirmations) revert();

        requestId = s_currentReqId;
        s_requests[requestId] = msg.sender;
        s_currentReqId = requestId + 1;
        s_requestSubs[requestId] = subId;
        emit RandomWordsRequested(
            req.keyHash,
            requestId,
            0,
            subId,
            req.requestConfirmations,
            req.callbackGasLimit,
            req.numWords,
            "",
            msg.sender
        );
    }

    /*
     * @notice Fulfill a randomness request.
     * @param proof contains the proof and randomness
     * @param rc request commitment pre-image, committed to at request time
     * @param onlyPremium only charge premium
     * @return payment amount billed to the subscription
     * @dev simulated offchain to determine if sufficient balance is present to fulfill the request
     */
    function fulfillRandomWords(uint256 reqId, uint256[] calldata words) external returns (uint96 payment) {
        payment = 100;
        uint256 subId = s_requestSubs[reqId];
        if (s_subscriptions[subId] < payment) revert();

        unchecked { s_subscriptions[subId] -= payment; }
        VRFConsumerBaseV2Plus requester = VRFConsumerBaseV2Plus(s_requests[reqId]);
        requester.rawFulfillRandomWords(reqId, words);
        emit RandomWordsFulfilled(reqId, 0, 0, payment, false, true, false);
    }

    function configRequestConfirmations(uint8 newMin) external {
        minConfirmations = newMin;
    }
}
