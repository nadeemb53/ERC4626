import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Simulate three users staking scenario", () => {
  let accounts: Signer[];
  let rewardToken: Contract;
  let tokenA: Contract;
  let vaultToken: Contract;
  let erc4626: Contract;

  it("should do initial setup for simulation", async () => {
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

  it("should let owner deposit reward token", async () => {
    // mint and approve reward tokens
    await rewardToken.mint(accounts[0].getAddress(), 1000000);
    await rewardToken.approve(erc4626.address, 1000000);

    // deposit rewards
    await erc4626.depositRewards(1000000);
  });

  it("should let user 1, user 2 and user 3 approve staking", async () => {
    // mint and approve token A for User 1
    await tokenA.mint(accounts[1].getAddress(), 100);
    await tokenA.connect(accounts[1]).approve(erc4626.address, 100);

    // mint and approve token A for User 2
    await tokenA.mint(accounts[2].getAddress(), 200);
    await tokenA.connect(accounts[2]).approve(erc4626.address, 200);

    // mint and approve token A for User 3
    await tokenA.mint(accounts[3].getAddress(), 100);
    await tokenA.connect(accounts[3]).approve(erc4626.address, 100);
  });

  it("should let user 1 deposit 100 tokens and receive 100 vault tokens", async () => {
    await erc4626.connect(accounts[1]).stake(100);
    expect(await vaultToken.balanceOf(await accounts[1].getAddress())).to.equal(
      100
    );
  });

  it("should let user 2 deposit 200 tokens and receive 200 vault tokens", async () => {
    await erc4626.connect(accounts[2]).stake(200);
    expect(await vaultToken.balanceOf(await accounts[2].getAddress())).to.equal(
      200
    );
  });

  it("should mine 100 blocks and check User 2's earned rewards without withdrawal", async () => {
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    // user 2 checks earned rewards
    expect(await erc4626.earned(await accounts[2].getAddress())).to.equal(66);
  });

  it("should let User 1 withdraw their deposit and check if their vault tokens are burnt", async () => {
    // user 1 withdraws 100 tokens
    await vaultToken.connect(accounts[1]).approve(erc4626.address, 100);
    await erc4626.connect(accounts[1]).withdraw(100);
    // expect 100 vault tokens to be burnt
    expect(await vaultToken.balanceOf(await accounts[1].getAddress())).to.equal(
      0
    );
  });

  it("should let User 1 collect their rewards from staking and check their reward token balance", async () => {
    await erc4626.connect(accounts[1]).getReward();

    expect(
      await rewardToken.balanceOf(await accounts[1].getAddress())
    ).to.equal(35); // fix this
  });

  it("should mine another 100 blocks and check User 2's earned rewards", async () => {
    // mine 100 blocks
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    // user 2 checks earned rewards
    expect(await erc4626.earned(await accounts[2].getAddress())).to.equal(169);
  });

  it("should let User 3 deposit 100 tokens and receive 100 vault tokens", async () => {
    await erc4626.connect(accounts[3]).stake(100);
    expect(await vaultToken.balanceOf(await accounts[3].getAddress())).to.equal(
      100
    );
  });

  it("should mine another 100 blocks and check rewards for User 2 and 3", async () => {
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
