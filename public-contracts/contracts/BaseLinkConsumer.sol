// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

abstract contract BaseLinkConsumer {
  address internal immutable LINK_TOKEN;

  error LinkApprovalFailed();

  constructor(address token, address approvedSpender) {
    bool approved = LinkTokenInterface(token).approve(approvedSpender, type(uint256).max);
    if (!approved) {
      revert LinkApprovalFailed();
    }
    LINK_TOKEN = token;
  }

  /// @notice Return the LINK Token address
  /// @return Address of the LINK token
  function getLinkToken() external view returns (address) {
    return LINK_TOKEN;
  }
}
