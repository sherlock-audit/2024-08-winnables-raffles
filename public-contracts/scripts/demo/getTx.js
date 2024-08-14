const { attachAll } = require('../../utils/demo');
const { ethers } = require('hardhat');
const txHash = '0xcabcbab2d5feffa3c3c78ce2ce12119bf910d201a7d58ca26fd065f8f0a1dbd4';

async function main() {
  const {
    manager,
  } = await attachAll();
  const tx = await ethers.provider.getTransaction(txHash);
  const { logs } = await tx.wait();
  for (const log of logs) {
    try {
      console.log(manager.interface.parseLog(log));
    } catch {
      console.log(log.topics);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
