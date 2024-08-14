const { attachAll } = require("../utils/demo");
const ask = require('../utils/ask');
const { ethers } = require('hardhat');

async function main() {
  const factory = await ethers.getContractFactory('Winnables');
  const address = await ask('Contract Address: ');
  const contractAddress = ethers.utils.getAddress(address);
  const winnables = factory.attach(contractAddress);

  const tx = await winnables.withdrawETH();
  console.log('Tx hash:', tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
