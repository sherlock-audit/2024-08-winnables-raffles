const { attachAll } = require('../../utils/demo');
const ask = require('../../utils/ask');

async function main() {
  const {
    manager,
  } = await attachAll();
  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid raffle ID');
  }
  const { events } = await (await manager.drawWinner(raffleId)).wait();
  console.log(`Request sent to Chainlink. ${events.length} events`)
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
