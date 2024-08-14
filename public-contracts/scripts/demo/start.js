const { deployAll } = require('../../utils/demo');
const { randomWord } = require('../../test/common/chainlink');
const { ethers, network} = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  await ethers.provider.ready;
  const {
    link,
    coordinator,
    ticket,
    manager,
    nft,
    token,
    winnablesDeployer
  } = await deployAll();
  await (await manager.setRole(winnablesDeployer.address, 1, true)).wait();
  const blockNumber = await ethers.provider.getBlockNumber();
  const lines = [
    'REDIS_URL=redis://redis',
    'UUID_NAMESPACE=50fbd16e-8ed2-450f-8536-07aaeaf7f599',
    '',
    'API_URL=http://localhost:9000',
    'WINNABLES_APP_URL=http://localhost:3001',
    '',
    'ETH_RPC=http://host.docker.internal:8545',
    'CHAIN_ID=31337',
    `LINK_ADDRESS=${link.address}`,
    `VRF_COORDINATOR=${coordinator.address}`,
    `WINNABLES_CONTRACT=${manager.address}`,
    `TICKET_CONTRACT=${ticket.address}`,
    `MOCK_NFT_CONTRACT=${nft.address}`,
    `MOCK_TOKEN_CONTRACT=${token.address}`,
    `CONTRACTS_DEPLOYED_AT=${blockNumber}`,
    '',
    `POSTHOG_KEY=`,
    'UTILITY_WALLET_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '',
    'SKIP_INDEXING_ON_START=false',
    '',
    'MYSQL_ROOT_PASSWORD=winnables',
    'MYSQL_DATABASE=winnables',
    'MYSQL_USER=winnables',
    'MYSQL_PASSWORD=winnables',
    '',
    'DATABASE_URL=mysql://winnables:winnables@db:3306/winnables',
    '',
    'SHUFTI_API_URL=https://api.shuftipro.com/',
    'SHUFTI_API_ACCESS_TOKEN=',
    '',
    'AUTH0_DOMAIN=',
    'AUTH0_CLIENT_ID=',
    'AUTH0_CLIENT_SECRET='
  ];
  const env = lines.join('\n') + '\n';
  await fs.promises.writeFile(path.join(__dirname, '..', '..', '.env.local'), env);
  console.log('.env.local: \n\n' + lines.join('\n'));

  manager.on('RequestSent', async (requestId, raffleId) => {
    console.log('Requested Random number', { requestId, raffleId });
    await new Promise(r => setTimeout(r, 10000));
    coordinator.fulfillRandomWordsWithOverride(
      requestId,
      manager.address,
      [randomWord()]
    );
  });

  await network.provider.send('evm_setAutomine', [true]);
  await network.provider.send("evm_setIntervalMining", [3000]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
