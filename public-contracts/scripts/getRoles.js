const { ethers } = require('hardhat');
const ask = require('../utils/ask');

async function main() {
  const contractAddress = ethers.utils.getAddress(await ask('Contract Address: '));
  const address = ethers.utils.getAddress(await ask('Address: '));

  const RolesFactory = await ethers.getContractFactory('Roles');
  const rolesContract = RolesFactory.attach(contractAddress);

  const rolesByte32 = await rolesContract.getRoles(address);
  const rolesNumeric = BigInt(rolesByte32);
  const roles = [];
  for (let i = 0n; i < 256n; i++) {
    const testNum = 1n << i;
    if ((rolesNumeric & testNum) > 0) {
      roles.push(Number(i));
    }
  }
  console.log(roles);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
