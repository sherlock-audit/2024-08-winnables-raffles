require('dotenv').config();
const fs = require('fs');
const path = require('path');

const {
  initTicketsNetwork,
  initPrizesNetwork,
  linkNetworks,
} = require('../../utils/ccip');

async function main() {
  const prizesNetwork = await initPrizesNetwork();
  const ticketsNetwork = await initTicketsNetwork();
  await linkNetworks(ticketsNetwork, prizesNetwork);

  fs.writeFileSync(path.join(__dirname, '..', '..', 'deployments', 'local.json'), JSON.stringify([
    {
      name: 'WinnablesPrizeManager',
      network: 'prizes',
      address: prizesNetwork.contract.address
    },
    {
      name: 'WinnablesTicket',
      network: 'tickets',
      address: ticketsNetwork.ticket.address
    },
    {
      name: 'WinnablesTicketManager',
      network: 'tickets',
      address: ticketsNetwork.contract.address
    },
    {
      name: 'DemoNFT',
      network: 'prizes',
      address: prizesNetwork.nft.address
    },
    {
      name: 'DemoNFT',
      network: 'prizes',
      address: prizesNetwork.nft.address
    },
    {
      name: 'CCIPRouter',
      network: 'prizes',
      address: prizesNetwork.ccipRouter.address
    },
    {
      name: 'CCIPRouter',
      network: 'tickets',
      address: ticketsNetwork.ccipRouter.address
    },
    {
      name: 'VRFCoordinator',
      network: 'tickets',
      address: ticketsNetwork.coordinator.address
    },
    {
      name: 'LinkToken',
      network: 'prizes',
      address: prizesNetwork.link.address
    },
    {
      name: 'LinkToken',
      network: 'tickets',
      address: ticketsNetwork.link.address
    }
  ], null, 2));

  console.log([
    `PRIZE_MANAGER_CONTRACT=${prizesNetwork.contract.address}`,
    `TICKET_MANAGER_CONTRACT=${ticketsNetwork.contract.address}`,
    `TICKET_CONTRACT=${ticketsNetwork.ticket.address}`,
    '',
    `PRIZE_CONTRACT_DEPLOYED_AT=1`,
    `TICKET_CONTRACT_DEPLOYED_AT=1`,
    '',
    `AVALANCHE_FUJI_RPC=${ticketsNetwork.rpc.replace('127.0.0.1', 'host.docker.internal')}`,
    `ETHEREUM_SEPOLIA_RPC=${prizesNetwork.rpc.replace('127.0.0.1', 'host.docker.internal')}`,
  ].join('\n'));

  process.on('SIGINT', async () => {
    process.stdout.write('Gracefully shutting down... ');
    console.log('[OK]');
    process.exit(0);
  })
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
})
