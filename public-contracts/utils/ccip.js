const { ethers } = require('ethers');
const { ccipDeployTicketManager, ccipDeployPrizeManager} = require('./demo');
const { setTimeout } = require('node:timers/promises');

async function fund(provider, address) {
  await provider.send('anvil_setBalance', [
    address,
    '0x3635c9adc5dea00000'
  ])
}

async function initTicketsNetwork() {
  process.stdout.write(`Starting Tickets Network on port 8546... `);
  const rpc = 'http://127.0.0.1:8546';
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const approver = new ethers.Wallet(process.env.UTILITY_WALLET_PRIVATE_KEY, deployer.provider);
  await fund(provider, deployer.address);
  console.log('Ready');
  const { link, ticket, ccipRouter, ticketManager, coordinator } = await ccipDeployTicketManager(deployer, approver, true);
  console.log('- Contracts deployed')
  const longAddress = '0x' + '0'.repeat(24) + ticketManager.address.slice(-40).toLowerCase();
  process.stdout.write('Minting 1000 LINK to the ticket manager... ');
  await (await link.mint(ticketManager.address, ethers.utils.parseEther('1000'))).wait();
  console.log('[OK]');
  return {
    rpc,
    provider,
    deployer,
    ccipRouter,
    link,
    ticket,
    contract: ticketManager,
    chainSelector: '14767482510784806043',
    longAddress,
    coordinator,
  };
}

async function initPrizesNetwork() {
  process.stdout.write(`Starting Tickets Network on port 8545... `);
  const rpc = 'http://127.0.0.1:8545';
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  await fund(provider, deployer.address);
  const { link, ccipRouter, prizeManager, nft, token } = await ccipDeployPrizeManager(deployer);
  console.log('- Contracts deployed')
  const longAddress = '0x' + '0'.repeat(24) + prizeManager.address.slice(-40).toLowerCase();
  process.stdout.write('Minting 1000 LINK to the prize manager... ');
  await (await link.mint(prizeManager.address, ethers.utils.parseEther('1000'))).wait();
  return {
    rpc,
    provider,
    ccipRouter,
    link,
    contract: prizeManager,
    chainSelector: '16015286601757825753',
    longAddress,
    nft,
    token,
  };
}

async function linkNetworks(ticketsNetwork, prizesNetwork) {
  console.log('Linking CCIP contracts');
  await (await ticketsNetwork.contract.setCCIPCounterpart(prizesNetwork.contract.address, prizesNetwork.chainSelector, true)).wait();
  console.log('Tickets -> Prize');
  ticketsNetwork.ccipRouter.on('MockCCIPMessageEvent', async (chain, receiver, message) => {
    console.log('Forwarding CCIP Message from chain', ticketsNetwork.chainSelector, 'to', chain.toString(), 'in 10 sec');
    const recipient = ethers.utils.getAddress('0x' + receiver.slice(-40));
    const outMessage = {
      messageId: ethers.constants.HashZero,
      sourceChainSelector: ticketsNetwork.chainSelector,
      sender: ticketsNetwork.longAddress,
      data: message,
      destTokenAmounts: []
    };
    await setTimeout(10000);
    await (await prizesNetwork.ccipRouter.routeMessage(outMessage, 0, 0, recipient)).wait();
    console.log('Forwarded CCIP Message from chain', ticketsNetwork.chainSelector, 'to', chain.toString());
  });
  await (await prizesNetwork.contract.setCCIPCounterpart(ticketsNetwork.contract.address, ticketsNetwork.chainSelector, true)).wait();
  console.log('Prize -> Tickets');
  prizesNetwork.ccipRouter.on('MockCCIPMessageEvent', async (chain, receiver, message) => {
    console.log('Forwarding CCIP Message from chain', prizesNetwork.chainSelector, 'to', chain.toString(), 'in 10 sec');
    const recipient = ethers.utils.getAddress('0x' + receiver.slice(-40));
    const outMessage = {
      messageId: ethers.constants.HashZero,
      sourceChainSelector: prizesNetwork.chainSelector,
      sender: prizesNetwork.longAddress,
      data: message,
      destTokenAmounts: []
    };
    await setTimeout(10000);
    await (await ticketsNetwork.ccipRouter.routeMessage(outMessage, 0, 0, recipient)).wait();
    console.log('Forwarded CCIP Message from chain', prizesNetwork.chainSelector, 'to', chain.toString());
  });
}

module.exports = {
  initTicketsNetwork,
  initPrizesNetwork,
  linkNetworks,
};
