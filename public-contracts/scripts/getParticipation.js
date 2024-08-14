const ask = require('../utils/ask');
const {ethers, network} = require("hardhat");
const latestDeployments = require('../deployments/latest.json');

async function main() {
  const contractAddress = latestDeployments.find(d => d.network === network.name && d.name.endsWith('Manager')).address;
  const raffleId = parseInt(await ask('Raffle ID: '));

  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }

  const participant = ethers.utils.getAddress(await ask('Participant address: '));

  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(contractAddress);
  const participation = await manager.getParticipation(raffleId, participant);
  console.log(participation);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
