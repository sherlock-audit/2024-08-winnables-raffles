const { BigNumber } = require('ethers');
const { randomBytes } = require('crypto');

const oneHundredLink = BigNumber.from('100000000000000000000') // 100

function formatBytes(bn, bytes) {
  return '0x' + bn.toHexString().slice(-1 * bytes * 2).padStart(bytes * 2, '0');
}

function randomWord() {
  return formatBytes(
    BigNumber.from('0x' + randomBytes(32).toString('hex')),
    32
  );
}

module.exports = {
  oneHundredLink,
  formatBytes,
  randomWord
};
