const ask = require('../../utils/ask');
const {ethers, network} = require("hardhat");
const latestDeployment = require("../../deployments/local.json");
const { routerConfig } = require('../constants');

async function main() {
  const ticketManager = latestDeployment.find(d => d.name === 'WinnablesTicketManager');
  if (ticketManager.network !== network.name) {
    throw new Error(`Wrong network selected. Network: ${network.name}, expecting ${ticketManager.network}`);
  }

  const prizeManager = latestDeployment.find(d => d.name === 'WinnablesPrizeManager');
  const prizeChainSelector = routerConfig[prizeManager.network].chainSelector;
  const [_, api] = await ethers.getSigners();

  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(ticketManager.address);

  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid raffle ID');
  }
  const tx = await manager.connect(api).propagateRaffleWinner(prizeManager.address, prizeChainSelector, raffleId);
  await tx.wait();
  console.log(`Request sent to Chainlink. Tx: ${tx.hash}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
