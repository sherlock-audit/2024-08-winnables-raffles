const { ethers } = require('hardhat');
const { randomBytes } = require('crypto');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

async function blockTime() {
  const block = await ethers.provider.getBlock('latest');
  return block.timestamp;
}

const timeSeconds = {
  hour: 60 * 60,
  day: 24 * 60 * 60
};

async function getWalletWithEthers() {
  const pk = randomBytes(32).toString('hex');
  const wallet = new ethers.Wallet(pk, ethers.provider);
  await helpers.setBalance(wallet.address, 100n ** 18n);
  return wallet;
}

function computePrice(raffle, qty) {
  let i = raffle.priceStructure.counts.length;
  let price = 0;
  while (i > 0) {
    const num = Math.floor(qty / raffle.priceStructure.counts[i - 1]);
    price += num * raffle.priceStructure.prices[i - 1];
    qty = qty % raffle.priceStructure.counts[i - 1];
    i--;
  }
  return price;
}

function getTicketOwnerships(raffle) {
  let i = 0;
  const ticketOwners = [];
  for (const participant of raffle.participants) {
    for (let j = 0; j < participant.tickets; j++) {
      ticketOwners.push({
        owner: participant.signer.address,
        number: i
      });
      i++;
    }
  }
  return ticketOwners;
}

/**
 * Returns random integer between start and end numbers
 * @param {number} start 
 * @param {number} end 
 * @returns random integer
 */
function randomInteger(start, end) {
  // Ensure that start and end are integers
  start = Math.ceil(start);
  end = Math.floor(end);

  // Generate a random integer between start and end (inclusive)
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

module.exports = {
  blockTime,
  timeSeconds,
  getWalletWithEthers,
}
