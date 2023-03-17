## ERC4626

`ERC4626` is a solidity contract that allows users to stake a token (`TokenA`) and earn rewards in another token (`RewardToken`) over time. They receive X amount of `VaultTokens` based on their deposit, which they can burn on withdrawal.

### Usage

To use the contract, users must first approve the contract to spend their token A. They can then call the `stake` function to stake their token A and start earning rewards.

Users can check their earned rewards by calling the `earned` function. They can claim their earned rewards by calling the `getReward` function.

Users can also withdraw their staked token A by calling the `withdraw` function.

### Tests

The contract includes a test suite that checks its functionality. To run the tests:

```shell
npm install
npx hardhat test
```

The test suite includes a simulation of a scenario and tests for depositing rewards, staking and withdrawing token A, claiming earned rewards and handling edge cases.

![Passing tests image](https://i.imgur.com/ca1du99.png)
