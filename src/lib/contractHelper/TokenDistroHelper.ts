import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { Zero } from '@ethersproject/constants';
import { getNowUnixMS } from '@/helpers/time';
import { IBalances, ITokenDistroInfo } from '@/types/subgraph';
import { StreamType } from '@/types/config';

export class TokenDistroHelper {
	public readonly contractAddress: string;
	public readonly initialAmount: ethers.BigNumber;
	public readonly lockedAmount: ethers.BigNumber;
	public readonly totalTokens: ethers.BigNumber;
	public readonly startTime: Date;
	public readonly cliffTime: Date;
	public readonly endTime: Date;
	public readonly duration: number;

	constructor(
		{
			contractAddress,
			initialAmount,
			lockedAmount,
			totalTokens,
			startTime,
			cliffTime,
			endTime,
		}: ITokenDistroInfo,
		readonly streamType?: StreamType,
	) {
		this.contractAddress = contractAddress;
		this.initialAmount = initialAmount;
		this.lockedAmount = lockedAmount;
		this.totalTokens = totalTokens;
		this.startTime = startTime;
		this.cliffTime = cliffTime;
		this.endTime = endTime;
		this.duration = this.endTime.getTime() - this.startTime.getTime();
	}

	get remain(): number {
		return Math.max(this.endTime.getTime() - getNowUnixMS(), 0);
	}

	get percent(): number {
		const { duration, remain } = this;
		return (Math.max(duration - remain, 0) / duration) * 100;
	}

	get globallyClaimableNow(): ethers.BigNumber {
		const now = getNowUnixMS();

		if (now < this.startTime.getTime()) return Zero;
		if (now <= this.cliffTime.getTime()) return this.initialAmount;
		if (now > this.endTime.getTime()) return this.totalTokens;

		const deltaTime = now - this.startTime.getTime();

		const releasedAmount = this.lockedAmount
			.mul(deltaTime)
			.div(this.duration);
		return this.initialAmount.add(releasedAmount);
	}

	public getLiquidPart = (amount: ethers.BigNumber): ethers.BigNumber => {
		if (this.totalTokens.isZero()) return Zero;
		return this.globallyClaimableNow.mul(amount).div(this.totalTokens);
	};

	public getStreamPartTokenPerSecond = (
		amount: ethers.BigNumber,
	): BigNumber => {
		const toFinish = this.remain / 1000;
		if (toFinish <= 0) return new BigNumber(0);
		const lockAmount = amount.sub(this.getLiquidPart(amount));
		return new BigNumber(lockAmount.toString()).div(toFinish);
	};

	public getStreamPartTokenPerWeek = (
		amount: ethers.BigNumber,
	): BigNumber => {
		return this.getStreamPartTokenPerSecond(amount).times(604800);
	};

	public getUserClaimableNow(userBalance: IBalances): ethers.BigNumber {
		let allocatedTokens, claimed: ethers.BigNumber;
		switch (this.streamType) {
			case StreamType.FOX:
				allocatedTokens = userBalance.foxAllocatedTokens;
				claimed = userBalance.foxClaimed;
				break;
			default:
				allocatedTokens = userBalance.allocatedTokens;
				claimed = userBalance.claimed;
		}

		return this.getLiquidPart(allocatedTokens).sub(claimed);
	}

	public get GlobalReleasePercentage(): number {
		if (this.totalTokens.isZero()) return 0;
		return new BigNumber(this.globallyClaimableNow.toString())
			.times(100)
			.div(this.totalTokens.toString())
			.toNumber();
	}
}
