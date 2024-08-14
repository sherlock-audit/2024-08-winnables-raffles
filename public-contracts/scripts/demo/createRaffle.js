const { attachAll } = require('../../utils/demo');
const { blockTime } = require('../../test/common/utils');
const ask = require('../../utils/ask');

async function main() {
  const {
    winnablesDeployer,
    manager,
    nft,
  } = await attachAll();

  const waitTime = parseInt(process.env.WAIT ?? 1);

  let maxTickets = parseInt(await ask('Max Tickets [default: 500]: '));
  if (isNaN(maxTickets) || maxTickets < 0) {
    console.log('Defaulting to Max ticket 500');
    maxTickets = 500;
  }
  let maxHoldings = parseInt(await ask('Max Holding [default: 50]: '));
  if (isNaN(maxHoldings) || maxHoldings < 0) {
    console.log('Defaulting to Max holdings 50');
    maxHoldings = 50;
  }
  let minTickets = parseInt(await ask('Min Tickets [default: 0]: '));
  if (isNaN(minTickets) || minTickets < 0) {
    console.log('Defaulting to Min ticket 0');
    minTickets = 0;
  }
  let duration = parseInt(await ask('Raffle duration in seconds [min: 60, default: 172800 (2 days)]: '));
  if (isNaN(duration) || duration < 60) {
    console.log('Defaulting to Raffle Duration: 172800');
    duration = 172800
  }
  const tokenId = await (async () => {
    process.stdout.write('Minting NFT...');
    const { events } = await (await nft.mint(manager.address)).wait();
    console.log(' [OK]');
    return events.pop().args.tokenId;
  })();

  const startDate = await blockTime();
  const endDate = startDate + duration;
  process.stdout.write('Creating raffle...');
  const { events } = await (await manager.connect(winnablesDeployer).createNFTRaffle(
    nft.address,
    tokenId,
    startDate,
    endDate,
    minTickets,
    maxTickets,
    maxHoldings,
  )).wait(waitTime);
  console.log(' [OK]');
  const event = events.find(e => e.event === 'NewRaffle');
  console.log('Created raffle', event.args.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
