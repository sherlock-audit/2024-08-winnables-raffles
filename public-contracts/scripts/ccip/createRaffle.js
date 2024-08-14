const { blockTime } = require('../../test/common/utils');
const ask = require('../../utils/ask');
const { network, ethers } = require('hardhat');
const latestDeployment = require("../../deployments/latest.json");
const { formatDate } = require("../../utils/helpers");

const defaults = {
  maxTickets: 10000,
  maxHoldings: 230,
  minTickets: 1000,
  raffleDuration: 172_800,
}

function time(seconds) {
  if (seconds < 60) return `${seconds}s`
  let minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  let hours = Math.floor(minutes / 60);
  minutes = minutes % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

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
  if (raffle.status === 0) {
    throw new Error(`Prize for Raffle ${raffleId} wasn't locked yet`);
  }
  if (raffle.status !== 1) {
    throw new Error(`Raffle ${raffleId} already created`);
  }
  let maxTickets = parseInt(await ask(`Max Tickets [default: ${defaults.maxTickets}]: `));
  if (isNaN(maxTickets) || maxTickets < 0) {
    console.log(`Defaulting to Max ticket ${defaults.maxTickets}`);
    maxTickets = defaults.maxTickets;
  }
  let maxHoldings = parseInt(await ask(`Max Holding [default: ${defaults.maxHoldings}]: `));
  if (isNaN(maxHoldings) || maxHoldings < 0) {
    console.log(`Defaulting to Max holdings ${defaults.maxHoldings}`);
    maxHoldings = defaults.maxHoldings;
  }
  let minTickets = parseInt(await ask(`Min Tickets [default: ${defaults.minTickets}]: `));
  if (isNaN(minTickets) || minTickets < 0) {
    console.log(`Defaulting to Min ticket ${defaults.minTickets}`);
    minTickets = defaults.minTickets;
  }
  let duration = parseInt(await ask(
    `Raffle duration in seconds [min: 60, default: ${defaults.raffleDuration} (${time(defaults.raffleDuration)})]:`
  ));
  if (isNaN(duration) || duration < 60) {
    console.log(`Defaulting to Raffle Duration: ${defaults.raffleDuration}`);
    duration = defaults.raffleDuration;
  }

  const startDate = await blockTime();
  const endDate = startDate + duration;
  const signers = await ethers.getSigners();

  console.log('I am about to create a raffle on network ' + network.name);
  console.log(`  - Deployer:                    ${signers[0].address}`);
  console.log(`  - Ticket Manager address:      ${ticketManager.address}`);
  console.log(`  - Raffle ID:                   ${raffleId}`);
  console.log(`  - Max Tickets:                 ${maxTickets}`);
  console.log(`  - Max Holdings:                ${maxHoldings}`);
  console.log(`  - Min Tickets:                 ${minTickets}`);
  console.log(`  - Starts At:                   ${formatDate(startDate)}`);
  console.log(`  - Ends At:                     ${formatDate(endDate)}`);
  const confirmation = await ask('Type "confirm" to continue: ');
  if (confirmation !== 'confirm') {
    console.log('Abort.');
    return;
  }

  process.stdout.write('Creating raffle...');
  const { events } = await (await winnablesTicketManager.createRaffle(
    raffleId,
    startDate,
    endDate,
    minTickets,
    maxTickets,
    maxHoldings,
  )).wait();
  console.log(' [OK]');
  const event = events.find(e => e.event === 'NewRaffle');
  console.log('Created raffle', event.args.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
