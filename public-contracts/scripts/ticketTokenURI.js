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

  const tokenId = parseInt(await ask('Token ID: '));
  const uri = await contract.uri(tokenId);

  console.log(uri);
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
