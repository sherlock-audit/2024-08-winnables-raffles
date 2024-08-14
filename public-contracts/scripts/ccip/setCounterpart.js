const { ethers, network } = require("hardhat");
const { routerConfig } = require("../constants");
const ask = require('../../utils/ask');
const latestDeployment = require("../../deployments/latest.json");

async function main() {
  const currentDeployment = latestDeployment.find(d => d.network === network.name && d.name.endsWith('Manager'));
  const counterpartDeployment = latestDeployment.find(d => d.network !== network.name && d.name.endsWith('Manager'));
  const counterpartChain = counterpartDeployment.network;
  const config = routerConfig[counterpartChain];
  const destinationContract = latestDeployment.find(c => c.name.endsWith('Manager') && c.network === counterpartChain);
  if (!config || !config.chainSelector) {
    throw new Error(`Unknown network ${counterpartChain}`);
  }
  const selector = config.chainSelector;
  const fromAddress = currentDeployment.address;
  const toAddress = destinationContract.address;

  if (!fromAddress || !toAddress) {
    throw new Error(`Could not find deployment for ${network.name} and ${counterpartChain}`);
  }

  const signers = await ethers.getSigners();

  console.log('I am about to deploy PrizeManager on network ' + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Source contract (tx target): ${fromAddress}`);
  console.log(`  - Destination chain (tx data): ${toAddress}`);
  console.log(`  - Destination chain selector:  ${selector}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  const CCIPContract = await ethers.getContractFactory('BaseCCIPContract');
  const ccipContract = CCIPContract.attach(fromAddress);

  const tx = await ccipContract.setCCIPCounterpart(toAddress, selector, true);
  console.log(tx.hash);
  await tx.wait();
  console.log(`Added ${counterpartDeployment.name} contract as a CCIP Counterpart on ${currentDeployment.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
