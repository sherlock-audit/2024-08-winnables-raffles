const { ethers, network} = require('hardhat');
const latestDeployments = require('../deployments/latest.json');

async function main() {
  const contractAddress = latestDeployments.find(
    d => d.network === network.name && d.name === 'WinnablesTicketManager'
  ).address;
  const factory = await ethers.getContractFactory('WinnablesTicketManager');
  const manager = factory.attach(contractAddress);

  const tx = await manager.withdrawETH();
  console.log('Tx hash:', tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
