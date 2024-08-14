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

  const uri = await ask('Base URI: ');
  const tx = await contract.setBaseURI(uri);

  console.log(tx.hash);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
