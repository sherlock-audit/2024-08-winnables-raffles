const { ethers } = require('hardhat');
const { expect } = require('chai');

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

describe('Roles', () => {
  const noRoles = ethers.constants.HashZero;
  const roleOne = '0x' + '2'.padStart(64, '0');

  let contract;
  let signers;
  let link;

  before(async () => {
    signers = await ethers.getSigners();
    const linkFactory = await ethers.getContractFactory('MockLink');
    link = await linkFactory.deploy();
    const factory = await ethers.getContractFactory('WinnablesPrizeManager');
    contract = await factory.deploy(link.address, signers[1].address);
  });

  it('Deployer has role 0', async () => {
    const expected = '0x' + '1'.padStart(64, '0');
    expect(await contract.getRoles(signers[0].address)).to.eq(expected);
  });

  it('Admin can grant roles', async () => {
    expect(await contract.getRoles(signers[1].address)).to.eq(noRoles);
    await (await contract.setRole(signers[1].address, 1, true)).wait();
    expect(await contract.getRoles(signers[1].address)).to.eq(roleOne);
  });

  it('Admin can remove roles', async () => {
    expect(await contract.getRoles(signers[1].address)).to.eq(roleOne);
    await (await contract.setRole(signers[1].address, 1, false)).wait();
    expect(await contract.getRoles(signers[1].address)).to.eq(noRoles);
  });
});
