// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

interface IWinnablesTicket is IERC1155MetadataURI {

  error QueryForAddressZero();
  error InconsistentParametersLengths();
  error Unauthorized();
  error TransferToAddressZero();
  error InsufficientBalance();
  error TransferRejected();
  error NoOp();
  error InexistentTicket();
  error CallerNotContractOwner();
  error NotImplemented();

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  event NewTicket(uint256 indexed id, uint256 indexed startId, uint256 indexed amount);

  function manager() external view returns(address);
  function supplyOf(uint256 raffleId) external view returns(uint256);
  function ownerOf(uint256 raffleId, uint256 ticketNumner) external view returns(address);
  function mint(address to, uint256 raffleId, uint256 amount) external;
  function refreshMetadata(uint256 tokenId) external;
  function initializeManager() external;

  function batchMint(
    address to,
    uint256[] calldata raffleId,
    uint256[] calldata amount
  ) external;
}
