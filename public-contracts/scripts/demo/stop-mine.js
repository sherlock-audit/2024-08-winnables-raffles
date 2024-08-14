const { network } = require('hardhat');

async function main() {
  await network.provider.send('evm_setAutomine', [false]);
}

main().catch(console.error);
