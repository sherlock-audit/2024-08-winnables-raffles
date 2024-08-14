const ask = require('../utils/ask');
const {ethers, network} = require("hardhat");
const latestDeployments = require('../deployments/latest.json');

async function main() {
  const signers = await ethers.getSigners();
  const contract = latestDeployments.find(d => d.network === network.name && d.name.endsWith('Manager'));
  if (!contract) {
    throw new Error(`No manager contract found on this chain: ${network.name}`)
  }
  const RolesFactory = await ethers.getContractFactory('Roles');
  const role = parseInt(await ask('Role: '));
  const rawTo = await ask('Address (leave blank to use the utility wallet): ');
  const to = rawTo ? ethers.utils.getAddress(rawTo) : signers[1].address;

  const roles = RolesFactory.attach(contract.address);

  const tx = await roles.setRole(to, role, true);
  console.log('Tx hash:', tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


