// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    constructor() ERC20("RewardToken", "RWT") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

contract TokenA is ERC20, Ownable {
    constructor() ERC20("TokenA", "TKA") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}