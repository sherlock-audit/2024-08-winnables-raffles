const { network } = require('hardhat');

async function main() {
  await network.provider.send('evm_setAutomine', [true]);
  await network.provider.send("evm_setIntervalMining", [500]);
}

main().catch(console.error);
