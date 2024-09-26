const env = process.env.NODE_ENV ?? 'local';
require(`dotenv`).config({ path: `.env.${env}` });

const { ethers, network } = require('hardhat');
const { oneHundredLink, formatBytes } = require('../test/common/chainlink');

async function ccipDeployTicketManager(deployer = undefined, approver = undefined, verbose = false) {
  const signers = await ethers.getSigners();
  if (!deployer) {
    deployer = signers[0];
  }
  if (!approver) {
    approver = signers[1];
  }
  const { chainId } = await deployer.provider.getNetwork();
  if (verbose) {
    console.log(`- Using env file .env.${env}`);
    console.log(`- Using network ${chainId}`);
  }
  const linkFactory = await ethers.getContractFactory('MockLink', deployer);
  const coordinatorFactory = await ethers.getContractFactory('VRFCoordinatorV2_5BetterMock', deployer)
  const ccipRouterFactory  = await ethers.getContractFactory('CCIPRouter', deployer);
  const link = await linkFactory.deploy();
  await link.deployed();
  await link.mint(deployer.address, oneHundredLink.mul(10));

  const coordinator = await coordinatorFactory.deploy(link.address);
  await coordinator.deployed();

  const ccipRouter = await ccipRouterFactory.deploy(link.address);
  await ccipRouter.deployed();

  const { events } = await (await coordinator.connect(deployer).createSubscription()).wait();
  const subscriptionId = events[0].args.subId;
  await (await link.transferAndCall(coordinator.address, oneHundredLink, formatBytes(subscriptionId, 32))).wait();

  const TicketFactory = await ethers.getContractFactory(
    'WinnablesTicket',
    deployer,
  );
  const ticket = await TicketFactory.deploy();
  await ticket.deployed();

  const WinnablesTicketManagerFactory = await ethers.getContractFactory(
    'WinnablesTicketManager',
    deployer,
  );
  const ticketManager = await WinnablesTicketManagerFactory.deploy(
    link.address,
    coordinator.address,
    subscriptionId,
    ethers.constants.HashZero,
    ticket.address,
    ccipRouter.address
  );
  await ticketManager.deployed();

  await (await ticketManager.setRole(deployer.address, 1, true)).wait();
  await (await ticketManager.setRole(approver.address, 1, true)).wait();

  await (await coordinator.connect(deployer).addConsumer(subscriptionId, ticketManager.address)).wait();

  return {
    deployer,
    approver,
    link,
    coordinator,
    subscriptionId,
    ticket,
    ticketManager,
    ccipRouter,
  };
}

async function ccipDeployPrizeManager(deployer = undefined, verbose = true) {
  if (!deployer) {
    [deployer] = await ethers.getSigners();
  }
  const { chainId } = await deployer.provider.getNetwork();
  if (verbose) {
    console.log(`- Using env file .env.${env}`);
    console.log(`- Using network ${chainId}`);
  }
  const linkFactory = await ethers.getContractFactory('MockLink', deployer);
  const ccipRouterFactory  = await ethers.getContractFactory('CCIPRouter', deployer);
  const link = await linkFactory.deploy();
  await link.deployed();

  const ccipRouter = await ccipRouterFactory.deploy(link.address);
  await ccipRouter.deployed();

  const WinnablesPrizeManagerFactory = await ethers.getContractFactory(
    'WinnablesPrizeManager',
    deployer
  );
  const prizeManager = await WinnablesPrizeManagerFactory.deploy(
    link.address,
    ccipRouter.address,
  );
  await prizeManager.deployed();

  const NFTFactory = await ethers.getContractFactory('DemoNFT', deployer);
  const nft = await NFTFactory.deploy();
  await nft.deployed();

  const TokenFactory = await ethers.getContractFactory('DemoToken', deployer);
  const token = await TokenFactory.deploy();
  await token.deployed();

  return {
    link,
    ccipRouter,
    prizeManager,
    nft,
    token
  };
}

module.exports = {
  ccipDeployPrizeManager,
  ccipDeployTicketManager,
}
