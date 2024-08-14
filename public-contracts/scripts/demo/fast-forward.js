const helpers = require('@nomicfoundation/hardhat-network-helpers');
const { blockTime } = require('../../test/common/utils');

const increment = 86400 * 14; // 2 weeks
async function main() {
  await helpers.time.setNextBlockTimestamp((await blockTime()) + increment);
}

main().catch(console.error);
