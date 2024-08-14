const { ethers, network} = require('hardhat');
const latestDeployment = require('../deployments/latest.json');
const ask = require('../utils/ask');

async function main() {
  const nft = latestDeployment.find(d => d.network === network.name && d.name === 'WinnablesTicket');
  if (!nft) {
    throw new Error(`Could not find WinnablesTicket on network ${network.name}`);
  }
  const factory = await ethers.getContractFactory('WinnablesTicket');
  const contract = factory.attach(nft.address);

  const uri = await ask('Base URI: ');
  const tx = await contract.setURI(uri);

  console.log(tx.hash);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
