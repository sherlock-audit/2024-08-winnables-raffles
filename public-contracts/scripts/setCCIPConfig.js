const { ethers, network } = require("hardhat");
const { routerConfig } = require("./constants");

// Update these
const WINNABLES_ADDRESS = '';
const NFT_MANAGER_ADDRESS = '';

const WINNABLES_NETWORK = 'arbitrumSepolia';
const NFT_MANAGER_NETWORK = 'ethereumSepolia';

const WINNABLES_CONFIG = {
  destChainSelector: routerConfig[NFT_MANAGER_NETWORK].chainSelector,
  destAddres: NFT_MANAGER_ADDRESS,
};

const NFT_MANAGER_CONFIG = {
  destChainSelector: routerConfig[WINNABLES_NETWORK].chainSelector,
  destAddres: WINNABLES_ADDRESS,
};

async function winnablesCCIPConfig() {
  const signers = await ethers.getSigners();
  const winnablesDeployer = signers[0];

  const Winnables = await ethers.getContractFactory('Winnables');
  const winnables = Winnables.attach(WINNABLES_ADDRESS);

  let tx = await winnables.connect(winnablesDeployer).setCCIPDestParams(
    WINNABLES_CONFIG.destChainSelector,
    WINNABLES_CONFIG.destAddres
  );

  const receipt = await tx.wait();
  console.log('Winnables.setCCIPDestParams', tx.hash, receipt);
}

async function winnablesNFTManagerCCIPConfig() {
  const signers = await ethers.getSigners();
  const winnablesDeployer = signers[0];

  const WinnablesNFTManager = await ethers.getContractFactory('WinnablesNFTManager');
  const nftManager = WinnablesNFTManager.attach(NFT_MANAGER_ADDRESS);

  let tx = await nftManager.connect(winnablesDeployer).setCCIPDestParams(
    NFT_MANAGER_CONFIG.destChainSelector,
    NFT_MANAGER_CONFIG.destAddres
  );

  const receipt = await tx.wait();
  console.log('WinnablesNFTManager.setCCIPDestParams', tx.hash, receipt);
}

function main() {
  winnablesCCIPConfig();
  
  // winnablesNFTManagerCCIPConfig();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
