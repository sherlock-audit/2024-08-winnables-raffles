// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

import "./BaseCCIPContract.sol";
import "./BaseLinkConsumer.sol";

abstract contract BaseCCIPSender is BaseCCIPContract, BaseLinkConsumer {
    error MissingCCIPParams();
    error InsufficientLinkBalance(uint256 balance, uint256 required);

    function _sendCCIPMessage(
        address ccipDestAddress,
        uint64 ccipDestChainSelector,
        bytes memory data
    ) internal returns(bytes32 messageId) {
        if (ccipDestAddress == address(0) || ccipDestChainSelector == uint64(0)) {
            revert MissingCCIPParams();
        }

        // Send CCIP message to the desitnation contract
        IRouterClient router = IRouterClient(CCIP_ROUTER);
        LinkTokenInterface linkToken = LinkTokenInterface(LINK_TOKEN);

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(ccipDestAddress),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: LINK_TOKEN
        });

        uint256 fee = router.getFee(
            ccipDestChainSelector,
            message
        );
        uint256 currentLinkBalance = linkToken.balanceOf(address(this));

        if (fee > currentLinkBalance) {
            revert InsufficientLinkBalance(currentLinkBalance, fee);
        }

        messageId = router.ccipSend(
            ccipDestChainSelector,
            message
        );
    }
}
