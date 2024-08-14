// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

abstract contract BaseLinkConsumer {
  address internal immutable LINK_TOKEN;

  constructor(address token) {
    LINK_TOKEN = token;
  }

  /// @notice Return the current router
  /// @return Current CCIP Router address
  function getLinkToken() external view returns (address) {
    return LINK_TOKEN;
  }
}
