const { ethers, network} = require('hardhat');
const latestDeployment = require('../deployments/latest.json');
const ask = require('../utils/ask');

async function main() {
  const nft = latestDeployment.find(d => d.network === network.name && d.name === 'DemoNFT');
  if (!nft) {
    throw new Error(`Could not find DemoNFT on network ${network.name}`);
  }
  const factory = await ethers.getContractFactory('DemoNFT');
  const contract = factory.attach(nft.address);

  const transferTo = ethers.utils.getAddress(await ask('To: '));
  await contract.transferOwnership(transferTo);

  console.log('Transferred ownership to', transferTo);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
