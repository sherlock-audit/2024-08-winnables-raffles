const { ethers } = require('hardhat');

async function main() {
  const factory = await ethers.getContractFactory('DemoNFT');
  const contract = await factory.deploy();
  await contract.deployed();

  console.log('Deployed to', contract.address);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
