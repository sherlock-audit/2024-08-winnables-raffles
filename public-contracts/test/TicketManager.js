const { ethers } = require('hardhat');
const { expect } = require('chai');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

const {
  getWalletWithEthers, blockTime, timeSeconds,
} = require('./common/utils');
const { ccipDeployTicketManager } = require('../utils/demo');
const { randomWord } = require('./common/chainlink');
const { whileImpersonating } = require('../utils/impersonate');
const { BigNumber } = require('ethers');

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

describe('CCIP Ticket Manager', () => {
  let ccipRouter;
  let link;
  let signers;
  let manager;
  let tickets;
  let approver;
  let winnablesDeployer;
  let nft;
  let token;
  let api;
  let snapshot;
  let counterpartContractAddress;
  let coordinator;
  let badReceiver;
  let goodReceiver;

  before(async () => {
    signers = await ethers.getSigners();
    const result = await ccipDeployTicketManager();
    approver = result.approver;
    winnablesDeployer = signers[0];
    link = result.link;
    manager = result.ticketManager;
    nft = result.nft;
    token = result.token;
    tickets = result.ticket;
    ccipRouter = result.ccipRouter;
    coordinator = result.coordinator;
    api = await getWalletWithEthers();
    await (await manager.setRole(api.address, 1, true)).wait();
    counterpartContractAddress = signers[1].address;
    const badReceiverFactory = await ethers.getContractFactory('ERC1155BadReceiver');
    const goodReceiverFactory = await ethers.getContractFactory('ERC1155Receiver');
    badReceiver = await badReceiverFactory.deploy();
    goodReceiver = await goodReceiverFactory.deploy();
  });

  it('Initializes correctly', async () => {
    expect(await manager.getCCIPRouter()).to.eq(ccipRouter.address);
    expect(await manager.supportsInterface("0x85572ffb")).to.eq(true);
    expect(await manager.supportsInterface("0x01ffc9a7")).to.eq(true);
    expect(await manager.supportsInterface("0x01ffc9a6")).to.eq(false);
    expect(await manager.getLinkToken()).to.eq(link.address);
    const roles = await manager.getRoles(signers[0].address);
    expect(BigNumber.from(roles)).to.eq(0b11);
    const walletA = await getWalletWithEthers();
    await expect(manager.getRequestStatus(1)).to.be.revertedWithCustomError(
      manager,
      'RequestNotFound'
    )
    await expect (manager.connect(walletA).setRole(walletA.address, 0, true)).to.be.revertedWithCustomError(
      manager,
      'MissingRole'
    );
  });

  it('Cannot mint tickets', async () => {
    await expect(tickets.mint(signers[0].address, 1, 1)).to.be.revertedWithCustomError(
      tickets,
      'MissingRole',
    );
  });

  it('Should not be able to create a raffle before the prize is locked', async () => {
    const now = await blockTime();
    await expect(manager.createRaffle(
      1,
      now,
      now + timeSeconds.hour,
      0,
      500,
      100
    )).to.be.revertedWithCustomError(manager, 'PrizeNotLocked');
  });

  it('Should not accept CCIP Message from invalid router', async () => {
    const wallet = await getWalletWithEthers();
    const tx = manager.connect(wallet).ccipReceive({
      messageId: ethers.constants.HashZero,
      sourceChainSelector: 1,
      sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
      data: '0x000000000000000000000000000000000000000000000000000000000000000001',
      destTokenAmounts: []
    });
    await expect(tx).to.be.revertedWithCustomError(manager, 'InvalidRouter');
  });

  it('Should not accept prize locked notification from unauthorized source', async () => {
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
  });

  it('Should not be able to set CCIP Counterpart if not admin', async () => {
    await expect(manager.connect(signers[2]).setCCIPCounterpart(
      counterpartContractAddress,
      1,
      true
    )).to.be.revertedWithCustomError(
      manager,
      'MissingRole'
    )
  });

  it('Should notify when the prize is locked', async () => {
    await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
    const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
      manager.connect(signer).ccipReceive({
        messageId: ethers.constants.HashZero,
        sourceChainSelector: 1,
        sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
        data: '0x0000000000000000000000000000000000000000000000000000000000000001',
        destTokenAmounts: []
      })
    );
    const { events } = await tx.wait();
    expect(events).to.have.lengthOf(1);
    expect(events[0].event).to.eq('RafflePrizeLocked');
    const { raffleId } = events[0].args;
    expect(raffleId).to.eq(1);
  });

  describe('Cancellation with zero participant', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });

    after(async () => {
      await snapshot.restore();
    });

    it('Cannot create a raffle that closes too soon', async () => {
      const now = await blockTime();
      const tx = manager.createRaffle(
        1,
        0,
        now + 5,
        0,
        500,
        100
      );

      await expect(tx).to.be.revertedWithCustomError(manager, 'RaffleClosingTooSoon');
    });

    it('Cannot create a raffle with no supply cap', async () => {
      const now = await blockTime();
      const tx = manager.createRaffle(
        1,
        now,
        now + timeSeconds.hour,
        0,
        0,
        100
      );

      await expect(tx).to.be.revertedWithCustomError(manager, 'RaffleRequiresTicketSupplyCap');
    });

    it('Cannot create a raffle without max holdings', async () => {
      const now = await blockTime();
      const tx = manager.createRaffle(
        1,
        now,
        now + timeSeconds.hour,
        0,
        500,
        0
      );

      await expect(tx).to.be.revertedWithCustomError(manager, 'RaffleRequiresMaxHoldings');
    });

    it('Cannot create a raffle as non-admin', async () => {
      const now = await blockTime();
      const tx = manager.connect(signers[1]).createRaffle(
        1,
        now,
        now + timeSeconds.hour,
        0,
        500,
        100
      );

      await expect(tx).to.be.revertedWithCustomError(manager, 'MissingRole');
    });

    it('Create Raffle with 0 ticket min', async () => {
      const now = await blockTime();
      const tx = await manager.createRaffle(
        1,
        now,
        now + timeSeconds.hour,
        0,
        500,
        100
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('NewRaffle');
      const { id } = events[0].args;
      expect(id).to.eq(1);
    });

    it('Should not be able to cancel if the raffle is still open', async () => {
      await expect(
        manager.cancelRaffle(counterpartContractAddress, 1, 1)
      ).to.be.revertedWithCustomError(manager, 'RaffleIsStillOpen');
    });

    it('Waits 1h', async () => {
      await helpers.time.increase(timeSeconds.hour);
    })

    it('Should not be able to cancel with insufficient LINK balance', async () => {
      await expect(manager.cancelRaffle(counterpartContractAddress, 1, 1)).to.be.revertedWithCustomError(
        manager,
        'InsufficientLinkBalance'
      );
    });

    it('Mints LINK to the ticket manager', async () => {
      await (await link.mint(manager.address, ethers.utils.parseEther('100'))).wait();
    });

    it('Should not be able to draw the raffle', async () => {
      await expect(manager.drawWinner(1)).to.be.revertedWithCustomError(manager, 'NoParticipants')
    });

    it('Should not be able to buy tickets after expiration', async () => {
      const buyer = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const nonce = await manager.getNonce(buyer.address);
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer.address,
          nonce,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      await expect(manager.connect(buyer).buyTickets(1, 10, currentBlock, sig)).to.be.revertedWithCustomError(
        manager,
        'RaffleHasEnded'
      )
    });

    it('Cancels and sends cancellation CCIP Message', async () => {
      expect(await manager.shouldCancelRaffle(1)).to.eq(true);
      const tx = await manager.cancelRaffle(counterpartContractAddress, 1, 1);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(3);
      const ccipMessageEvent = ccipRouter.interface.parseLog(events[0]);
      expect(ccipMessageEvent.name).to.eq('MockCCIPMessageEvent');
      expect(ccipMessageEvent.args.data).to.eq('0x000000000000000000000000000000000000000000000000000000000000000001');
      await expect(manager.getWinner(1)).to.be.revertedWithCustomError(manager, 'RaffleNotFulfilled');
    });
  });

  describe('Cancellation before raffle creation', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });

    after(async () => {
      await snapshot.restore();
    });

    it('Should unlock the prize', async () => {
      await (await link.mint(manager.address, ethers.utils.parseEther('100'))).wait();
      const tx = await manager.cancelRaffle(counterpartContractAddress, 1, 1);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(3);
      const ccipMessageEvent = ccipRouter.interface.parseLog(events[0]);
      expect(ccipMessageEvent.name).to.eq('MockCCIPMessageEvent');
      expect(ccipMessageEvent.args.data).to.eq('0x000000000000000000000000000000000000000000000000000000000000000001');
    });
  })

  describe('Cancellation with tickets threshold not reached', () => {
    let buyer1;
    let buyer2;

    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });

    after(async () => {
      await snapshot.restore();
    });

    it('Mints LINK to the ticket manager', async () => {
      await (await link.mint(manager.address, ethers.utils.parseEther('100'))).wait();
    });

    it('Create Raffle with 50 ticket min', async () => {
      const now = await blockTime();
      const tx = await manager.createRaffle(
        1,
        now,
        now + timeSeconds.hour,
        50,
        500,
        10
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('NewRaffle');
      const { id } = events[0].args;
      expect(id).to.eq(1);
    });

    it('Can\'t buy ticket with expired signature', async () => {
      buyer1 = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer1.address,
          0,
          1,
          10,
          currentBlock - 1,
          0
        ])
      ));
      await expect(manager.connect(buyer1).buyTickets(1, 10, currentBlock - 1, sig)).to.be.revertedWithCustomError(
        manager,
        'ExpiredCoupon'
      )
    });

    it('Can\'t buy ticket with signature from unauthorized approver', async () => {
      buyer1 = await getWalletWithEthers();
      const signer = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await signer.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer1.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      await expect(manager.connect(buyer1).buyTickets(1, 10, currentBlock + 10, sig)).to.be.revertedWithCustomError(
        manager,
        'Unauthorized'
      )
    });

    it('Cannot buy zero tickets', async () => {
      buyer1 = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer1.address,
          0,
          1,
          0,
          currentBlock + 10,
          0
        ])
      ));
      const tx = manager.connect(buyer1).buyTickets(1, 0, currentBlock + 10, sig);
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'InvalidTicketCount'
      );
    });

    it('Bad ERC1155Receiver cannot purchase tickets', async () => {
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          badReceiver.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      const tx = whileImpersonating(badReceiver.address, ethers.provider, async (signer) =>
        manager.connect(signer).buyTickets(1, 10, currentBlock + 10, sig)
      );
      await expect(tx).to.be.revertedWithCustomError(
        tickets,
        'TransferRejected'
      )
    });

    it('Non ERC1155Receiver cannot purchase tickets', async () => {
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          ccipRouter.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).buyTickets(1, 10, currentBlock + 10, sig)
      );
      await expect(tx).to.be.revertedWithCustomError(
        tickets,
        'TransferRejected'
      )
    });

    it('Good ERC1155Receiver can purchase tickets', async () => {
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          goodReceiver.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      const tx = await whileImpersonating(goodReceiver.address, ethers.provider, async (signer) =>
        manager.connect(signer).buyTickets(1, 10, currentBlock + 10, sig)
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(3);
      expect(await tickets.balanceOf(goodReceiver.address, 1)).to.eq(10);
    });

    it('Buyer 1 gets 10 free tickets', async () => {
      buyer1 = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer1.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      const { events } = await (await manager.connect(buyer1).buyTickets(1, 10, currentBlock + 10, sig)).wait();
      expect(events).to.have.lengthOf(3);
    });

    it('Buyer 2 gets 10 tickets for 100 wei', async () => {
      buyer2 = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer2.address,
          0,
          1,
          10,
          currentBlock + 10,
          100
        ])
      ));
      const { events } = await (
        await manager.connect(buyer2).buyTickets(1, 10, currentBlock + 10, sig, { value: 100 })
      ).wait();
      expect(events).to.have.lengthOf(3);
    });

    it('Should not be able to cancel if the raffle is still open', async () => {
      await expect(manager.cancelRaffle(counterpartContractAddress, 1, 1))
        .to.be.revertedWithCustomError(manager, 'RaffleIsStillOpen');
    });

    it('Should not be able to draw the raffle', async () => {
      await expect(manager.drawWinner(1))
        .to.be.revertedWithCustomError(manager, 'RaffleIsStillOpen')
    });

    it('Waits 1h', async () => {
      await helpers.time.increase(timeSeconds.hour);
    });

    it('Should still not be able to draw the raffle', async () => {
      await expect(manager.drawWinner(1))
        .to.be.revertedWithCustomError(manager, 'TargetTicketsNotReached');
    });

    it('Should not be able to refund players before cancelling the raffle', async () => {
      const tx = manager.refundPlayers(1, [buyer2.address]);
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffle'
      );
    })

    it('Cancels and sends cancellation CCIP Message', async () => {
      const tx = await manager.cancelRaffle(counterpartContractAddress, 1, 1);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(3);
      const ccipMessageEvent = ccipRouter.interface.parseLog(events[0]);
      expect(ccipMessageEvent.name).to.eq('MockCCIPMessageEvent');
      expect(ccipMessageEvent.args.data).to.eq('0x000000000000000000000000000000000000000000000000000000000000000001');
    });

    it('Should not be able to refund tickets acquired for free', async () => {
      await expect(manager.refundPlayers(1, [buyer1.address]))
        .to.be.revertedWithCustomError(manager, 'NothingToSend');
    });

    it('Admin should not be able to withdraw funds supposed to be used for a refund', async () => {
      await expect(manager.withdrawETH()).to.be.revertedWithCustomError(
        manager,
        'NothingToSend'
      );
    });

    it('Should be able to refund tickets purchased', async () => {
      const contractBalanceBefore = await ethers.provider.getBalance(manager.address);
      const userBalanceBefore = await ethers.provider.getBalance(buyer2.address);
      const tx = await manager.refundPlayers(1, [buyer2.address]);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      const [ event ] = events;
      expect(event.event).to.equal('PlayerRefund');
      const contractBalanceAfter = await ethers.provider.getBalance(manager.address);
      const userBalanceAfter = await ethers.provider.getBalance(buyer2.address);
      expect(contractBalanceAfter).to.eq(contractBalanceBefore.sub(100));
      expect(userBalanceAfter).to.eq(userBalanceBefore.add(100));
      const { withdrawn } = await manager.getParticipation(1, buyer2.address);
      expect(withdrawn).to.eq(true);
    });

    it('Players cannot be refunded twice', async () => {
      const tx = manager.refundPlayers(1, [buyer2.address]);
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'PlayerAlreadyRefunded'
      );
    });
  });

  describe('Successful raffle flow', () => {
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });

    after(async () => {
      await snapshot.restore();
    });
    const buyers = [];

    it('Should be able to create a raffle', async () => {
      const now = await blockTime();
      const tx = await manager.createRaffle(
        1,
        now + 60,
        now + timeSeconds.hour,
        0,
        500,
        100
      );
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.eq('NewRaffle');
      const { id } = events[0].args;
      expect(id).to.eq(1);
    });

    it('Should not be able to purchase tickets before the announced start', async () => {
      const buyer = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer.address,
          0,
          1,
          100,
          currentBlock + 10,
          100
        ])
      ));
      await expect(manager.connect(buyer).buyTickets(
        1, 100, currentBlock + 10, sig, { value: 100 }
      )).to.be.revertedWithCustomError(manager, 'RaffleHasNotStarted');
    });

    it('Should be able to purchase tickets', async () => {
      await helpers.time.increase(60);
      for (let i = 0; i < 5; i++) {
        const buyer = await getWalletWithEthers();
        const currentBlock = await ethers.provider.getBlockNumber();
        const sig = await api.signMessage(ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
            buyer.address,
            0,
            1,
            100,
            currentBlock + 10,
            100
          ])
        ));
        const sig2 = await api.signMessage(ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
            buyer.address,
            1,
            1,
            10,
            currentBlock + 10,
            0
          ])
        ));
        await (await manager.connect(buyer).buyTickets(1, 100, currentBlock + 10, sig, { value: 100 })).wait();
        buyers.push(buyer);
        await expect(manager.connect(buyer).buyTickets(1, 10, currentBlock + 10, sig2)).to.be.revertedWithCustomError(
          manager,
          'TooManyTickets'
        );
        const { totalSpent, totalPurchased, withdrawn } = await manager.getParticipation(1, buyer.address);
        expect(totalSpent).to.eq(100);
        expect(totalPurchased).to.eq(100);
        expect(withdrawn).to.eq(false);
      }
    });

    it('Should not be able to purchase more tickets', async () => {
      const buyer = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      await expect(manager.connect(buyer).buyTickets(1, 10, currentBlock + 10, sig)).to.be.revertedWithCustomError(
        manager,
        'TooManyTickets'
      )
      buyers.push(buyer);
    });

    it('Should not be able to cancel the raffle', async () => {
      await helpers.time.increase(7200);
      await expect(manager.cancelRaffle(counterpartContractAddress, 1, 1)).to.be.revertedWithCustomError(
        manager,
        'TargetTicketsReached'
      );
    });

    it('Should not be able to fulfill randomness before requesting it', async () => {
      const tx = whileImpersonating(coordinator.address, ethers.provider, async (signer) =>
        manager.connect(signer).rawFulfillRandomWords(1, [randomWord()])
      );
      await expect(tx).to.be.revertedWithCustomError(manager, 'RequestNotFound');
    });

    it('Should be able to draw the winner', async () => {
      expect(await manager.shouldDrawRaffle(1)).to.eq(true);
      const tx = await manager.drawWinner(1);
      const { events } = await tx.wait();
      const requestSentEvent = events.find(e => e.event === 'RequestSent');
      const { requestId } = requestSentEvent.args;
      const { fulfilled, randomWord, raffleId } = await manager.getRequestStatus(requestId);
      await expect(manager.getWinner(1)).to.be.revertedWithCustomError(manager, 'RaffleNotFulfilled');
      expect(fulfilled).to.eq(false);
      expect(randomWord).to.eq(0);
      expect(raffleId).to.eq(1);
    });

    it('Should not be able to draw the winner a second time', async () => {
      await expect(manager.drawWinner(1)).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffle'
      );
    });

    it('Cannot purchase tickets after drawing', async () => {
      const buyer = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer.address,
          0,
          1,
          10,
          currentBlock + 10,
          0
        ])
      ));
      await expect(manager.connect(buyer).buyTickets(1, 10, currentBlock + 10, sig)).to.be.revertedWithCustomError(
        manager,
        'RaffleHasEnded'
      )
      buyers.push(buyer);
    });

    it('Cannot cancel after drawing', async () => {
      await expect(manager.cancelRaffle(counterpartContractAddress, 1, 1)).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffle'
      );
    });

    it('Should not unlock the funds until we guarantee that the winner can claim their prize', async () => {
      const balance = await ethers.provider.getBalance(manager.address);
      expect(balance).to.eq(500);
      await expect(manager.withdrawETH()).to.be.revertedWithCustomError(
        manager,
        'NothingToSend'
      );
    });

    it('Should not be able to propagate winner before randomness fulfillment', async () => {
      await expect(manager.propagateRaffleWinner(ethers.constants.AddressZero, 1, 1)).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffleStatus'
      );
    });

    it('Fulfills randomness', async () => {
      await (await link.mint(manager.address, ethers.utils.parseEther('100'))).wait();
      await (await coordinator.fulfillRandomWordsWithOverride(1, manager.address, [randomWord()])).wait();
    });

    it('Computes ticket numbers correclty', async () => {
      const raffle = await manager.getRaffle(1);
      const requestId = raffle.chainlinkRequestId;
      const { fulfilled, randomWord } = await manager.getRequestStatus(requestId);
      expect(fulfilled).to.eq(true);
      const ticketSupply = await tickets.supplyOf(1);
      expect(ticketSupply).to.eq(500);
      const winningTicket = randomWord.mod(ticketSupply).toNumber();
      let winner;
      let count = 0;
      for (const buyer of buyers) {
        count += 100;
        winner = buyer;
        if (count > winningTicket) break;
      }
      expect(await tickets.ownerOf(1, winningTicket)).to.eq(winner.address);
      expect(await manager.getWinner(1)).to.eq(winner.address);
    })

    it('Should not be able to propagate winner to null address', async () => {
      await expect(manager.propagateRaffleWinner(ethers.constants.AddressZero, 1, 1)).to.be.revertedWithCustomError(
        manager,
        'MissingCCIPParams'
      );
    });

    it('Should not be able to propagate winner to null chain', async () => {
      await expect(manager.propagateRaffleWinner(counterpartContractAddress, 0, 1)).to.be.revertedWithCustomError(
        manager,
        'MissingCCIPParams'
      );
    });

    it('Should be able to propagate when the winner is drawn', async () => {
      const { events } = await (await manager.propagateRaffleWinner(counterpartContractAddress, 1, 1)).wait();
      expect(events).to.have.lengthOf(3);
      const ccipEvent = ccipRouter.interface.parseLog(events[0]);
      expect(ccipEvent.args.chain).to.eq(1);
      expect(ccipEvent.args.receiver).to.eq('0x' + counterpartContractAddress.toLowerCase().slice(-40).padStart(64, '0'));
      expect(ccipEvent.args.data).to.have.lengthOf(108);
      const drawnWinner = ethers.utils.getAddress('0x' + ccipEvent.args.data.slice(-40));
      expect(buyers.find(b => b.address === drawnWinner)).to.not.be.undefined;
      expect(ccipEvent.args.data.slice(0, 68)).to.eq('0x010000000000000000000000000000000000000000000000000000000000000001');
    });

    it('Should not be able to propagate winner twice', async () => {
      await expect(manager.propagateRaffleWinner(ethers.constants.AddressZero, 1, 1)).to.be.revertedWithCustomError(
        manager,
        'InvalidRaffleStatus'
      );
    });

    it('Should not let non-admin withdraw', async () => {
      const wallet = await getWalletWithEthers();
      await expect(manager.connect(wallet).withdrawETH()).to.be.revertedWithCustomError(
        manager,
        'MissingRole'
      );
    });

    it('Fail when non-receiver contract withdraws', async () => {
      await (await manager.setRole(ccipRouter.address, 0, true)).wait();
      const tx = whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).withdrawETH()
      )
      await expect(tx).to.be.revertedWithCustomError(
        manager,
        'ETHTransferFail'
      );
    });

    it('Should unlock the funds and let the admin withdraw', async () => {
      const contractBalanceBefore = await ethers.provider.getBalance(manager.address);
      const adminBalanceBefore = await ethers.provider.getBalance(signers[0].address);
      const txReceipt = await (await manager.withdrawETH()).wait();
      const contractBalanceAfter = await ethers.provider.getBalance(manager.address);
      const adminBalanceAfter = await ethers.provider.getBalance(signers[0].address);
      expect(contractBalanceAfter).to.eq(0);
      expect(adminBalanceAfter).to.eq(
        adminBalanceBefore.add(contractBalanceBefore).sub(
          txReceipt.cumulativeGasUsed.mul(txReceipt.effectiveGasPrice)
        )
      );
    });

    it('Should not be able to withdraw more than balance of LINK', async () => {
      await expect(manager.withdrawTokens(link.address, 100)).to.be.revertedWithCustomError(
        manager,
        'InsufficientBalance'
      );
    });

    it('Should not be able to withdraw tokens as non-admin', async () => {
      await expect(manager.connect(signers[1]).withdrawTokens(link.address, 10)).to.be.revertedWithCustomError(
        manager,
        'MissingRole'
      );
    });

    it('Should be able to withdraw the balance of LINK', async () => {
      const balance = await link.balanceOf(manager.address);
      const startingBalance = await link.balanceOf(signers[0].address);
      const tx = await manager.connect(signers[0]).withdrawTokens(link.address, balance);
      const { events } = await tx.wait();
      expect(events).to.have.lengthOf(1);
      expect(await link.balanceOf(manager.address)).to.eq(0);
      expect(await link.balanceOf(signers[0].address)).to.eq(balance.add(startingBalance));
    });

    it('Sends prize unlock message when receiving prize locked for an existing raffle', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      await (await link.mint(manager.address, ethers.utils.parseEther('100'))).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x0000000000000000000000000000000000000000000000000000000000000001',
          destTokenAmounts: []
        })
      );
      const { events } = await tx.wait();
      const ccipMessage = events[0];
      expect(ccipMessage.address).to.eq(ccipRouter.address);
    })

    it('Early sold-out raffle', async () => {
      await (await manager.setCCIPCounterpart(counterpartContractAddress, 1, true)).wait();
      await (await link.mint(manager.address, ethers.utils.parseEther('100'))).wait();
      const tx = await whileImpersonating(ccipRouter.address, ethers.provider, async (signer) =>
        manager.connect(signer).ccipReceive({
          messageId: ethers.constants.HashZero,
          sourceChainSelector: 1,
          sender: '0x' + counterpartContractAddress.slice(-40).padStart(64, '0'),
          data: '0x0000000000000000000000000000000000000000000000000000000000000005',
          destTokenAmounts: []
        })
      );
      await tx.wait();
      const now = await blockTime();
      await (await manager.createRaffle(5, 0, now + 3600, 0, 100, 100,)).wait();
      const buyer = await getWalletWithEthers();
      const currentBlock = await ethers.provider.getBlockNumber();
      const nonce = await manager.getNonce(buyer.address);
      const sig = await api.signMessage(ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint16', 'uint256', 'uint256'], [
          buyer.address,
          nonce,
          5,
          100,
          currentBlock + 10,
          0
        ])
      ));
      await (await manager.connect(buyer).buyTickets(5, 100, currentBlock + 10, sig)).wait();
      const drawWinnerReceipt = await (await manager.drawWinner(5)).wait();
      const { requestId } = drawWinnerReceipt.events[1].args;
      await (await coordinator.fulfillRandomWordsWithOverride(requestId, manager.address, [randomWord()])).wait();
      expect(await manager.getWinner(5)).to.eq(buyer.address);
    });
  });
});
