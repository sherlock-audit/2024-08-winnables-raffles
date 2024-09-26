const { ethers, network } = require("hardhat");
const latestDeployments = require('../deployments/latest.json');

async function main() {
  const contract = latestDeployments.find(
    d => d.network === network.name && d.name === 'WinnablesTicketManager'
  ).address;
  if (!contract) {
    throw new Error(`No ticket contract found on this chain: ${network.name}`)
  }
  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(contract.address);

  const subId = await manager.SUBSCRIPTION_ID();

  console.log({ subId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
