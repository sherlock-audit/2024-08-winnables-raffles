// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@chainlink/contracts/src/v0.8/shared/token/ERC677/LinkToken.sol";
import "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";

contract MockBadLink is LinkToken {
    function approve(address _spender, uint256 _value) public override(IERC20, ERC20) returns (bool) {
        return false;
    }
}
