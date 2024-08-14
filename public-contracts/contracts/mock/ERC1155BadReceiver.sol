// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract ERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        return 0xf23a6e61;
    }
}
