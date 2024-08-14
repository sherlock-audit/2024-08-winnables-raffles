const ask = require('../../utils/ask');
const {ethers} = require("hardhat");

async function main() {
  const contractAddress = ethers.utils.getAddress(await ask('Contract Address: '));
  const [_, api] = await ethers.getSigners();

  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(contractAddress);

  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid raffle ID');
  }
  const { events } = await (await manager.connect(api).drawWinner(raffleId)).wait();
  console.log(`Request sent to Chainlink. ${events.length} events`)
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
