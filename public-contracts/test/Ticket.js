const { ethers } = require('hardhat');
const { expect } = require('chai');
const { oneHundredLink, formatBytes } = require('./common/chainlink');

const { whileImpersonating } = require('../utils/impersonate');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

describe('Winnables Tickets', () => {
  let signers;
  let manager;
  let ticket;
  let link;
  let snapshot;

  before(async () => {
    signers = await ethers.getSigners();
    const linkFactory = await ethers.getContractFactory('MockLink');
    link = await linkFactory.deploy();
    await link.deployed();

    await link.mint(signers[0].address, oneHundredLink.mul(10));

    const TicketFactory = await ethers.getContractFactory(
      'WinnablesTicket',
    );
    ticket = await TicketFactory.deploy();
    await ticket.deployed();
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
        ticket.supportsInterface('0xefa07c25'),
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
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    });

    after(async () => {
      await snapshot.restore();
    });

    it('Doesn\'t accept manager deployed by non-owner', async () => {
      const WinnablesTicketManagerFactory = await ethers.getContractFactory(
        'WinnablesTicketManager',
        signers[3],
      );
      const tx = WinnablesTicketManagerFactory.deploy(
        link.address,
        link.address,
        0,
        ethers.constants.HashZero,
        ticket.address,
        ticket.address
      );
      await expect(tx).to.be.revertedWithCustomError(ticket, 'NotOwnerOrigin');
    });

    it('Accept manager deployed by owner', async () => {
      const WinnablesTicketManagerFactory = await ethers.getContractFactory(
        'WinnablesTicketManager',
      );
      manager = await WinnablesTicketManagerFactory.deploy(
        link.address,
        link.address,
        0,
        ethers.constants.HashZero,
        ticket.address,
        ticket.address
      );
      await manager.deployed();

      await (await manager.setRole(signers[0].address, 1, true)).wait();
      await (await manager.setRole(signers[1].address, 1, true)).wait();
    });

    it('Cannot initialize twice', async () => {
      const WinnablesTicketManagerFactory = await ethers.getContractFactory(
        'WinnablesTicketManager',
      );
      const tx = WinnablesTicketManagerFactory.deploy(
        link.address,
        link.address,
        0,
        ethers.constants.HashZero,
        ticket.address,
        ticket.address
      );
      await expect(tx).to.be.revertedWithCustomError(ticket, 'AlreadyInitialized');
    });

    it('Doesn\'t support batch mint', async () => {
      await expect(ticket.batchMint(signers[0].address, [1], [1])).to.be.revertedWithCustomError(
        ticket,
        'NotImplemented'
      );
    });

    it('Doesn\'t mint except if called by the manager', async () => {
      await expect(ticket.mint(ethers.constants.AddressZero, 1, 1)).to.be.revertedWithCustomError(
        ticket,
        'NotTicketManager'
      );
    });

    it('Mints tickets to regular address', async () => {
      const tx = await whileImpersonating(manager.address, ethers.provider, async (signer) =>
        ticket.connect(signer).mint(signers[1].address, 1, 1)
      );
      const { events } = await tx.wait();
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
    before(async () => {
      const WinnablesTicketManagerFactory = await ethers.getContractFactory(
        'WinnablesTicketManager',
      );
      manager = await WinnablesTicketManagerFactory.deploy(
        link.address,
        link.address,
        0,
        ethers.constants.HashZero,
        ticket.address,
        ticket.address
      );
      await manager.deployed();

      await (await manager.setRole(signers[0].address, 1, true)).wait();
      await (await manager.setRole(signers[1].address, 1, true)).wait();
    });

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
