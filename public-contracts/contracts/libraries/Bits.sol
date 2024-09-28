// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library Bits {
    /**
     * @dev get bit at offset [offset]
     */
    function getBool(bytes32 p, uint8 offset) internal pure returns (bool r) {
        assembly {
            r := and(shr(offset, p), 1)
        }
    }

    /**
     * @dev set bit [offset] to {value}
     */
    function setBool(
        bytes32 p,
        uint8 offset,
        bool value
    ) internal pure returns (bytes32 np) {
        assembly {
            np := or(
                and(
                    p,
                    xor(
                        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF,
                        shl(offset, 1)
                    )
                ),
                shl(offset, value)
            )
        }
    }
}