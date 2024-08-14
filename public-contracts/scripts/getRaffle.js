const ask = require('../utils/ask');
const {ethers, network} = require("hardhat");
const latestDeployments = require('../deployments/latest.json');

async function main() {
  const contractAddress = latestDeployments.find(d => d.network === network.name && d.name.endsWith('Manager')).address;
  const raffleId = parseInt(await ask('Raffle ID: '));

  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }

  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(contractAddress);
  const raffle = await manager.getRaffle(raffleId);
  console.log(raffle);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
