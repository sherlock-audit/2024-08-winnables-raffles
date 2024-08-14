const { BigNumber } = require('ethers');
const { randomBytes } = require('crypto');

const pointOneLink = BigNumber.from('100000000000000000') // 0.1
const oneHundredLink = BigNumber.from('100000000000000000000') // 100
const oneGwei = BigNumber.from('1000000000');

function formatBytes(bn, bytes) {
  const raw = bn.toHexString()
    .replace(/^0x/, '');
  const rawLength = raw.length / 2;
  if (rawLength > bytes) {
    throw new Error('Cannot truncate bytes');
  }
  return `0x${'0'.repeat((bytes - rawLength) * 2)}${raw}`;
}

function randomWord() {
  return formatBytes(
    BigNumber.from('0x' + randomBytes(32).toString('hex')),
    32
  );
}

module.exports = {
  pointOneLink,
  oneGwei,
  oneHundredLink,
  formatBytes,
  randomWord
};
