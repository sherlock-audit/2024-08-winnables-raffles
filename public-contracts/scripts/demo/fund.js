const { ethers } = require('hardhat');
const { getWalletWithEthers } = require('../../test/common/utils');

async function main() {
  if (!process.env.ADDRESS) {
    throw new Error('Must set ADDRESS env variable');
  }
  const funder = await getWalletWithEthers();
  await funder.sendTransaction({
    to: process.env.ADDRESS,
    value: ethers.utils.parseEther('5')
  });
  console.log('Sent 5 ETH to', process.env.ADDRESS);
}

main().catch(console.error);
