const { ethers, network } = require("hardhat");
const latestDeployments = require('../deployments/latest.json');

async function main() {
  const contractAddress = latestDeployments.find(d => d.network === network.name && d.name.endsWith('Manager')).address;
  const TicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = TicketManager.attach(contractAddress);

  const subId = await manager.SUBSCRIPTION_ID();

  console.log({ subId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
