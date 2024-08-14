const { attachAll } = require('../utils/demo');
const ask = require('../utils/ask');

async function main() {
  const {
    ticket,
  } = await attachAll();
  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }
  const supply = await ticket.supplyOf(raffleId);
  console.log(`Raffle ${raffleId} has a supply of ${supply.toNumber()} tickets`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
