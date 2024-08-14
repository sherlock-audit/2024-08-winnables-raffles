const { ethers } = require('hardhat');

function loginMessage(nonce) {
  return 'Welcome to Winnables\n' +
    '\n' +
    'In order to access authenticated resources, please sign the following single-use code\n' +
    `Nonce: ${nonce}`;
}

const signer = parseInt(process.env.SIGNER || 0);

async function main() {
  const signers = await ethers.getSigners();
  if (!process.env.NONCE) {
    throw new Error('must set NONCE env');
  }

  const signature = await signers[signer].signMessage(
    loginMessage(process.env.NONCE)
  );

  console.log(signature);
}

main().catch(console.error);
