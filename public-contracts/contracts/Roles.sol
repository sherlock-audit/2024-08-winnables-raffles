// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "./libraries/Bits.sol";

contract Roles {
    using Bits for bytes32;

    error MissingRole(address user, uint256 role);
    event RoleUpdated(address indexed user, uint256 indexed role, bool indexed status);

    /**
     * @dev There is a maximum of 256 roles: each bit says if the role is on or off
     */
    mapping(address => bytes32) private _addressRoles;

    modifier onlyRole(uint8 role) {
        _checkRole(msg.sender, role);
        _;
    }

    constructor() {
        _setRole(msg.sender, 0, true);
    }

    function _hasRole(address user, uint8 role) internal view returns(bool) {
        return _addressRoles[user].getBool(role);
    }

    function _checkRole(address user, uint8 role) internal virtual view {
        if (!_hasRole(user, role)) {
            revert MissingRole(user, role);
        }
    }

    function _setRole(address user, uint8 role, bool status) internal virtual {
        _addressRoles[user] = _addressRoles[user].setBool(role, status);
        emit RoleUpdated(user, role, status);
    }

    function setRole(address user, uint8 role, bool status) external virtual onlyRole(0) {
        _setRole(user, role, status);
    }

    function getRoles(address user) external view returns(bytes32) {
        return _addressRoles[user];
    }
}
