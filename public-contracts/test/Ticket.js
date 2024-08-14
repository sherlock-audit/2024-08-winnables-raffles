const { ethers } = require('hardhat');
const { expect } = require('chai');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

const {
  getWalletWithEthers, blockTime, timeSeconds,
} = require('./common/utils');
const { ccipDeployTicketManager } = require('../utils/demo');
const { whileImpersonating } = require('../utils/impersonate');
const { BigNumber } = require('ethers');
const {sign} = require('node:crypto');

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

describe('CCIP Ticket Manager', () => {
  let signers;
  let manager;
  let ticket;
  let winnablesDeployer;

  before(async () => {
    signers = await ethers.getSigners();
    const result = await ccipDeployTicketManager();
    winnablesDeployer = signers[0];
    manager = result.ticketManager;
    ticket = result.ticket;
  });

  describe('Initializes correctly', () => {
    it('Has correct owner', async () => {
      expect(await ticket.owner()).to.eq(signers[0].address);
    });

    it('Returns URI', async () => {
      const basicURI = await ticket.uri(1);
      expect(basicURI).to.eq('1');
    });

    it('Supports interfaces', async () => {
      const [
        supportsTicket,
        supportsERC1155,
        supportsERC1155Metadata,
        supportsERC165,
        supportsRandomStuff,
      ] = await Promise.all([
        ticket.supportsInterface('0x9141187b'),
        ticket.supportsInterface('0xd9b67a26'),
        ticket.supportsInterface('0x0e89341c'),
        ticket.supportsInterface('0x01ffc9a7'),
        ticket.supportsInterface('0x01fec9a7'),
      ]);
      expect(supportsTicket).to.eq(true);
      expect(supportsERC1155).to.eq(true);
      expect(supportsERC1155Metadata).to.eq(true);
      expect(supportsERC165).to.eq(true);
      expect(supportsRandomStuff).to.eq(false);
    });
  });

  describe('Ticket behaviour', () => {
    it('Doesn\'t support batch mint', async () => {
      await expect(ticket.batchMint(signers[0].address, [1], [1])).to.be.revertedWithCustomError(
        ticket,
        'NotImplemented'
      );
    });

    it('Doesn\'t mint to address zero', async () => {
      await (await ticket.setRole(signers[0].address, 1, true)).wait();
      await expect(ticket.mint(ethers.constants.AddressZero, 1, 1)).to.be.revertedWithCustomError(
        ticket,
        'TransferToAddressZero'
      );
    });

    it('Mints tickets to regular address', async () => {
      await (await ticket.setRole(signers[0].address, 1, true)).wait();
      const { events } = await (await ticket.mint(signers[1].address, 1, 1)).wait();
      expect(events).to.have.lengthOf(2);
      expect(events[0].event).to.eq('NewTicket');
      expect(events[1].event).to.eq('TransferSingle');
    })

    it('Doesn\'t support transfers', async () => {
      expect(ticket.safeTransferFrom(
        signers[0].address,
        signers[1].address,
        0,
        0,
        []
      )).to.be.revertedWithCustomError(
        ticket,
        'NotImplemented'
      );
      expect(ticket.safeBatchTransferFrom(
        signers[0].address,
        signers[1].address,
        [0],
        [0],
        []
      )).to.be.revertedWithCustomError(ticket, 'NotImplemented');
    });

    it('Doesn\'t support approvals', async () => {
      expect(ticket.setApprovalForAll(
        signers[1].address,
        true
      )).to.be.revertedWithCustomError(
        ticket,
        'NotImplemented'
      );
      expect(await ticket.isApprovedForAll(
        signers[0].address,
        signers[1].address,
      )).to.eq(false);
    });

    it('Supports ownership query for ticket numbers', async () => {
      const ticketOwner = await ticket.ownerOf(1, 0);
      expect(ticketOwner).to.eq(signers[1].address);
    });

    it('Supports checks for ticket number existence', async () => {
      await expect(ticket.ownerOf(1, 1)).to.be.revertedWithCustomError(ticket, 'InexistentTicket');
    })

    it('Supports balance queries', async () => {
      expect(await ticket.balanceOf(signers[0].address, 1)).to.eq(0);
      expect(await ticket.balanceOf(signers[1].address, 1)).to.eq(1);
      await expect(ticket.balanceOfBatch([signers[1].address], [1, 2])).to.be.revertedWithCustomError(
        ticket,
        'InconsistentParametersLengths'
      );
      const balances = await ticket.balanceOfBatch([signers[1].address], [1]);
      expect(balances).to.have.lengthOf(1);
      expect(balances[0]).to.eq(1);
    });
  });

  describe('Ownership and admin functions', () => {
    it('Transfers ownership', async () => {
      const { events } = await (await ticket.transferOwnership(signers[1].address)).wait();
      expect(events).to.have.lengthOf(1);
      const { previousOwner, newOwner } = events.pop().args;
      expect(previousOwner).to.eq(signers[0].address);
      expect(newOwner).to.eq(signers[1].address);
      expect(await ticket.owner()).to.eq(signers[1].address);
      expect(ticket.transferOwnership(signers[1].address)).to.be.revertedWithCustomError(
        ticket,
        'CallerNotContractOwner'
      );
      await (await ticket.connect(signers[1]).transferOwnership(signers[0].address)).wait();
    });

    it('Sets URI', async () => {
      await expect(ticket.connect(signers[1]).setURI('http://localhost/')).to.be.revertedWithCustomError(
        ticket,
        'CallerNotContractOwner'
      );
      await (await ticket.connect(signers[0]).setURI('http://localhost/')).wait();
      expect(await ticket.uri(1)).to.eq('http://localhost/1');
    });
  });
});
