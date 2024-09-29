const { ethers, network } = require('hardhat');
const latestDeployments = require('../deployments/latest.json');
const ask = require('../utils/ask');

async function main() {
  const contract = latestDeployments.find(d => d.network === network.name && d.name === 'WinnablesTicket');
  if (!contract) {
    throw new Error(`No ticket contract found on this chain: ${network.name}`)
  }
  const factory = await ethers.getContractFactory('WinnablesTicket');
  const ticket = factory.attach(contract.address);

  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }
  const supply = await ticket.supplyOf(raffleId);
  console.log(`Raffle ${raffleId} has a supply of ${supply.toNumber()} tickets`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
