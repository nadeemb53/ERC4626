import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("ERC4626", function () {
  let accounts: Signer[];
  let rewardToken: Contract;
  let tokenA: Contract;
  let vaultToken: Contract;
  let erc4626: Contract;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy();
    await rewardToken.deployed();

    const TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();
    await tokenA.deployed();

    const VaultToken = await ethers.getContractFactory("VaultToken");
    vaultToken = await VaultToken.deploy();
    await vaultToken.deployed();

    const ERC4626 = await ethers.getContractFactory("ERC4626");
    erc4626 = await ERC4626.deploy(
      rewardToken.address,
      tokenA.address,
      vaultToken.address,
      1, // ratio of vault tokens per token A deposited
      1 // reward per block
    );
    await erc4626.deployed();
    await vaultToken.transferOwnership(erc4626.address);
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
    await vaultToken.connect(accounts[1]).approve(erc4626.address, 100);
    await erc4626.connect(accounts[1]).withdraw(100);

    await erc4626.connect(accounts[1]).getReward();
    // check balances
    expect(await tokenA.balanceOf(await accounts[1].getAddress())).to.equal(
      100
    );
    expect(
      await rewardToken.balanceOf(await accounts[1].getAddress())
    ).to.equal(12);
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
    await vaultToken.connect(accounts[1]).approve(erc4626.address, 100);
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

  it("should simulate three users staking scenario", async function () {
    // --- initial setup ---

    // mint and approve reward tokens
    await rewardToken.mint(accounts[0].getAddress(), 1000000);
    await rewardToken.approve(erc4626.address, 1000000);

    // deposit rewards
    await erc4626.depositRewards(1000000);
    // deposit vault tokens
    // await erc4626.depositVaultTokens("1000000000000000000");

    // mint and approve token A for User 1
    await tokenA.mint(accounts[1].getAddress(), 100);
    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);

    // mint and approve token A for User 2
    await tokenA.mint(accounts[2].getAddress(), 200);
    await tokenA.connect(accounts[2]).approve(erc4626.address, 200);

    // mint and approve token A for User 3
    await tokenA.mint(accounts[3].getAddress(), 100);
    await tokenA.connect(accounts[3]).approve(erc4626.address, 100);

    // ---- simulation ----

    // user 1 deposits 100 tokens and receives 100 vault tokens
    await erc4626.connect(accounts[1]).stake(100);
    expect(await vaultToken.balanceOf(await accounts[1].getAddress())).to.equal(
      100
    );

    console.log(await ethers.provider.getBlockNumber());

    // user 2 deposits 200 tokens and received 200 vault tokens
    await erc4626.connect(accounts[2]).stake(200);
    expect(await vaultToken.balanceOf(await accounts[2].getAddress())).to.equal(
      200
    );
    console.log(await ethers.provider.getBlockNumber());

    // mine 100 blocks
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    console.log(await ethers.provider.getBlockNumber());
    // user 2 checks earned rewards
    expect(await erc4626.earned(await accounts[2].getAddress())).to.equal(66);

    // user 1 withdraws 100 tokens
    await vaultToken.connect(accounts[1]).approve(erc4626.address, 100);
    await erc4626.connect(accounts[1]).withdraw(100);
    // expect 100 vault tokens to be burnt
    expect(await vaultToken.balanceOf(await accounts[1].getAddress())).to.equal(
      0
    );

    // user 1 invokes rewards withdrawal
    await erc4626.connect(accounts[1]).getReward();

    expect(
      await rewardToken.balanceOf(await accounts[1].getAddress())
    ).to.equal(35); // fix this
    console.log(await ethers.provider.getBlockNumber());

    // mine 100 blocks
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    console.log(await ethers.provider.getBlockNumber());

    // user 2 checks earned rewards
    expect(await erc4626.earned(await accounts[2].getAddress())).to.equal(169);

    // user 3 deposits 100 tokens and received 100 vault tokens
    await erc4626.connect(accounts[3]).stake(100);
    expect(await vaultToken.balanceOf(await accounts[3].getAddress())).to.equal(
      100
    );

    // mine 100 blocks
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // user 2 checks earned rewards
    expect(await erc4626.earned(await accounts[2].getAddress())).to.equal(236);

    // user 3 checks earned rewards
    expect(await erc4626.earned(await accounts[3].getAddress())).to.equal(33);
  });
});
