const { ethers, network } = require('hardhat');

async function main() {
  const networkResult = await ethers.provider.getNetwork();
  console.log(network.name);
}

main().catch(console.error);
