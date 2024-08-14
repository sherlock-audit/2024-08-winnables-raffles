require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          evmVersion: 'shanghai',
        }
      },
      { version: '0.4.24' },
      { version: '0.4.17' },
      { version: '0.6.6' },
    ],
  },
  networks: {
    ethereumSepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC ?? 'https://11155111.rpc.thirdweb.com',
      accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.UTILITY_WALLET_PRIVATE_KEY].filter(Boolean),
      chainId: 11155111
    },
    avalancheFuji: {
      url: process.env.AVALANCHE_FUJI_RPC ?? 'https://43113.rpc.thirdweb.com',
      accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.UTILITY_WALLET_PRIVATE_KEY].filter(Boolean),
      chainId: 43113,
    },
    tickets: {
      url: 'http://127.0.0.1:8546',
      accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.UTILITY_WALLET_PRIVATE_KEY].filter(Boolean),
      chainId: 43113,
    },
    prizes: {
      url: 'http://127.0.0.1:8545',
      accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.UTILITY_WALLET_PRIVATE_KEY].filter(Boolean),
      chainId: 11155111
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
};
