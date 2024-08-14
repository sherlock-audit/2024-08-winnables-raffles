const ask = require('../../utils/ask');
const { attachAll } = require('../../utils/demo');
const { getWalletWithEthers } = require('../../test/common/utils');
const { ethers } = require('hardhat');

const raffleId = parseInt(process.env.RAFFLE_ID ?? 1);

async function main() {
  const {
    manager,
    ticket,
    approver,
    chainId
  } = await attachAll();

  const supply = (await ticket.supplyOf(raffleId)).toNumber();
  const raffle = await manager.getRaffle(raffleId);
  const maxSupply = raffle.maxTicketSupply;
  const maxHoldings = raffle.maxHoldings;
  const remaining = maxSupply - supply;
  let signer;
  if (chainId === 31337) {
    signer = await getWalletWithEthers();
  } else {
    const pk = await ask('Buyer private key: ');
    signer = new ethers.Wallet(pk, ethers.provider);
  }
  console.log(`Buyer's wallet address: ${signer.address}`);
  const blockNumber = (await ethers.provider.getBlockNumber() + 10);
  const balance = await ticket.balanceOf(signer.address, raffleId);
  const nonce = await manager.getNonce(signer.address);
  const amount = Math.min(remaining, maxHoldings - balance.toNumber());
  const message = ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'],
    [signer.address, nonce, raffleId, amount, blockNumber, 0]
  );
  const signature = await approver.signMessage(ethers.utils.arrayify(message));
  const { events } = await (await manager.connect(signer).buyTickets(raffleId, amount, blockNumber, signature)).wait();
  const event = ticket.interface.parseLog(events[0]);
  console.log(`Bought tickets for raffle ${event.args[0].toNumber()}. IDs ${event.args[1].toNumber()} -> ${event.args[1].toNumber() + event.args[2].toNumber()}`);
}

main().catch(console.error);
