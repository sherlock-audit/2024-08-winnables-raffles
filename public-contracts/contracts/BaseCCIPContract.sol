// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;


contract BaseCCIPContract {
    error InvalidRouter(address router);
    error UnauthorizedCCIPSender();

    address internal immutable CCIP_ROUTER;

    /// @dev Linked CCIP contracts
    /// The mapping key is a packed bytes32 with the following bit mapping
    /// [0..159]    address sourceContract
    /// [160..223]  uint64  sourceChainSelector
    mapping(bytes32 => bool) internal _ccipContracts;

    constructor(address router) {
        CCIP_ROUTER = router;
    }

    /// @notice Return the current router
    /// @return Current CCIP Router address
    function getCCIPRouter() external view returns (address) {
        return CCIP_ROUTER;
    }

    /// @notice Manage approved counterpart CCIP contracts
    /// @param contractAddress Address of counterpart contract on the remote chain
    /// @param chainSelector CCIP Chain selector of the remote chain
    /// @param enabled Boolean representing whether this counterpart should be allowed or denied
    function _setCCIPCounterpart(
        address contractAddress,
        uint64 chainSelector,
        bool enabled
    ) internal {
        bytes32 counterpart = _packCCIPContract(contractAddress, chainSelector);
        _ccipContracts[counterpart] = enabled;
    }

    function _packCCIPContract(address contractAddress, uint64 chainSelector) internal pure returns(bytes32) {
        return bytes32(
            uint256(uint160(contractAddress)) |
            uint256(chainSelector) << 160
        );
    }
}
