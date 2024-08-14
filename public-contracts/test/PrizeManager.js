const { ethers } = require('hardhat');
const { expect } = require('chai');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {
  getWalletWithEthers,
} = require('./common/utils');
const { ccipDeployPrizeManager} = require('../utils/demo');
const { whileImpersonating } = require('../utils/impersonate');
const exp = require('node:constants');
const {BigNumber} = require('ethers');

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

describe('CCIP Prize Manager', () => {
  let ccipRouter;
  let link;
  let signers;
  let manager;
  let winnablesDeployer;
  let nft;
  let token;
  let api;
  let snapshot;
  let counterpartContractAddress;

  before(async () => {
    signers = await ethers.getSigners();
    const result = await ccipDeployPrizeManager(signers[0], false);
    winnablesDeployer = signers[0];
    link = result.link;
    manager = result.prizeManager;
    nft = result.nft;
    token = result.token;
    ccipRouter = result.ccipRouter;
    counterpartContractAddress = signers[1].address;
  });

  it('Should not be able to lock a prize if not admin', async () => {
    const randomUser = signers[10];

    await expect(manager.connect(randomUser).lockNFT(
      counterpartContractAddress,
      1,
      1,
      nft.address,
      1
    )).to.be.revertedWithCustomError(manager, 'MissingRole');
    await expect(manager.connect(randomUser).lockTokens(
      counterpartContractAddress,
      1,
      1,
      token.address,
      100
    )).to.be.revertedWithCustomError(manager, 'MissingRole');
    await expect(manager.connect(randomUser).lockETH(
      counterpartContractAddress,
      1,
      1,
      100,
      { value: 100 }
    )).to.be.revertedWithCustomError(manager, 'MissingRole');
  });

  it('Should not be able to lock a NFT prize before sending it', async () => {
    await (await nft.mint(signers[0].address)).wait();
    await expect(manager.connect(winnablesDeployer).lockNFT(
      counterpartContractAddress,
      1,
      1,
      nft.address,
      1
    )).to.be.revertedWithCustomError(manager, 'InvalidPrize');
  });

  it('Should not be able to lock a ETH prize without sending it', async () => {
    await expect(manager.connect(winnablesDeployer).lockETH(
      counterpartContractAddress,
      1,
      2,
      1
    )).to.be.revertedWithCustomError(manager, 'InvalidPrize');
  });

  it('Should not be able to lock a Token prize without sending it', async () => {
    await expect(manager.connect(winnablesDeployer).lockTokens(
      counterpartContractAddress,
      1,
      1,
      token.address,
      100
    )).to.be.revertedWithCustomError(manager, 'InvalidPrize');
  });

  it('Cannot lock prize with insufficient LINK balance', async () => {
    await (await nft.transferFrom(signers[0].address, manager.address, 1)).wait();
    await expect(manager.connect(winnablesDeployer).lockNFT(
      counterpartContractAddress,
      1,
      1,
      nft.address,
      1
    )).to.be.revertedWithCustomError(manager, 'InsufficientLinkBalance');
  });

  it('Cannot create Raffle #0', async () => {
    const tx = manager.lockNFT(
      counterpartContractAddress,
      1,
      0,
      nft.address,
      1
    );
    await expect(tx).to.be.revertedWithCustomError(manager, 'IllegalRaffleId');
  });

  it('Should be able to lock NFT prize with enough LINK', async () => {
    await (await link.connect(signers[0]).mint(manager.address, ethers.utils.parseEther('100'))).wait();
    const tx = await manager.connect(winnablesDeployer).lockNFT(
      counterpartContractAddress,
      1,
      1,
      nft.address,
      1
    );
    const { events } = await tx.wait();
    const ccipMessageEvent = ccipRouter.interface.parseLog(events[0]);
    expect(ccipMessageEvent.name).to.eq('MockCCIPMessageEvent');
    await expect(manager.getTokenRaffle(1)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    await expect(manager.getETHRaffle(1)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    const nftInfo = await manager.getNFTRaffle(1);
    expect(nftInfo.contractAddress).to.eq(nft.address);
    expect(nftInfo.tokenId).to.eq(1);
    const prize = await manager.getRaffle(1);
    expect(prize.raffleType).to.eq(1);
    expect(prize.status).to.eq(0);
    expect(prize.winner).to.eq(ethers.constants.AddressZero);
  });

  it('Should not be able to lock ETH prize with existing raffle ID', async () => {
    await (await link.connect(signers[0]).mint(manager.address, ethers.utils.parseEther('100'))).wait();
    const tx = manager.connect(winnablesDeployer).lockETH(
      counterpartContractAddress,
      1,
      1,
      100,
      {
        value: 100
      }
    );
    await expect(tx).to.be.revertedWithCustomError(manager, 'InvalidRaffleId');
  });

  it('Should be able to lock ETH prize with enough LINK', async () => {
    await (await link.connect(signers[0]).mint(manager.address, ethers.utils.parseEther('100'))).wait();
    const tx = await manager.connect(winnablesDeployer).lockETH(
      counterpartContractAddress,
      1,
      2,
      100,
      {
        value: 100
      }
    );
    const { events } = await tx.wait();
    const ccipMessageEvent = ccipRouter.interface.parseLog(events[0]);
    expect(ccipMessageEvent.name).to.eq('MockCCIPMessageEvent');
    await expect(manager.getTokenRaffle(2)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    await expect(manager.getNFTRaffle(2)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    const amount = await manager.getETHRaffle(2);
    expect(amount).to.eq(100);
    const prize = await manager.getRaffle(2);
    expect(prize.raffleType).to.eq(2);
    expect(prize.status).to.eq(0);
    expect(prize.winner).to.eq(ethers.constants.AddressZero);
  });

  it('Should be able to lock Tokens prize with enough LINK', async () => {
    await (await link.connect(winnablesDeployer).mint(manager.address, ethers.utils.parseEther('100'))).wait();
    await (await token.connect(winnablesDeployer).mint(winnablesDeployer.address, 100)).wait();
    await (await token.transfer(manager.address, 100)).wait();
    const tx = await manager.connect(winnablesDeployer).lockTokens(
      counterpartContractAddress,
      1,
      3,
      token.address,
      100
    );
    const { events } = await tx.wait();
    const ccipMessageEvent = ccipRouter.interface.parseLog(events[0]);
    expect(ccipMessageEvent.name).to.eq('MockCCIPMessageEvent');
    await expect(manager.getNFTRaffle(3)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    await expect(manager.getETHRaffle(3)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    const tokenInfo = await manager.getTokenRaffle(3);
    expect(tokenInfo.tokenAddress).to.eq(token.address);
    expect(tokenInfo.amount).to.eq(100);
    const prize = await manager.getRaffle(3);
    expect(prize.raffleType).to.eq(3);
    expect(prize.status).to.eq(0);
    expect(prize.winner).to.eq(ethers.constants.AddressZero);
  });

  it('Cannot create Raffle with existing ID', async () => {
    const tx = manager.lockNFT(
      counterpartContractAddress,
      1,
      1,
      nft.address,
      1
    );
    await expect(tx).to.be.revertedWithCustomError(manager, 'InvalidRaffleId');
  });

  it('Cannot re-use locked NFT', async () => {
    const tx = manager.lockNFT(
      counterpartContractAddress,
      1,
      4,
      nft.address,
      1
    );
    await expect(tx).to.be.revertedWithCustomError(manager, 'InvalidPrize');
  });

  describe('Attempts to cancel the raffle and withdraw the NFT', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });

    it('Cannot set CCIP Counterpart as a non-admin', async () => {
      await expect(manager.connect(signers[1]).setCCIPCounterpart(
        counterpartContractAddress,
        1,
        true
      )).to.be.revertedWithCustomError(manager, 'MissingRole')
    })

    it('Cannot cancel non-existing raffle', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000005',
          destTokenAmounts: []
        })
      );
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffle'
      );
    });
  });

  describe('Attempts to cancel the raffle and withdraw the NFT', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });
    it('Can\'t withdraw the prize', async () => {
      await expect(manager.withdrawNFT(nft.address, 1))
        .to.be.revertedWithCustomError(manager, 'NFTLocked');
    });

    it('Can\'t unlock the prize from an unknown router', async () => {
      await expect(manager.ccipReceive({
        messageId: ethers.constants.HashZero,
        sourceChainSelector: 1,
        sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
        data: '0x000000000000000000000000000000000000000000000000000000000000000001',
        destTokenAmounts: []
      })).to.be.revertedWithCustomError(manager, 'InvalidRouter');
    });

    it('Can\'t unlock the prize from an unauthorized sender', async () => {
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000001',
          destTokenAmounts: []
        })
      );
      await expect(tx).to.be.revertedWithCustomError(manager, 'UnauthorizedCCIPSender');
    })

    it('Can unlock the tokens with a cancel message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000001',
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('PrizeUnlocked');
      const prize = await manager.getRaffle(1);
      expect(prize.raffleType).to.eq(1);
      expect(prize.status).to.eq(2);
      expect(prize.winner).to.eq(ethers.constants.AddressZero);
    });

    it('Cannot decode invalid CCIP opcode', async () => {
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x03',
          destTokenAmounts: []
        })
      );
      await expect(tx).to.be.revertedWithPanic(0x21);
    });

    it('Cannot cancel twice', async () => {
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000001',
          destTokenAmounts: []
        })
      );
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffle'
      )
    });

    it('Can withdraw the NFT now', async () => {
      const tx = await manager.withdrawNFT(nft.address, 1);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      const transferEvent = nft.interface.parseLog(events[0]);
      expect(transferEvent.name).to.eq('Transfer');
      const { from, to, tokenId } = transferEvent.args;
      expect(from).to.eq(manager.address);
      expect(to).to.eq(winnablesDeployer.address);
      expect(tokenId).to.eq(1);
    });
  });

  describe('Attempts to cancel the raffle and withdraw the ETH', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });
    it('Can\'t withdraw the prize', async () => {
      await expect(manager.withdrawETH(100)).to.be.revertedWithCustomError(manager, 'InsufficientBalance');
    });

    it('Can\'t unlock the ETH from an unknown router', async () => {
      await expect(manager.ccipReceive({
        messageId: ethers.constants.HashZero,
        sourceChainSelector: 1,
        sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
        data: '0x000000000000000000000000000000000000000000000000000000000000000002',
        destTokenAmounts: []
      })).to.be.revertedWithCustomError(manager, 'InvalidRouter');
    });

    it('Can\'t unlock the prize from an unauthorized sender', async () => {
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000002',
          destTokenAmounts: []
        })
      );
      await expect(tx).to.be.revertedWithCustomError(manager, 'UnauthorizedCCIPSender');
    })

    it('Can unlock the prize with a cancel message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000002',
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('PrizeUnlocked');
    });

    it('Can\'t withdraw ETH to non-receiver contract', async () => {
      await (await manager.setRole(ccipRouter.address, 0, true)).wait();
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).withdrawETH(100)
      );
      await expect(tx).to.be.revertedWithCustomError(manager, 'ETHTransferFail');
    });

    it('Can withdraw the ETH now', async () => {
      const contractBalanceBefore = await ethers.provider.getBalance(manager.address);
      const userBalanceBefore = await ethers.provider.getBalance(winnablesDeployer.address);
      const tx = await manager.withdrawETH(100);
      const receipt = await tx.wait();
      expect(receipt.events).to.have.lengthOf(0);
      const contractBalanceAfter = await ethers.provider.getBalance(manager.address);
      const userBalanceAfter = await ethers.provider.getBalance(winnablesDeployer.address);
      expect(contractBalanceAfter).to.eq(contractBalanceBefore.sub(100));
      expect(userBalanceAfter).to.eq(
        userBalanceBefore.add(100).sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
      );
    });
  });

  describe('Attempts to cancel the raffle and withdraw the Tokens', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });

    it('Cannot withdraw prizes as a non-admin', async () => {
      const asNonAdmin = manager.connect(signers[1]);
      await expect(asNonAdmin.withdrawToken(token.address, 100))
        .to.be.revertedWithCustomError(manager, 'MissingRole');
      await expect(asNonAdmin.withdrawNFT(nft.address, 1))
        .to.be.revertedWithCustomError(manager, 'MissingRole');
      await expect(asNonAdmin.withdrawETH(100))
        .to.be.revertedWithCustomError(manager, 'MissingRole');
    })

    it('Can\'t withdraw the prize', async () => {
      await expect(manager.withdrawToken(token.address, 100))
        .to.be.revertedWithCustomError(manager, 'InsufficientBalance');
    });

    it('Can\'t unlock the prize from an unknown router', async () => {
      await expect(manager.ccipReceive({
        messageId: ethers.constants.HashZero,
        sourceChainSelector: 1,
        sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
        data: '0x000000000000000000000000000000000000000000000000000000000000000003',
        destTokenAmounts: []
      })).to.be.revertedWithCustomError(manager, 'InvalidRouter');
    });

    it('Can\'t unlock the prize from an unauthorized sender', async () => {
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000003',
          destTokenAmounts: []
        })
      );
      await expect(tx).to.be.revertedWithCustomError(manager, 'UnauthorizedCCIPSender');
    })

    it('Can unlock the tokens with a cancel message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x000000000000000000000000000000000000000000000000000000000000000003',
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('PrizeUnlocked');
    });

    it('Can withdraw the Tokens now', async () => {
      const tx = await manager.withdrawToken(token.address, 100);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      const transferEvent = token.interface.parseLog(events[0]);
      expect(transferEvent.name).to.eq('Transfer');
      const { from, to, value } = transferEvent.args;
      expect(from).to.eq(manager.address);
      expect(to).to.eq(winnablesDeployer.address);
      expect(value).to.eq(100);
    });
  });

  describe('Attempts to draw the raffle and claim the NFT as the winner', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });

    it('Can\'t claim the prize', async () => {
      await expect(manager.claimPrize(1)).to.be.revertedWithCustomError(manager, 'UnauthorizedToClaim');
    });

    it('Can\'t claim a prize for a non-existing raffle', async () => {
      await expect(manager.claimPrize(5)).to.be.revertedWithCustomError(manager, 'InvalidRaffle');
    });

    it('Can unlock the prize with a WinnerDrawn message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x' +
            '01' +
            '0000000000000000000000000000000000000000000000000000000000000001' +
            winnablesDeployer.address.slice(-40).toLowerCase(),
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('WinnerPropagated');
    });

    it('Can claim the NFT now', async () => {
      const raffleWinner = await manager.getWinner(1);
      expect(raffleWinner).to.eq(signers[0].address);
      const tx = await manager.claimPrize(1);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(2);
      const transferEvent = nft.interface.parseLog(events[0]);
      expect(transferEvent.name).to.eq('Transfer');
      const { from, to, tokenId } = transferEvent.args;
      expect(from).to.eq(manager.address);
      expect(to).to.eq(winnablesDeployer.address);
      expect(tokenId).to.eq(1);
      expect(events[1].event).to.eq('PrizeClaimed');
      const { raffleId, winner } = events[1].args;
      expect(raffleId).to.eq(1);
      expect(winner).to.eq(winnablesDeployer.address);
    });
  });

  describe('Attempts to draw the raffle and claim the ETH as the winner', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });

    it('Can\'t claim the prize', async () => {
      await expect(manager.claimPrize(2)).to.be.revertedWithCustomError(manager, 'UnauthorizedToClaim');
    });

    it('Can unlock the prize with a WinnerDrawn message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x' +
            '01' +
            '0000000000000000000000000000000000000000000000000000000000000002' +
            winnablesDeployer.address.slice(-40).toLowerCase(),
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('WinnerPropagated');
    });

    it('Can claim the ETH now', async () => {
      const contractBalanceBefore = await ethers.provider.getBalance(manager.address);
      const userBalanceBefore = await ethers.provider.getBalance(winnablesDeployer.address);
      const tx = await manager.claimPrize(2);
      const receipt = await tx.wait();
      const contractBalanceAfter = await ethers.provider.getBalance(manager.address);
      const userBalanceAfter = await ethers.provider.getBalance(winnablesDeployer.address);
      expect(contractBalanceAfter).to.eq(contractBalanceBefore.sub(100));
      expect(userBalanceAfter).to.eq(
        userBalanceBefore.add(100).sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('PrizeClaimed');
      const { raffleId, winner } = events[0].args;
      expect(raffleId).to.eq(2);
      expect(winner).to.eq(winnablesDeployer.address);
    });
  });

  describe('Attempts to draw the raffle and claim the ETH as a non-receiver contract', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });

    it('Unlocks the prize with a WinnerDrawn message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x' +
            '01' +
            '0000000000000000000000000000000000000000000000000000000000000002' +
            ccipRouter.address.slice(-40).toLowerCase(),
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('WinnerPropagated');
      const prize = await manager.getRaffle(2);
      expect(prize.raffleType).to.eq(2);
      expect(prize.status).to.eq(0);
      expect(prize.winner).to.eq(ccipRouter.address);
    });

    it('Fails to claim the ETH', async () => {
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).claimPrize(2)
      )
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'ETHTransferFail'
      );
    });
  });

  describe('Attempts to draw the raffle and claim the Tokens as the winner', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });
    it('Can\'t claim the prize', async () => {
      await expect(manager.claimPrize(3)).to.be.revertedWithCustomError(manager, 'UnauthorizedToClaim');
    });

    it('Can unlock the prize with a WinnerDrawn message', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x' +
            '01' +
            '0000000000000000000000000000000000000000000000000000000000000003' +
            winnablesDeployer.address.slice(-40).toLowerCase(),
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('WinnerPropagated');
    });

    it('Can claim the Tokens now', async () => {
      const tx = await manager.claimPrize(3);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(2);
      const transferEvent = token.interface.parseLog(events[0]);
      expect(transferEvent.name).to.eq('Transfer');
      const { from, to, value } = transferEvent.args;
      expect(from).to.eq(manager.address);
      expect(to).to.eq(winnablesDeployer.address);
      expect(value).to.eq(100);
      expect(events[1].event).to.eq('PrizeClaimed');
      const { raffleId, winner } = events[1].args;
      expect(raffleId).to.eq(3);
      expect(winner).to.eq(winnablesDeployer.address);
      const prize = await manager.getRaffle(3);
      expect(prize.raffleType).to.eq(3);
      expect(prize.status).to.eq(1);
      expect(prize.winner).to.eq(winnablesDeployer.address);
    });
  });

  describe('Double-claim prize (ETH)', () => {
    let winnerA;
    let winnerB;
    before(async () => {
      winnerA = await getWalletWithEthers();
      winnerB = await getWalletWithEthers();
      snapshot = await helpers.takeSnapshot();
    });
    after(async () => {
      await snapshot.restore();
    });

    it('Create 2 raffles', async () => {
      const value = BigNumber.from(10).pow(18);
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      {
        const tx = await manager.connect(winnablesDeployer).lockETH(
          counterpartContractAddress,
          1,
          100,
          value,
          {
            value
          }
        );
        await tx.wait();
      }
      {
        const tx = await manager.connect(winnablesDeployer).lockETH(
          counterpartContractAddress,
          1,
          101,
          value,
          {
            value
          }
        );
        await tx.wait();
      }
    });
    it('Declare 2 different winners for each', async () => {
      {
        const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
          manager.connect(signer).ccipReceive({
            messageId: ethers.constants.HashZero,
            sourceChainSelector: 1,
            sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
            data: '0x' +
              '01' +
              '0000000000000000000000000000000000000000000000000000000000000064' +
              winnerA.address.slice(-40).toLowerCase(),
            destTokenAmounts: []
          })
        );
        await tx.wait();
      }
      {
        const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
          manager.connect(signer).ccipReceive({
            messageId: ethers.constants.HashZero,
            sourceChainSelector: 1,
            sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
            data: '0x' +
              '01' +
              '0000000000000000000000000000000000000000000000000000000000000065' +
              winnerB.address.slice(-40).toLowerCase(),
            destTokenAmounts: []
          })
        );
        await tx.wait();
      }
    });

    it('Claims twice as Winner A', async () => {
        const tx = await manager.connect(winnerA).claimPrize(100);
        await tx.wait();
        await expect(manager.connect(winnerA).claimPrize(100)).to.be.revertedWithCustomError(
          manager, 'AlreadyClaimed'
        );
    });

    it('Claim as winner B', async () => {
      {
        const tx = await manager.connect(winnerB).claimPrize(101);
        await tx.wait();
      }
    });
  });
});
