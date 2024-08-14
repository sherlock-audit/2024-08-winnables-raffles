// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract ERC1155BadReceiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        return bytes4(0);
    }
}
