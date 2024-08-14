const { attachAll } = require('../../utils/demo');
const { ethers } = require('hardhat');

const raffleId = parseInt(process.env.RAFFLE_ID ?? 1);

async function main() {
  const {
    manager,
    approver,
    signers,
  } = await attachAll();
  console.log(`Claiming prize for the winner of raffle ${raffleId}`);
  const winner = await manager.getWinner(raffleId);
  const message = ethers.utils.solidityKeccak256(
    ['uint256', 'address'],
    [1, winner]
  );
  const signature = await approver.signMessage(ethers.utils.arrayify(message));
  try {
    const tx = await manager.connect(signers[0]).claimSinglePrize(raffleId, signature);
    console.log('Tx hash', tx.hash);
    const { events } = await tx.wait();
    console.log(events);
  } catch(e) {
    console.log('Failed with error', e.error.reason);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
