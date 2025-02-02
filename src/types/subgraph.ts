import { constants, ethers } from 'ethers';

export interface IBalances {
	balance: ethers.BigNumber;
	allocatedTokens: ethers.BigNumber;
	claimed: ethers.BigNumber;
	rewardPerTokenPaidGivLm: ethers.BigNumber;
	rewardsGivLm: ethers.BigNumber;
	rewardPerTokenPaidSushiSwap: ethers.BigNumber;
	rewardsSushiSwap: ethers.BigNumber;
	rewardPerTokenPaidHoneyswap: ethers.BigNumber;
	rewardsHoneyswap: ethers.BigNumber;
	rewardPerTokenPaidBalancer: ethers.BigNumber;
	rewardsBalancer: ethers.BigNumber;
	rewardPerTokenPaidUniswapV2GivDai: ethers.BigNumber;
	rewardsUniswapV2GivDai: ethers.BigNumber;
	givback: ethers.BigNumber;
	givbackLiquidPart: ethers.BigNumber;
	balancerLp: ethers.BigNumber;
	balancerLpStaked: ethers.BigNumber;
	uniswapV2GivDaiLp: ethers.BigNumber;
	uniswapV2GivDaiLpStaked: ethers.BigNumber;
	sushiswapLp: ethers.BigNumber;
	sushiSwapLpStaked: ethers.BigNumber;
	honeyswapLp: ethers.BigNumber;
	honeyswapLpStaked: ethers.BigNumber;
	givStaked: ethers.BigNumber;
	allocationCount: number;
	givDropClaimed: boolean;

	foxAllocatedTokens: ethers.BigNumber;
	foxClaimed: ethers.BigNumber;
	rewardPerTokenPaidFoxHnyLm: ethers.BigNumber;
	rewardsFoxHnyLm: ethers.BigNumber;
	foxHnyLp: ethers.BigNumber;
	foxHnyLpStaked: ethers.BigNumber;
}
export const ZeroBalances: IBalances = {
	balance: constants.Zero,
	allocatedTokens: constants.Zero,
	claimed: constants.Zero,
	rewardPerTokenPaidGivLm: constants.Zero,
	rewardsGivLm: constants.Zero,
	rewardPerTokenPaidSushiSwap: constants.Zero,
	rewardsSushiSwap: constants.Zero,
	rewardPerTokenPaidHoneyswap: constants.Zero,
	rewardsHoneyswap: constants.Zero,
	rewardPerTokenPaidBalancer: constants.Zero,
	rewardsBalancer: constants.Zero,
	rewardPerTokenPaidUniswapV2GivDai: constants.Zero,
	rewardsUniswapV2GivDai: constants.Zero,
	givback: constants.Zero,
	givbackLiquidPart: constants.Zero,
	balancerLp: constants.Zero,
	balancerLpStaked: constants.Zero,
	uniswapV2GivDaiLp: constants.Zero,
	uniswapV2GivDaiLpStaked: constants.Zero,
	sushiswapLp: constants.Zero,
	sushiSwapLpStaked: constants.Zero,
	honeyswapLp: constants.Zero,
	honeyswapLpStaked: constants.Zero,
	givStaked: constants.Zero,
	allocationCount: 0,
	givDropClaimed: false,

	foxAllocatedTokens: constants.Zero,
	foxClaimed: constants.Zero,
	rewardPerTokenPaidFoxHnyLm: constants.Zero,
	rewardsFoxHnyLm: constants.Zero,
	foxHnyLp: constants.Zero,
	foxHnyLpStaked: constants.Zero,
};

export interface ITokenAllocation {
	amount: ethers.BigNumber;
	distributor: string;
	recipient: string;
	timestamp: string;
	txHash: string;
}

export interface ITokenDistroInfo {
	contractAddress: string;
	initialAmount: ethers.BigNumber;
	lockedAmount: ethers.BigNumber;
	totalTokens: ethers.BigNumber;
	startTime: Date;
	cliffTime: Date;
	endTime: Date;
}

export interface IUnipool {
	totalSupply: ethers.BigNumber;
	lastUpdateTime: number;
	periodFinish: number;
	rewardPerTokenStored: ethers.BigNumber;
	rewardRate: ethers.BigNumber;
}

export interface IUniswapV3Position {
	tokenId: number;
	token0: string;
	token1: string;
	liquidity: ethers.BigNumber;
	tickLower: number;
	tickUpper: number;
	owner: string;
	staker: string | null;
	staked: boolean;
}

export interface IInfinitePositionReward {
	lastRewardAmount: ethers.BigNumber;
	lastUpdateTimeStamp: number;
}

export interface IUniswapV3Pool {
	token0: string;
	token1: string;
	sqrtPriceX96: ethers.BigNumber;
	tick: number;
	liquidity: ethers.BigNumber;
}

export interface IUniswapV2Pair {
	token0: string;
	token1: string;
	reserve0: ethers.BigNumber;
	reserve1: ethers.BigNumber;
}
