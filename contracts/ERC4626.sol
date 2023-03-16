// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Tokens.sol";

contract ERC4626 is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public rewardToken;
    IERC20 public tokenA;
    VaultToken public vaultToken;
    uint256 public rewardPerBlock;
    uint256 public lastUpdateBlock;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;
    uint256 public vaultTokenMultiplier;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public staked;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(
        address _rewardToken,
        address _tokenA,
        address _vaultToken,
        uint256 _vaultTokenMultiplier,
        uint256 _rewardPerBlock
    ) {
        rewardToken = IERC20(_rewardToken);
        tokenA = IERC20(_tokenA);
        vaultToken = VaultToken(_vaultToken);
        vaultTokenMultiplier = _vaultTokenMultiplier;
        rewardPerBlock = _rewardPerBlock;
        lastUpdateBlock = block.number;
    }

    function stake(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalStaked += amount;
        staked[msg.sender] += amount;
        tokenA.safeTransferFrom(msg.sender, address(this), amount);
        mintVaultTokens(msg.sender, amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(
            vaultToken.balanceOf(msg.sender) >= amount,
            "Insufficient vault token balance"
        );
        vaultToken.burnFrom(msg.sender, amount);
        totalStaked -= amount;
        staked[msg.sender] -= amount;
        tokenA.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function depositRewards(uint256 amount) public onlyOwner {
        require(amount > 0, "Cannot deposit 0");
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function mintVaultTokens(address user, uint256 amount) private {
        require(vaultTokenMultiplier > 0, "Vault token multiplier not set");
        uint256 adjustedAmount = amount * vaultTokenMultiplier;
        vaultToken.mint(user, adjustedAmount);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateBlock = block.number;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((block.number - lastUpdateBlock) * rewardPerBlock * 1e18) /
                totalStaked);
    }

    function earned(address account) public view returns (uint256) {
        return
            ((staked[account] *
                (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) +
            rewards[account];
    }

    function refreshRewards() public updateReward(msg.sender) {}

    // todo: implement pause() and timeLock()
}
