import { useEffect, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import { useWeb3React } from '@web3-react/core';
import {
	getGivStakingAPR,
	getLPStakingAPR,
	getUserStakeInfo,
} from '@/lib/stakingPool';
import { useSubgraph } from '@/context';
import {
	PoolStakingConfig,
	RegenPoolStakingConfig,
	StakingType,
} from '@/types/config';
import { APR, UserStakeInfo } from '@/types/poolInfo';
import { UnipoolHelper } from '@/lib/contractHelper/UnipoolHelper';
import { Zero } from '@/helpers/number';

export const useStakingPool = (
	poolStakingConfig: PoolStakingConfig | RegenPoolStakingConfig,
	network: number,
): {
	apr: BigNumber | null;
	earned: ethers.BigNumber;
	stakedAmount: ethers.BigNumber;
	notStakedAmount: ethers.BigNumber;
} => {
	const { library, chainId } = useWeb3React();
	const { currentValues } = useSubgraph();

	const { balances } = currentValues;

	const [apr, setApr] = useState<BigNumber | null>(null);
	const [userStakeInfo, setUserStakeInfo] = useState<UserStakeInfo>({
		earned: ethers.constants.Zero,
		notStakedAmount: ethers.constants.Zero,
		stakedAmount: ethers.constants.Zero,
	});

	const stakePoolInfoPoll = useRef<NodeJS.Timer | null>(null);

	const { type, LM_ADDRESS, regenFarmType } =
		poolStakingConfig as RegenPoolStakingConfig;

	const unipool = currentValues[regenFarmType || type];
	const unipoolIsDefined = !!unipool;
	const providerNetwork = library?.network?.chainId;

	useEffect(() => {
		const cb = () => {
			if (
				library &&
				chainId === network &&
				providerNetwork === network &&
				unipoolIsDefined
			) {
				const promise: Promise<APR> =
					type === StakingType.GIV_LM
						? getGivStakingAPR(LM_ADDRESS, network, unipool)
						: getLPStakingAPR(
								poolStakingConfig,
								network,
								library,
								unipool,
						  );
				promise.then(setApr);
			} else {
				setApr(Zero);
			}
		};

		cb();

		stakePoolInfoPoll.current = setInterval(cb, 60000); // Every one minutes

		return () => {
			if (stakePoolInfoPoll.current) {
				clearInterval(stakePoolInfoPoll.current);
				stakePoolInfoPoll.current = null;
			}
		};
	}, [library, chainId, unipoolIsDefined, providerNetwork]);

	useEffect(() => {
		const unipoolInfo = currentValues[regenFarmType || type];
		const unipoolHelper = unipoolInfo && new UnipoolHelper(unipoolInfo);
		setUserStakeInfo(
			getUserStakeInfo(type, regenFarmType, balances, unipoolHelper),
		);
	}, [type, regenFarmType, currentValues, balances]);

	return {
		apr,
		...userStakeInfo,
	};
};
