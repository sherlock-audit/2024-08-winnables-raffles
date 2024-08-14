const ask = require('../../utils/ask');
const {ethers} = require("hardhat");

async function main() {
  const contractAddress = ethers.utils.getAddress(await ask('Contract Address: '));

  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(contractAddress);

  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid raffle ID');
  }
  const winner = await manager.getWinner(raffleId);
  console.log(winner);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
