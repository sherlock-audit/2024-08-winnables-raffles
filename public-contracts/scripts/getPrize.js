const ask = require('../utils/ask');
const { ethers, network } = require("hardhat");
const latestDeployments = require('../deployments/latest.json');
const { BigNumber } = require('ethers');

async function main() {
  const contractAddress = latestDeployments.find(d => d.network === network.name && d.name.endsWith('Manager')).address;
  const raffleId = parseInt(await ask('Raffle ID: '));

  if (isNaN(raffleId)) {
    throw new Error('Invalid input');
  }

  const slot = BigNumber.from(ethers.utils.solidityKeccak256(
    ['uint256', 'uint256'],
    [raffleId, 2]
  ));

  const PrizeManager = await ethers.getContractFactory('WinnablesPrizeManager');
  const manager = PrizeManager.attach(contractAddress);
  const raffleType = BigNumber.from(await ethers.provider.getStorageAt(contractAddress, slot)).toNumber();
  let prize;
  switch (raffleType) {
    case 1:
      prize = {
        type: 'NFT',
        data: await manager.getNFTRaffle(raffleId),
      };
      break;
    case 2:
      prize = {
        type: 'ETH',
        data: await manager.getETHRaffle(raffleId),
      };
      break;
    case 3:
      prize = {
        type: 'Token',
        data: await manager.getTokenRaffle(raffleId),
      };
      break;
    default:
      prize = null;
  }
  console.log(prize);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
