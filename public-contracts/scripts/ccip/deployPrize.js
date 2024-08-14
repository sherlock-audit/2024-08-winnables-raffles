const { ethers, network } = require("hardhat");
const { routerConfig, LINK_ADDRESSES } = require("../constants");
const ask = require("../../utils/ask");

const linkAddress = LINK_ADDRESSES[network.name];

const ccipRouter = routerConfig[network.name];

async function main() {
  if (!linkAddress || !ccipRouter) {
    throw new Error(
      "Missing Link address and/or CCIP Router config"
    );
  }

  const signers = await ethers.getSigners();
  console.log('I am about to deploy PrizeManager on network ' + network.name);
  console.log(`  - Deployer:                ${signers[0].address}`);
  console.log(`  - Link address:            ${linkAddress}`);
  console.log(`  - CCIP Router address:     ${ccipRouter.address}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  const winnablesDeployer = signers[0];

  const WinnablesPrizeManager = await ethers.getContractFactory('WinnablesPrizeManager', winnablesDeployer);
  const winnablesPrizeManager = await WinnablesPrizeManager.deploy(
    linkAddress,
    ccipRouter.address
  );
  await winnablesPrizeManager.deployed();

  console.log("Winnables Prize Manager deployed", winnablesPrizeManager.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
