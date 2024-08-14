const ask = require('../../utils/ask');
const {ethers, network} = require("hardhat");
const {BigNumber} = require("ethers");
const latestDeployments = require('../../deployments/latest.json');

async function main() {
  const deployment = latestDeployments.find(d => d.name === 'WinnablesPrizeManager');
  if (deployment.network !== network.name) {
    throw new Error(`Wrong network selected ${network.name}, expecting ${deployment.network}`);
  }
  const contractAddress = deployment.address;
  const raffleId = parseInt(await ask('Raffle ID: '));

  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }
  const factory = await ethers.getContractFactory('WinnablesPrizeManager');
  const contract = factory.attach(contractAddress);

  const winner = await contract.getWinner(raffleId);

  console.log(winner);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
