import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("ERC4626", function () {
  let accounts: Signer[];
  let rewardToken: Contract;
  let tokenA: Contract;
  let erc4626: Contract;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy();
    await rewardToken.deployed();

    const TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();
    await tokenA.deployed();

    const ERC4626 = await ethers.getContractFactory("ERC4626");
    erc4626 = await ERC4626.deploy(
      rewardToken.address,
      tokenA.address,
      1 // reward per block
    );
    await erc4626.deployed();
  });

  it("should allow owner to deposit rewards", async function () {
    // mint and approve reward tokens
    await rewardToken.mint(accounts[0].getAddress(), 1000000);
    await rewardToken.approve(erc4626.address, 1000000);

    // deposit rewards
    await erc4626.depositRewards(1000000);

    // check contract balance
    expect(await rewardToken.balanceOf(erc4626.address)).to.equal(1000000);
  });

  it("should allow users to stake and earn rewards", async function () {
    // mint and approve reward tokens
    await rewardToken.mint(accounts[0].getAddress(), 1000000);
    await rewardToken.approve(erc4626.address, 1000000);

    // deposit rewards
    await erc4626.depositRewards(1000000);
    // mint and approve token A
    await tokenA.mint(accounts[1].getAddress(), 100);

    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);
    // stake token A
    await erc4626.connect(accounts[1]).stake(100);

    // mine some blocks
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // check earned rewards
    expect(await erc4626.earned(await accounts[1].getAddress())).to.equal(10);

    // withdraw token A and claim rewards
    await erc4626.connect(accounts[1]).withdraw(100);

    await erc4626.connect(accounts[1]).getReward();
    // check balances
    expect(await tokenA.balanceOf(await accounts[1].getAddress())).to.equal(
      100
    );
    expect(
      await rewardToken.balanceOf(await accounts[1].getAddress())
    ).to.equal(11);
  });

  it("should allow users to withdraw staked tokens", async function () {
    // mint and approve token A
    await tokenA.mint(accounts[1].getAddress(), 100);
    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);

    // stake token A
    await erc4626.connect(accounts[1]).stake(100);

    // check staked balance
    expect(await erc4626.staked(await accounts[1].getAddress())).to.equal(100);

    // withdraw token A
    await erc4626.connect(accounts[1]).withdraw(100);

    // check staked balance and token A balance
    expect(await erc4626.staked(await accounts[1].getAddress())).to.equal(0);
    expect(await tokenA.balanceOf(await accounts[1].getAddress())).to.equal(
      100
    );
  });

  it("should allow users to claim earned rewards", async function () {
    // mint and approve reward tokens
    await rewardToken.mint(accounts[0].getAddress(), 1000000);
    await rewardToken.approve(erc4626.address, 1000000);

    // deposit rewards
    await erc4626.depositRewards(1000000);

    // mint and approve token A
    await tokenA.mint(accounts[1].getAddress(), 100);
    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);

    // stake token A
    await erc4626.connect(accounts[1]).stake(100);

    // mine some blocks
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // check earned rewards
    expect(await erc4626.earned(await accounts[1].getAddress())).to.equal(10);

    // claim rewards
    await erc4626.connect(accounts[1]).getReward();

    // check reward balance and contract balance
    expect(
      await rewardToken.balanceOf(await accounts[1].getAddress())
    ).to.equal(11);
    expect(await rewardToken.balanceOf(erc4626.address)).to.equal(999989);
  });

  it("should update reward accounting correctly", async function () {
    // mint and approve reward tokens
    await rewardToken.mint(accounts[0].getAddress(), 1000000);
    await rewardToken.approve(erc4626.address, 1000000);
  
    // deposit rewards
    await erc4626.depositRewards(1000000);
  
    // mint and approve token A
    await tokenA.mint(accounts[1].getAddress(), 100);
    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);
  
    // stake token A
    await erc4626.connect(accounts[1]).stake(100);
  
    // mine some blocks
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine", []);
    }
  
    await erc4626.earned(await accounts[1].getAddress());

    // check reward per token stored
    expect(await erc4626.rewardPerTokenStored()).to.equal(10);
  
    // stake more token A (triggers updateReward)
    await erc4626.connect(accounts[1]).stake(100);
  
    // check reward per token stored and user rewards
    expect(await erc4626.rewardPerTokenStored()).to.equal(10);
  });

  it("should handle edge cases correctly", async function () {
    // mint and approve token A
    await tokenA.mint(accounts[1].getAddress(), 100);
    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);

    // try to stake 0 tokens
    await expect(erc4626.connect(accounts[1]).stake(0)).to.be.revertedWith(
      "Cannot stake 0"
    );

    // stake token A
    await erc4626.connect(accounts[1]).stake(100);

    // try to withdraw 0 tokens
    await expect(erc4626.connect(accounts[1]).withdraw(0)).to.be.revertedWith(
      "Cannot withdraw 0"
    );

    // try to claim rewards when there are no earned rewards
    await expect(erc4626.connect(accounts[1]).getReward()).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    );
  });
});
