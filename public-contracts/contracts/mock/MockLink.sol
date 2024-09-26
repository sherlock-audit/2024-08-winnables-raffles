// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@chainlink/contracts/src/v0.8/shared/token/ERC677/LinkToken.sol";

contract MockLink is LinkToken {
  constructor() {
    grantMintRole(msg.sender);
  }
}
