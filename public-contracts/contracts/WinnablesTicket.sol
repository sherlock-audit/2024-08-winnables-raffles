// SPDX-License-Identifier: UNLICENSED
// Based on OpenZeppelin's ERC1155 v4.8.0

pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IWinnablesTicket.sol";
import "./Roles.sol";

/// @title Winnables Ticket
/// @notice non transferable ERC1155 Tickets
contract WinnablesTicket is Roles, IWinnablesTicket {
  using Address for address;
  using Strings for uint256;

  /// @dev owner of the ERC1155 collection (for Admin rights on marketplace websites and metadata update)
  address public owner;

  /// @dev Mapping from Raffle ID to mapping from address to balance (tickets owned by this address for this Raffle)
  mapping(uint256 => mapping(address => uint256)) private _balances;

  /// @dev Mapping from Raffle ID to the current ticket supply
  mapping(uint256 => uint256) private _supplies;

  /// @dev Mapping From Raffle ID to Ownership mapping
  ///      The ownership mapping maps a first ticket ID to its owner (ERC721A style ownership)
  mapping(uint256 => mapping(uint256 => address)) private _ticketOwnership;

  /// @dev baseURI for tokens
  string private _uri;

  /// @dev Contract constructor
  constructor() {
    _setRole(msg.sender, 0, true);
    owner = msg.sender;
  }

  modifier onlyOwner() {
    if (msg.sender != owner) {
      revert CallerNotContractOwner();
    }
    _;
  }

  // =============================================================
  // -- Public Views
  // =============================================================

  /// @notice (Public) Metadata URI of a given token
  /// @param tokenId the ID of the token
  /// @return The URI of the Metadata for this token
  function uri(uint256 tokenId) public view override returns (string memory) {
    return string(abi.encodePacked(_uri, tokenId.toString()));
  }

  /// @notice (Public) Get the balance of tickets for a given Raffle ID by a given account
  /// @param account Address of the account
  /// @param id ID of the Raffle
  /// @return The Number of tickets owned by the account for that Raffle
  function balanceOf(address account, uint256 id) external view override returns (uint256) {
    return _balances[id][account];
  }

  /// @notice (Public) Get the balances of tickets for given Raffle IDs by given Accounts
  /// @param accounts List of accounts to get the balance for
  /// @param ids List of matching IDs to get the balance of
  /// @return List of ticket balances for each account and Raffle ID pair
  function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
  external
  view
  override
  returns (uint256[] memory)
  {
    if (accounts.length != ids.length) {
      revert InconsistentParametersLengths();
    }
    uint256[] memory batchBalances = new uint256[](accounts.length);

    for (uint256 i = 0; i < accounts.length; ++i) {
      batchBalances[i] = _balances[ids[i]][accounts[i]];
    }

    return batchBalances;
  }

  /// @notice (Public) Get the owner of a given Ticket
  /// @param id ID of the Raffle
  /// @param ticketId the Number of the ticket
  function ownerOf(uint256 id, uint256 ticketId) public view returns (address) {
    if (ticketId >= _supplies[id]) {
      revert InexistentTicket();
    }
    while (_ticketOwnership[id][ticketId] == address(0)) {
      unchecked { --ticketId; }
    }
    return _ticketOwnership[id][ticketId];
  }

  /// @notice ERC165 Interface check function
  /// @param interfaceId ID of the interface
  /// @return True if the contract supports this interface
  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return
      interfaceId == type(IWinnablesTicket).interfaceId ||
      interfaceId == type(IERC1155).interfaceId ||
      interfaceId == type(IERC1155MetadataURI).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  /// @notice (Public) Get the total number of existing tickets for a given Raffle ID
  /// @param id ID of the Raffle
  /// @return Total number of existing tickets for that Raffle
  function supplyOf(uint256 id) external view returns(uint256) {
    return _supplies[id];
  }

  /// @notice Approvals aren't supported in this collection
  function isApprovedForAll(address, address) external pure override returns (bool) {
    return false;
  }

  // =============================================================
  // -- Public functions
  // =============================================================

  /// @notice Approvals aren't supported in this collection
  function setApprovalForAll(address, bool) external pure override {
    revert NotImplemented();
  }

  /// @notice Transfers aren't supported in this collection
  function safeTransferFrom(
    address,
    address,
    uint256,
    uint256,
    bytes calldata
  ) external pure override {
    revert NotImplemented();
  }

  /// @notice Transfers aren't supported in this collection
  function safeBatchTransferFrom(
    address,
    address,
    uint256[] calldata,
    uint256[] calldata,
    bytes calldata
  ) external pure override {
    revert NotImplemented();
  }

  /// @notice Update Metadata URI
  function refreshMetadata(uint256 tokenId) external {
    emit URI(uri(tokenId), tokenId);
  }

  // =============================================================
  // -- Admin functions
  // =============================================================

  /// @notice (Owner) Update Token URI
  function setURI(string memory newuri) external onlyOwner {
    _uri = newuri;
  }

  /// @notice (Owner) Transfer contract ownership (only for Marketplace admin rights)
  /// @param newOwner Address of the new owner account
  function transferOwnership(address newOwner) external onlyOwner {
    owner = newOwner;
    emit OwnershipTransferred(msg.sender, newOwner);
  }

  /// @notice (Winnable Contract) Mint Raffle tickets
  /// @param to Mint to
  /// @param id Raffle ID for which the tickets are minted
  /// @param amount Number of tickets to mint
  function mint(address to, uint256 id, uint256 amount) external onlyRole(1) {
    if (to == address(0)) {
      revert TransferToAddressZero();
    }
    address operator = msg.sender;
    uint256 startId = _supplies[id];

    unchecked {
      _balances[id][to] += amount;
      _supplies[id] = startId + amount;
    }

    _ticketOwnership[id][startId] = to;
    emit NewTicket(id, startId, amount);
    emit TransferSingle(operator, address(0), to, id, amount);

    _doSafeTransferAcceptanceCheck(operator, address(0), to, id, amount);
  }

  /// @notice Batch mint Raffle tickets is not implemented
  /// @param to Mint to
  /// @param ids List of Raffle ID for which the tickets are minted
  /// @param amounts List of quantities of tickets to mint for the corresponsing ids
  function batchMint(
    address to,
    uint256[] calldata ids,
    uint256[] calldata amounts
  ) external {
    revert NotImplemented();
  }

  // =============================================================
  // -- Internal functions
  // =============================================================

  /// @dev If the recipient of a ticket is a contract, check that it is a valid receiver
  function _doSafeTransferAcceptanceCheck(
    address operator,
    address from,
    address to,
    uint256 id,
    uint256 amount
  ) private {
    if (to.isContract()) {
      try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, "") returns (bytes4 response) {
        if (response != IERC1155Receiver.onERC1155Received.selector) {
          revert TransferRejected();
        }
      } catch {
        revert TransferRejected();
      }
    }
  }
}
