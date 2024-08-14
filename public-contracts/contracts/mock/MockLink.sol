// SPDX-License-Identifier: MIT
pragma solidity ^0.4.24;

import "@chainlink/contracts/src/v0.4/LinkToken.sol";

contract MockLink is LinkToken {
  function mint(address to, uint256 amount) external {
    balances[to] += amount;
  }
}
