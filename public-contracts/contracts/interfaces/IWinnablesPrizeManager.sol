// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "./IWinnables.sol";

interface IWinnablesPrizeManager is IWinnables {
    error InvalidRaffleId();
    error AlreadyClaimed();
    error NFTLocked();
    error IllegalRaffleId();

    event NFTPrizeLocked(uint256 indexed raffleId, address indexed contractAddress, uint256 indexed tokenId);
    event TokenPrizeLocked(uint256 indexed raffleId, address indexed contractAddress, uint256 indexed amount);
    event ETHPrizeLocked(uint256 indexed raffleId, uint256 indexed amount);
    event PrizeUnlocked(uint256 indexed raffleId);
    event TokenPrizeUnlocked(uint256 indexed raffleId);
    event ETHPrizeUnlocked(uint256 indexed raffleId);
    event WinnerPropagated(uint256 indexed raffleId, address indexed winner);

    enum CCIPMessageType {
        RAFFLE_CANCELED,
        WINNER_DRAWN
    }

    enum RafflePrizeStatus {
        NONE,
        CLAIMED,
        CANCELED
    }

    struct RafflePrize {
        RaffleType raffleType;
        RafflePrizeStatus status;
        address winner;
    }

    struct NFTInfo {
        address contractAddress;
        uint256 tokenId;
    }

    struct TokenInfo {
        address tokenAddress;
        uint256 amount;
    }
}
