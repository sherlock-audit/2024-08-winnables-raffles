# Winnable Contracts

## Installation

- Install dependencies
```shell
$ yarn
```
- Fill Environment variables
```shell
$ cp .env.dist .env
$ # Edit your .env file and fill in the required fields
```

## Run tests

```shell
$ yarn test
```

## Deployment using the scripts

1. Make sure you have 2 networks in `hardhat.config.js`

```js
module.exports = {
  // ...
  networks: {
    ethereumSepolia: {
      // ...
    },
    avalancheFuji: {
      // ...
    },
  },
  // ...
}
```

2. Make sure you have the necessary Chainlink contract addresses configured in
`scipts/constants.js` for the network you are deploying to


3. Deploy the Prize Manager on Ethereum Sepolia:

```shell
$ npx hardhat --network ethereumSepolia scripts/ccip/deployPrize.js
```
when prompted, double-check that the contract addresses shown correspond to the
correct addresses for the network you are deploying to, then type "confirm" to
continue

After the deployment, save the Prize Manager's address in `deployments/latest.json`

4. Deploy the Ticket Manager on Avalanche Fuji

```shell
$ npx hardhat --network avalancheFuji scripts/ccip/deployTicket.js
```

If you already have a subscription with your current signer, you can type it in
at the first prompt, otherwise you can leave it blank to create a new
subscription (you need to have at least 5 LINK in the deployer's wallet)

After the deployment, save the Ticket Manager's and the Ticket's addresses in
`deployments/latest.json`

5. Register the contracts with each other as counterparts:

```shell
$ npx hardhat --network ethereumSepolia run scripts/ccip/setCounterpart.js
```

Double check all the settings and type "confirm" to continue

```shell
$ npx hardhat --network avalancheFuji run scripts/ccip/setCounterpart.js
```

Double check all the settings and type "confirm" to continue

6. Grant Role 1 to the utility wallet on the ticket contract:

```shell
$ npx hardhat --network avalancheFuji run scripts/grantRole.js
```

For the first prompt, type "1", then for the second, leave empty.



