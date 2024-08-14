// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ITicketManager {
    function buyTickets(
        uint256 raffleId,
        uint16 ticketCount,
        uint256 blockNumber,
        bytes calldata signature
    ) external payable;
}

contract ReentrantBuyer {
    bool private _done;
    uint256 private _raffleId;
    uint16 private _ticketCount;
    uint256 private _blockNumber;
    bytes private _signature;
    address private _ticketManager;

    function doubleBuy(
        address ticketManager,
        uint256 raffleId,
        uint16 ticketCount,
        uint256 blockNumber,
        bytes calldata signature
    ) external payable {
        _ticketManager = ticketManager;
        _raffleId = raffleId;
        _ticketCount = ticketCount;
        _blockNumber = blockNumber;
        _signature = signature;
        ITicketManager(ticketManager).buyTickets{ value: msg.value / 2 }(
            raffleId,
            ticketCount,
            blockNumber,
            signature
        );
    }

    fallback() external {
        if (_done) {
            _done = false;
            _raffleId = 0;
            _ticketManager = address(0);
            return;
        }
        _done = true;
        ITicketManager(_ticketManager).buyTickets{
                value: address(this).balance
            }(
            _raffleId,
            _ticketCount,
            _blockNumber,
            _signature
        );
    }

    receive() external payable {}
}
