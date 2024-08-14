const { blockTime } = require('../../test/common/utils');
const ask = require('../../utils/ask');
const { network, ethers } = require('hardhat');
const latestDeployment = require("../../deployments/latest.json");
const { formatDate } = require("../../utils/helpers");

async function main() {
  const ticketManager = latestDeployment.find(d =>
    d.network === network.name && d.name === 'WinnablesTicketManager'
  );

  if (!ticketManager) {
    throw new Error('Could not find a ticket manager in latest deployments');
  }

  const WinnablesTicketManager = await ethers.getContractFactory('WinnablesTicketManager');
  const winnablesTicketManager = WinnablesTicketManager.attach(ticketManager.address);

  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('not a number');
  }
  const raffle = await winnablesTicketManager.getRaffle(raffleId);
  if (raffle.status !== 7) {
    throw new Error(`Raffle ${raffleId} is not canceled`);
  }
  const signers = await ethers.getSigners();
  const player = ethers.utils.getAddress(await ask('Refund address: '));

  console.log(`I am about to refund ${player} for raffle ${raffleId} on network ` + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Ticket Manager address:      ${ticketManager.address}`);
  console.log(`  - Raffle ID:                   ${raffleId}`);
  console.log(`  - Player to refund:            ${player}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  process.stdout.write('Refunding...');
  const { events } = await (await winnablesTicketManager.refundPlayers(
    raffleId,
    [player]
  )).wait();
  console.log(' [OK]');
  const event = events.find(e => e.event === 'PlayerRefund');
  console.log('Refund done', event);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
