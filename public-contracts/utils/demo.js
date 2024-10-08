const env = process.env.NODE_ENV ?? 'local';
require(`dotenv`).config({ path: `.env.${env}` });

const { ethers, network } = require('hardhat');
const { pointOneLink, oneGwei, oneHundredLink, formatBytes } = require('../test/common/chainlink');

async function deployAll() {

  const signers = await ethers.getSigners();
  let link;
  let coordinator;
  let winnablesDeployer;
  let approver;
  let subscriptionId;
  const linkFactory = await ethers.getContractFactory('LinkToken');
  const coordinatorFactory = await ethers.getContractFactory('VRFCoordinatorV2BetterMock')
  const chainlinkAdmin = signers[0];
  link = await linkFactory.connect(chainlinkAdmin).deploy();

  coordinator = await coordinatorFactory.connect(chainlinkAdmin).deploy(
    link.address,
    pointOneLink,
    oneGwei
  );
  await coordinator.deployed();
  winnablesDeployer = signers[1];
  approver = signers[2];
  const { events } = await (await coordinator.connect(winnablesDeployer).createSubscription()).wait();
  subscriptionId = events[0].args.subId;
  await (await link.transferAndCall(coordinator.address, oneHundredLink, formatBytes(subscriptionId, 32))).wait();


  const TicketFactory = await ethers.getContractFactory(
    'WinnablesTicket',
    winnablesDeployer
  );
  const ticket = await TicketFactory.deploy();
  await ticket.deployed();

  const WinnablesManagerFactory = await ethers.getContractFactory(
    'Winnables',
    winnablesDeployer
  );
  const manager = await WinnablesManagerFactory.deploy(
    link.address,
    coordinator.address,
    subscriptionId,
    ethers.constants.HashZero,
    ticket.address
  );
  await manager.deployed();

  await (await manager.setRole(winnablesDeployer.address, 1, true)).wait();

  const RollStarFactory = await ethers.getContractFactory(
    'RollStar',
    winnablesDeployer
  );
  const rollstar = await RollStarFactory.deploy(
    link.address,
    coordinator.address,
    subscriptionId,
    '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15'
  );
  await rollstar.deployed();

  await (await manager.setRole(approver.address, 1, true)).wait();
  await (await ticket.setRole(manager.address, 1, true)).wait();

  await (await coordinator.connect(winnablesDeployer).addConsumer(subscriptionId, manager.address)).wait();
  await (await coordinator.connect(winnablesDeployer).addConsumer(subscriptionId, rollstar.address)).wait();


  const NFTFactory = await ethers.getContractFactory('DemoNFT');
  const nft = await NFTFactory.deploy();
  await nft.deployed();

  const TokenFactory = await ethers.getContractFactory('DemoToken');
  const token = await TokenFactory.deploy();
  await token.deployed();

  return {
    signers,
    winnablesDeployer,
    approver,
    link,
    coordinator,
    subscriptionId,
    ticket,
    manager,
    rollstar,
    nft,
    token
  };
}

async function ccipDeployTicketManager(deployer, approver, verbose = false) {
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
  const coordinatorFactory = await ethers.getContractFactory('VRFCoordinatorV2BetterMock', deployer)
  const ccipRouterFactory  = await ethers.getContractFactory('CCIPRouter', deployer);
  const link = await linkFactory.deploy();
  await link.deployed();

  const coordinator = await coordinatorFactory.deploy(
    link.address,
    pointOneLink,
    oneGwei
  );
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

  await (await ticket.setRole(ticketManager.address, 1, true)).wait();

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

async function ccipDeployPrizeManager(deployer, verbose = true) {
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

async function attachAll() {
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`- Using env file .env.${env}`);
  console.log(`- Using network ${chainId}`);
  if (
    !process.env.LINK_ADDRESS ||
    !process.env.VRF_COORDINATOR ||
    !process.env.TICKET_CONTRACT ||
    !process.env.WINNABLES_CONTRACT ||
    !process.env.MOCK_NFT_CONTRACT
  ) {
    throw new Error(
      "The following environment variables are all required:\n" +
      [
        'LINK_ADDRESS',
        'VRF_COORDINATOR',
        'TICKET_CONTRACT',
        'WINNABLES_CONTRACT',
        'MOCK_NFT_CONTRACT'
      ]
    );
  }
  const signers = await ethers.getSigners();
  let winnablesDeployer;
  let approver;
  if (chainId === 31337) {
    winnablesDeployer = signers[1];
    approver = signers[2];
  } else {
    winnablesDeployer = signers[0];
    approver = new ethers.Wallet(process.env.UTILITY_WALLET_PRIVATE_KEY, ethers.provider);
  }
  const linkFactory = await ethers.getContractFactory('LinkToken');
  const link = linkFactory.attach(process.env.LINK_ADDRESS);

  const coordinatorFactory = await ethers.getContractFactory(
    'VRFCoordinatorV2BetterMock',
  )
  const coordinator = coordinatorFactory.attach(process.env.VRF_COORDINATOR);
  const TicketFactory = await ethers.getContractFactory(
    'WinnablesTicket'
  );
  const ticket = TicketFactory.attach(process.env.TICKET_CONTRACT);

  const WinnablesManagerFactory = await ethers.getContractFactory(
    'Winnables',
  );
  const manager = WinnablesManagerFactory.attach(
    process.env.WINNABLES_CONTRACT
  );

  const NFTFactory = await ethers.getContractFactory('DemoNFT');
  const nft = NFTFactory.attach(process.env.MOCK_NFT_CONTRACT);

  const TokenFactory = await ethers.getContractFactory('DemoToken');
  const token = TokenFactory.attach(process.env.MOCK_TOKEN_CONTRACT);

  return {
    signers,
    winnablesDeployer,
    approver,
    link,
    coordinator,
    ticket,
    manager,
    nft,
    token,
    chainId
  };
}

module.exports = {
  deployAll,
  ccipDeployPrizeManager,
  ccipDeployTicketManager,
  attachAll
}
