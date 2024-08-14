const { attachAll } = require("../utils/demo");
const ask = require('../utils/ask');

async function main() {
  const { manager } = await attachAll();

  const raffleId = parseInt(await ask('Raffle ID: '));

  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }

  const winner = await manager.getWinner(raffleId);
  console.log(winner);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
