const ask = require('../../utils/ask');
const { attachAll } = require('../../utils/demo');
const { getWalletWithEthers } = require('../../test/common/utils');
const { ethers } = require('hardhat');

async function main() {
  const {
    manager,
    ticket,
    approver,
    chainId,
  } = await attachAll();

  const raffleId = parseInt(await ask('Raffle ID: '));
  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }
  const ticketCount = parseInt(await ask('Number of tickets: '));
  if (isNaN(ticketCount)) {
    throw new Error('Invalid input');
  }
  const blockNumber = (await ethers.provider.getBlockNumber()) + 10;
  let signer;
  if (chainId === 31337) {
    signer = await getWalletWithEthers();
    console.log(`Buyer's wallet:\n  - Private key: ${signer.privateKey}\n  - Address: ${signer.address}`);
  } else {
    const pk = await ask('Buyer private key: ');
    signer = new ethers.Wallet(pk, ethers.provider);
  }
  const nonce = await manager.connect(approver).getNonce(signer.address);
  const message = ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'],
    [signer.address, nonce, raffleId, ticketCount, blockNumber, 1]
  );
  const signature = await approver.signMessage(ethers.utils.arrayify(message));
  const { events } = await (await manager.connect(signer).buyTickets(raffleId, ticketCount, blockNumber, signature, { value: 1 })).wait();
  const event = ticket.interface.parseLog(events[0]);
  console.log(`Bought tickets for raffle ${event.args[0]}. IDs ${event.args[1]} -> ${event.args[1].toNumber() + event.args[2].toNumber()}`);
}

main().catch(console.error);
