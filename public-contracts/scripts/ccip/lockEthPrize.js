const { routerConfig } = require("../constants");
const ask = require('../../utils/ask');
const { network, ethers } = require('hardhat');
const latestDeployment = require("../../deployments/latest.json");
const {BigNumber} = require('ethers');

async function main() {
  const prizeManager = latestDeployment.find(d => d.name === 'WinnablesPrizeManager');

  if (prizeManager.network !== network.name) {
    throw new Error(`Unexpected network ${network.name}. Prize Manager needs ${prizeManager.network}`);
  }
  const ticketManager = latestDeployment.find(d => d.name.endsWith('WinnablesTicketManager'));

  const signers = await ethers.getSigners();
  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('not a number');
  }

  const WinnablesPrizeManager = await ethers.getContractFactory('WinnablesPrizeManager');
  const winnablesPrizeManager = WinnablesPrizeManager.attach(prizeManager.address);

  const slot = BigNumber.from(ethers.utils.solidityKeccak256(
    ['uint256', 'uint256'],
    [raffleId, 2]
  ));
  const raffleType = BigNumber.from(await ethers.provider.getStorageAt(prizeManager.address, slot));
  if (raffleType.gt(0)) {
    throw new Error(`Raffle ${raffleId} already exists`);
  }

  const amount = ethers.utils.parseEther(await ask('ETH Amount: '));

  console.log('I am about to lock a prize on network ' + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Prize Manager address:       ${prizeManager.address}`);
  console.log(`  - ETH Amount:                  ${ethers.utils.formatEther(amount)}`);
  console.log(`  - Counterpart Ticket Manager:  ${ticketManager.address}`);
  console.log(`  - Counterpart chain selector:  ${routerConfig[ticketManager.network].chainSelector}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  const lockTx = await winnablesPrizeManager.lockETH(
    ticketManager.address,
    routerConfig[ticketManager.network].chainSelector,
    raffleId,
    amount,
    {
      value: amount
    }
  );
  const { events } = await lockTx.wait();
  const ccipMessageId = events[2].data.slice(834, 898);
  console.log(`Prize locked: http://ccip.chain.link/msg/0x${ccipMessageId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
