const { attachAll } = require('../../utils/demo');

const raffleId = parseInt(process.env.RAFFLE_ID ?? 1);

async function main() {
  const {
    ticket,
  } = await attachAll();
  const supply = await ticket.supplyOf(raffleId);
  console.log(`Raffle ${raffleId} has a supply of ${supply.toNumber()} tickets`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
