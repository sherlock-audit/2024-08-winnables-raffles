const { routerConfig } = require("../constants");
const ask = require('../../utils/ask');
const { network, ethers } = require('hardhat');
const latestDeployment = require("../../deployments/latest.json");
const {BigNumber} = require('ethers');

async function main() {
  const nftContract = latestDeployment.find(d => d.name === 'DemoNFT');
  const prizeManager = latestDeployment.find(d => d.name === 'WinnablesPrizeManager');

  if (prizeManager.network !== network.name) {
    throw new Error(`Unexpected network ${network.name}. Prize Manager needs ${prizeManager.network}`);
  }
  if (nftContract.network !== network.name) {
    throw new Error(`DemoNFT requires chain ${nftContract.network}`);
  }

  const ticketManager = latestDeployment.find(d => d.name.endsWith('WinnablesTicketManager'));

  const signers = await ethers.getSigners();
  const raffleStartId = parseInt(await ask('Starting raffle ID: '));
  if (isNaN(raffleStartId)) {
    throw new Error('not a number');
  }
  const count = parseInt(await ask('Raffles count: '));
  if (isNaN(count)) {
    throw new Error('not a number');
  }

  const WinnablesPrizeManager = await ethers.getContractFactory('WinnablesPrizeManager');
  const winnablesPrizeManager = WinnablesPrizeManager.attach(prizeManager.address);

  const DemoNFT = await ethers.getContractFactory('DemoNFT');
  const demoNFT = DemoNFT.attach(nftContract.address);

  for (let i = 0; i < count; i++) {
    const raffleId = raffleStartId + i;
    const slot = BigNumber.from(ethers.utils.solidityKeccak256(
      ['uint256', 'uint256'],
      [raffleId, 2]
    ));
    const raffleType = BigNumber.from(await ethers.provider.getStorageAt(prizeManager.address, slot));
    if (raffleType.gt(0)) {
      throw new Error(`Raffle ${raffleId} already exists`);
    }
  }

  console.log(`I am about to lock ${count} NFT prizes on network ` + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Prize Manager address:       ${prizeManager.address}`);
  console.log(`  - NFT Address:                 ${nftContract.address}`);
  console.log(`  - Counterpart Ticket Manager:  ${ticketManager.address}`);
  console.log(`  - Counterpart chain selector:  ${routerConfig[ticketManager.network].chainSelector}`);
  console.log(`  - Start Raffle ID:             ${raffleStartId}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  const links = [];

  for (let i = 0; i < count; i++) {
    const tokenId = await (async () => {
      process.stdout.write('Minting NFT...');
      const { events } = await (await demoNFT.mint(winnablesPrizeManager.address)).wait();
      console.log(' [OK]');
      return events.pop().args.tokenId;
    })();

    const lockTx = await winnablesPrizeManager.lockNFT(
      ticketManager.address,
      routerConfig[ticketManager.network].chainSelector,
      raffleStartId + i,
      nftContract.address,
      tokenId
    );
    const { events } = await lockTx.wait();
    const ccipMessageId = events[2].data.slice(834, 898);
    links.push(`http://ccip.chain.link/msg/0x${ccipMessageId}`);
  }

  console.log(links.join('\n'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
