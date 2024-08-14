const { ethers } = require('hardhat');

const deployAll = async (signer) => {
  const baseURI = 'http://truc/';

  const Link = await ethers.getContractFactory('Link', signer);
  const link = await Link.deploy();
  await link.deployed();

  const Router = await ethers.getContractFactory('Router', signer);
  const router = await Router.deploy(link.address);
  await router.deployed();

  const Factory = await ethers.getContractFactory('KingdomTiles', signer);
  const contract = await Factory.deploy(router.address, link.address, baseURI);
  await contract.deployed();

  const GameEvents = await ethers.getContractFactory('KingdomGameEvents', signer);
  const gameEvents = await GameEvents.deploy();
  await gameEvents.deployed();

  return { link, router, contract, gameEvents, baseURI };
}

const attachAll = async (signer, routerAddress, linkAddress, contractAddress, gameEventsAddress) => {
  const baseURI = 'http://truc/';

  const Link = await ethers.getContractFactory('Link', signer);
  const link = Link.attach(linkAddress);

  const Router = await ethers.getContractFactory('Router', signer);
  const router = Router.attach(routerAddress);

  const Factory = await ethers.getContractFactory('KingdomTiles', signer);
  const contract = Factory.attach(contractAddress);

  const GameEvents = await ethers.getContractFactory('KingdomGameEvents', signer);
  const gameEvents = GameEvents.attach(gameEventsAddress);

  return { link, router, contract, gameEvents, baseURI };
}

const wait = async (ms) => new Promise(r => setTimeout(r, ms));

const cheapSignature = async (signer, tokenId, minter, chainId, value) => {
  const message = ethers.utils.solidityKeccak256(
    ['uint256', 'address', 'uint256', 'uint256'],
    [tokenId, minter, chainId, value]
  );
  const signature = await signer.signMessage(ethers.utils.arrayify(message));

  const r = signature.slice(2, 66);
  const s = signature.slice(66, 130);
  let v = parseInt(signature.slice(130, 132), 16);

  if (v >= 27) v -= 27;

  let rBigInt = BigInt('0x' + r);
  let sBigInt = BigInt('0x' + s);

  if (v === 1) {
    sBigInt |= BigInt(1) << BigInt(255); // Set the MSB to 1
  } else {
    sBigInt &= ~(BigInt(1) << BigInt(255)); // Set the MSB to 0
  }

  let rHex = rBigInt.toString(16).padStart(64, '0');
  let sHex = sBigInt.toString(16).padStart(64, '0');

  return '0x' + rHex + sHex;
}

function formatDate(timestamp) {
  const d = new Date(timestamp * 1000);
  return [
    [
      d.getFullYear(),
      (d.getMonth() + 1).toString().padStart(2, '0'),
      d.getDate().toString().padStart(2, '0')
    ].join('-'),
    [
      d.getHours().toString().padStart(2, '0'),
      d.getMinutes().toString().padStart(2, '0'),
      d.getSeconds().toString().padStart(2, '0')
    ].join(':')
  ].join(' at ');
}

module.exports = { deployAll, attachAll, wait, cheapSignature, formatDate };
