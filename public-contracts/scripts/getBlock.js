const { ethers } = require('hardhat');

async function main() {
  const block = await ethers.provider.getBlock('latest');

  console.log(block);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
