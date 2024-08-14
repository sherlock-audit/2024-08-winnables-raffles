const ask = require('../../utils/ask');
const { network, ethers } = require('hardhat');
const latestDeployment = require("../../deployments/latest.json");
const { isAddress } = require("ethers/lib/utils");

async function main() {
  const ticketManager = latestDeployment.find(d => d.name === 'WinnablesTicketManager');

  if (ticketManager.network !== network.name) {
    throw new Error(`Unexpected network ${network.name}. Ticket Manager needs ${ticketManager.network}`);
  }

  const signers = await ethers.getSigners();

  const WinnablesTicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const winnablesTicketManager = WinnablesTicketManager.attach(ticketManager.address);

  const utilityEOA = await ask('Utility EOA address: ');
  if (!isAddress(utilityEOA)) {
    throw new Error('not a valid Ethereum address');
  }

  console.log('I am about to set an utility role on network ' + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Ticket Manager address:      ${ticketManager.address}`);
  console.log(`  - Utility EOA address:         ${utilityEOA}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  await (await winnablesTicketManager.setRole(utilityEOA, 1, true)).wait();

  console.log(`Granted Utility Role to ${utilityEOA}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
