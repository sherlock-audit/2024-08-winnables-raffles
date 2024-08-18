
# Winnables Raffles contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

# Q&A

### Q: On what chains are the smart contracts going to be deployed?
- WinnableaPrizeManager will be deployed on Ethereum
- WinnablesTicketManager and Tickets will be deployed on Avalanche
___

### Q: If you are integrating tokens, are you allowing only whitelisted tokens to work with the codebase or any complying with the standard? Are they assumed to have certain properties, e.g. be non-reentrant? Are there any types of [weird tokens](https://github.com/d-xo/weird-erc20) you want to integrate?
We are supposed to support all 100% valid ERC20 tokens + USDC and USDT.

For tokens that have a blacklist, we will ignore any issues caused by that blacklist unless they cause damage to the protocol or other users.
___

### Q: Are there any limitations on values set by admins (or other roles) in the codebase, including restrictions on array lengths?
None other than the restrictions inherent to the types used (for example: `WinnablesTicketManager::buyTickets()` take a `uint16` argument for `ticketCount`. That means the maximum number of tickets that can be purchased in a single transaction is `type(uint16).max`)
___

### Q: Are there any limitations on values set by admins (or other roles) in protocols you integrate with, including restrictions on array lengths?
No
___

### Q: For permissioned functions, please list all checks and requirements that will be made before calling the function.
Access control is handled with the `Roles`  contract. It works similar to OpenZeppelin's `AcessControl` but uses bit flags to determine if a user has a role or not. Each user has a `bytes32`  representing the bitfield of roles so there is a limit of 256 possible roles. We only use 2: 0 and 1.

Role 0 is an admin role and it allows its members to grant or deny roles to other users. That role is granted to the deployer in the constructor.

There is no mechanism to ensure there is always at least one admin. This user mistake issue shall be ignored.
___

### Q: Is the codebase expected to comply with any EIPs? Can there be/are there any deviations from the specification?
We do not need to comply to any EIP.
___

### Q: Are there any off-chain mechanisms or off-chain procedures for the protocol (keeper bots, arbitrage bots, etc.)?
Ticket purchases need to be approved by the API which grants a signature.
___

### Q: Are there any hardcoded values that you intend to change before (some) deployments?
We might change `MIN_RAFFLE_DURATION` 
___

### Q: If the codebase is to be deployed on an L2, what should be the behavior of the protocol in case of sequencer issues (if applicable)? Should Sherlock assume that the Sequencer won't misbehave, including going offline?
The code won't be deployed to an L2
___

### Q: Should potential issues, like broken assumptions about function behavior, be reported if they could pose risks in future integrations, even if they might not be an issue in the context of the scope? If yes, can you elaborate on properties/invariants that should hold?
No
___

### Q: Please discuss any design choices you made.
The principles that must always remain true are:
- Winnables admins cannot do anything to prevent a winner from withdrawing their prize
- Participants in a raffle that got cancelled can always get refunded
- Admins cannot affect the odds of a raffle

The following assumptions are to be made about the admin’s behavior without being enforced:
- Admins will not abuse signatures to get free tickets or to distribute them to addresses they control.
- Admins will always keep LINK in the contracts (to pay for CCIP Measages) and in the VRF subscription (to pay for the random numbers)
___

### Q: Please list any known issues and explicitly state the acceptable risks for each known issue.
The protocol working as expected relies on having an admin creating raffles. It should be expected that the admin will do their job. However it is not expected that the admin can steal funds that should have ended in a raffle participant’s wallet in any conceivable way.

Because we want to reserve the right to distribute free tickets to partners for marketing purposes, the admin can virtually mint out raffle tickets to addresses of their choice. The existence of max ticket supply and max holdings however guarantees a minimum level of fairness in that raffle participants can be sure that by purchasing tickets, they have a hard minimum odds of winning equal to numberOfTicketsPuchased / totalTicketSupply. Therefore, by granting free tickets, admin only reduce their own earnings potential.
___

### Q: We will report issues where the core protocol functionality is inaccessible for at least 7 days. Would you like to override this value?
This value seems reasonable 
___

### Q: Please provide links to previous audits (if any).
https://github.com/Winnables/public-contracts/blob/main/audits/2024-08-05-Peckshield-Audit-Report.pdf
___

### Q: Please list any relevant protocol resources.
- Chainlink VRF 
- Chainlink CCIP
___



# Audit scope


[public-contracts @ 9474451539b7081f5b2e246c68b90a16e7c55b31](https://github.com/Winnables/public-contracts/tree/9474451539b7081f5b2e246c68b90a16e7c55b31)
- [public-contracts/contracts/BaseCCIPContract.sol](public-contracts/contracts/BaseCCIPContract.sol)
- [public-contracts/contracts/BaseCCIPReceiver.sol](public-contracts/contracts/BaseCCIPReceiver.sol)
- [public-contracts/contracts/BaseCCIPSender.sol](public-contracts/contracts/BaseCCIPSender.sol)
- [public-contracts/contracts/BaseLinkConsumer.sol](public-contracts/contracts/BaseLinkConsumer.sol)
- [public-contracts/contracts/Roles.sol](public-contracts/contracts/Roles.sol)
- [public-contracts/contracts/WinnablesPrizeManager.sol](public-contracts/contracts/WinnablesPrizeManager.sol)
- [public-contracts/contracts/WinnablesTicket.sol](public-contracts/contracts/WinnablesTicket.sol)
- [public-contracts/contracts/WinnablesTicketManager.sol](public-contracts/contracts/WinnablesTicketManager.sol)
- [public-contracts/contracts/interfaces/IWinnables.sol](public-contracts/contracts/interfaces/IWinnables.sol)
- [public-contracts/contracts/interfaces/IWinnablesPrizeManager.sol](public-contracts/contracts/interfaces/IWinnablesPrizeManager.sol)


