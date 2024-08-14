const { ethers, network } = require("hardhat");
const { routerConfig, LINK_ADDRESSES, VRF_COORDINATORS, VRF_KEYHASH } = require("./constants");

// FYI, currently set with Sepolia values

// address of the link ERC20 token on the network you want to deploy to
const linkAddress = LINK_ADDRESSES[network.name];

// address of the VRFCoordinator on the network you want to deploy to
const coordinatorAddress = VRF_COORDINATORS[network.name];

// you need to create a subscription from the VRFCoordinator and fund it with some LINK
const subscriptionId = 8403;

const ccipRouter = routerConfig[network.name];
const CL_KEYHASH = VRF_KEYHASH[network.name];

async function main() {
  if (!linkAddress || !coordinatorAddress || !subscriptionId || !CL_KEYHASH) {
    throw new Error(
      "Make sure you fill the 3 variables in the script before running"
    );
  }

  if (!ccipRouter) {
    throw new Error('Incorrect CCIP router config');
  }

  const signers = await ethers.getSigners();
  const winnablesDeployer = signers[0];

  const Coordinator = await ethers.getContractFactory('VRFCoordinatorV2BetterMock');
  const coordinator = Coordinator.attach(coordinatorAddress);

  console.log('winnablesDeployer', winnablesDeployer.address, network.config.chainId, network.config.url);

  const Ticket = await ethers.getContractFactory('WinnablesTicket', winnablesDeployer);
  const ticket = await Ticket.deploy();
  await ticket.deployed();

  const ticketAddress = ticket.address;
  console.log("Tickets deployed", ticketAddress);

  const Winnables = await ethers.getContractFactory('Winnables', winnablesDeployer);
  const winnables = await Winnables.deploy(
      linkAddress,
      coordinatorAddress,
      subscriptionId,
      CL_KEYHASH,
      ticketAddress,
      ccipRouter.address
  );
  await winnables.deployed();

  const winnableManagerAddress = winnables.address;
  console.log("Winnables deployed", winnableManagerAddress);

  await (await ticket.setRole(winnableManagerAddress, 1, true)).wait();
  console.log("Granted minter role to Winnables on the ticket contract");

  await (await coordinator.addConsumer(subscriptionId, winnableManagerAddress)).wait();
  console.log('Added contract as a consumer on VRF subscription', subscriptionId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
