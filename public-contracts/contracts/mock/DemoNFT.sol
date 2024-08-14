// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DemoNFT is ERC721, Ownable {
    uint256 private _counter;
    string private _uri;

    constructor() ERC721("DemoNFT", "DEMO") {}

    function mint(address to) public onlyOwner {
        _counter++;
        _mint(to, _counter);
    }

    function totalSupply() external view returns(uint256) {
        return _counter;
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        _uri = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _uri;
    }
}
