const { ethers } = require('hardhat');
const { expect } = require('chai');

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

describe('Validate LINK Spender', () => {
  it('Cannot deploy if approval fails', async () => {
    const signers = await ethers.getSigners();
    const linkFactory = await ethers.getContractFactory('MockBadLink');
    const link = await linkFactory.deploy();
    const factory = await ethers.getContractFactory('WinnablesPrizeManager');
    const deployment = factory.deploy(link.address, signers[1].address);
    await expect(deployment).to.be.revertedWithCustomError(factory, 'LinkApprovalFailed');
  });
});
