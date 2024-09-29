const { ethers, network } = require("hardhat");
const { routerConfig, LINK_ADDRESSES, VRF_COORDINATORS, VRF_KEYHASH } = require("../constants");
const ask = require("../../utils/ask");
const { BigNumber } = require("ethers");
const {formatBytes} = require('../../test/common/chainlink');

const linkAddress = LINK_ADDRESSES[network.name];
const coordinatorAddress = VRF_COORDINATORS[network.name];
const ccipRouter = routerConfig[network.name];
const CL_KEYHASH = VRF_KEYHASH[network.name];

const FIVE_LINK = ethers.utils.parseEther('5');

async function main() {
  if (!linkAddress || !coordinatorAddress || !CL_KEYHASH) {
    throw new Error(
      "Make sure you fill the 3 variables in the script before running"
    );
  }

  if (!ccipRouter) {
    throw new Error('Incorrect CCIP router config');
  }
  const signers = await ethers.getSigners();

  let subscriptionId = BigNumber.from((await ask('Subscription ID (leave blank to create a new one): ')) || 0);
  const linkFactory = await ethers.getContractFactory('MockLink');
  const link = linkFactory.attach(linkAddress);
  if (subscriptionId.isZero()) {
    const balance = await link.balanceOf(signers[0].address);
    if (balance.lt(FIVE_LINK)) {
      throw new Error(
        `You must have at least 5.0 LINK in your account ${signers[0].address}\n` +
        `(you have ${ethers.utils.formatEther(balance)}LINK)`
      )
    }
  }

  console.log('I am about to deploy TicketManager on network ' + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Link address:                ${linkAddress}`);
  console.log(`  - VRF Coordinator address:     ${coordinatorAddress}`);
  console.log(`  - Subscription ID:             ${
    subscriptionId.isZero() ? 'Will create a new one and fund it with 5 LINK' : subscriptionId.toString()
  }`);
  console.log(`  - VRF Key Hash:                ${CL_KEYHASH}`);
  console.log(`  - CCIP Router address:         ${ccipRouter.address}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    throw new Error('Abort.');
  }
  const Coordinator = await ethers.getContractFactory('VRFCoordinatorV2PlusMock');
  const coordinator = Coordinator.attach(coordinatorAddress);

  let createSubscription = false;
  if (subscriptionId.isZero()) {
    console.log('Creating a new subscription');
    {
      const { events } = await (await coordinator.createSubscription()).wait();
      const event = events.find(e => e.event === 'SubscriptionCreated');
      const { subId } = event.args;
      subscriptionId = subId;
      console.log('Funding subscription', subscriptionId.toString());
      createSubscription = true;
    }
    await (await link.transferAndCall(
      coordinatorAddress,
      FIVE_LINK,
      formatBytes(subscriptionId, 32),
    )).wait();
    console.log('Subscription funded');
  }

  const Ticket = await ethers.getContractFactory('WinnablesTicket');
  const ticket = await Ticket.deploy();
  await ticket.deployed();

  console.log("Tickets deployed", ticket.address);

  const Winnables = await ethers.getContractFactory('WinnablesTicketManager');
  const winnables = await Winnables.deploy(
    linkAddress,
    coordinatorAddress,
    subscriptionId,
    CL_KEYHASH,
    ticket.address,
    ccipRouter.address
  );
  await winnables.deployed();
  console.log("Winnables Ticket Manager deployed", winnables.address);

  if (createSubscription) {
    await (await coordinator.addConsumer(subscriptionId, winnables.address)).wait();
    console.log('Added consumer', winnables.address, 'to subscription', subscriptionId.toString());
  }

  console.log("Granted minter role to Winnables on the ticket contract");

  await (await winnables.setRole(signers[1].address, 1, true)).wait();
  console.log('Granted signer role to API');

  await (await coordinator.addConsumer(subscriptionId, winnables.address)).wait();
  console.log('Added contract as a consumer on VRF subscription', subscriptionId);
}

main().catch((e) => {
  console.error('Error: ', e.message);
  process.exit(1);
});
