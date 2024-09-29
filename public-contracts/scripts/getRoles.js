const { ethers, network } = require('hardhat');
const latestDeployments = require('../deployments/latest.json');
const ask = require('../utils/ask');

async function main() {
  const contract = latestDeployments.find(
    d => d.network === network.name && d.name.endsWith('Manager')
  ).address;
  if (!contract) {
    throw new Error(`No ticket contract found on this chain: ${network.name}`)
  }
  const address = ethers.utils.getAddress(await ask('Address: '));

  const RolesFactory = await ethers.getContractFactory('Roles');
  const rolesContract = RolesFactory.attach(contract.address);

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
