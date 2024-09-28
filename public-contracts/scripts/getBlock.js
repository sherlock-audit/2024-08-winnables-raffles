const { ethers, network } = require('hardhat');

async function main() {
  const block = await ethers.provider.getBlock('latest');

  console.log(network.name, block);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
