const { ethers, network } = require('hardhat');
const latestDeployments = require('../deployments/latest.json');
const ask = require('../utils/ask');

async function main() {
  const contract = latestDeployments.find(d => d.network === network.name && d.name === 'WinnablesTicketManager');
  if (!contract) {
    throw new Error(`No manager contract found on this chain: ${network.name}`)
  }

  const factory = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = factory.attach(contract.address);

  const raffleId = parseInt(await ask('Raffle ID: '));

  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }

  const winner = await manager.getWinner(raffleId);
  console.log(winner);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
