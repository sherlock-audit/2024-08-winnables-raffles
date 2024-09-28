const supportedNetworks = [
  'ethereumSepolia',
  'arbitrumSepolia',
  'avalancheFuji',
  'polygonMumbai',

  // mainnets
  'ethereumMainnet',
  'arbitrumMainnet',
  'avalancheMainnet'
];

const LINK_ADDRESSES = {
  ethereumSepolia: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  polygonMumbai: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
  arbitrumSepolia: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E',
  avalancheFuji: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846',
  avalancheMainnet: '0x5947BB275c521040051D82396192181b413227A3',
  ethereumMainnet: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  arbitrumMainnet: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  hardhat: '0x0000000000000000000000000000000000000000',
};

const VRF_COORDINATORS = {
  ethereumSepolia: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
  polygonMumbai: '0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed',
  arbitrumSepolia: '0x50d47e4142598E3411aA864e08a44284e471AC6f',
  avalancheFuji: '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE',
  avalancheMainnet: '0xE40895D055bccd2053dD0638C9695E326152b1A4',
  ethereumMainnet: '0x271682DEB8C4E0901D1a1550aD2e64D568E69909',
  arbitrumMainnet: '0x41034678D6C633D8a95c75e1138A360a28bA15d1',
  hardhat: '0x0000000000000000000000000000000000000000',
}

// https://docs.chain.link/vrf/v2/subscription/supported-networks
const VRF_KEYHASH = {
  ethereumSepolia: '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
  polygonMumbai: '0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f',
  arbitrumSepolia: '0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414',
  avalancheFuji: '0xc799bd1e3bd4d1a41cd4968997a4e03dfd2a3c7c04b695881138580163f42887',
  baseSepolia: '0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef',

  // mainnets
  // 500 gwei (there are also 200 & 1000 gwei), https://docs.chain.link/vrf/v2-5/supported-networks#avalanche-mainnet
  avalancheMainnet: '0x84213dcadf1f89e4097eb654e3f284d7d5d5bda2bd4748d8b7fada5b3a6eaa0d',
  ethereumMainnet: '0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef',
  arbitrumMainnet: '0x08ba8f62ff6c40a58877a106147661db43bc58dabfb814793847a839aa03367f',
  hardhat: '0x0000000000000000000000000000000000000000000000000000000000000000',
}

const routerConfig = {
  ethereumSepolia: {
      address: '0x0bf3de8c5d3e8a2b34d2beeb17abfcebaf363a59',
      chainSelector: '16015286601757825753',
  },
  avalancheFuji: {
      address: '0xf694e193200268f9a4868e4aa017a0118c9a8177',
      chainSelector: '14767482510784806043',
  },
  arbitrumSepolia: {
      address: '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165',
      chainSelector: '3478487238524512106',
  },
  polygonMumbai: {
      address: '0x1035cabc275068e0f4b745a29cedf38e13af41b1',
      chainSelector: '12532609583862916517',
  },
  ethereumMainnet: {
    address: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
    chainSelector: '5009297550715157269',
  },
  prizes: {
    address: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
    chainSelector: '5009297550715157269',
  },
  tickets: {
    address: '0xf694e193200268f9a4868e4aa017a0118c9a8177',
    chainSelector: '14767482510784806043',
  },
  hardhat: {
    address: '0x0000000000000000000000000000000000000000',
    chainSelector: '10000000000000000000',
  },
}

module.exports = {
  supportedNetworks,
  LINK_ADDRESSES,
  VRF_COORDINATORS,
  routerConfig,
  VRF_KEYHASH
}
