import { ethers } from 'ethers';
import { keccak256 } from '@ethersproject/keccak256';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { promisify } from 'util';
import { AddressZero } from '@ethersproject/constants';
// @ts-ignore
import tokenAbi from 'human-standard-token-abi';

import { BasicNetworkConfig, GasPreference } from '@/types/config';
import { EWallets } from '@/lib/wallet/walletTypes';
import { brandColors } from '@giveth/ui-design-system';
import { giveconomyTabs } from '@/lib/constants/Tabs';
import { IUser } from '@/apollo/types/types';
import Routes from '@/lib/constants/Routes';
import { gToast, ToastType } from '@/components/toasts';
import { networkInfo } from './constants/NetworksObj';
import StorageLabel from '@/lib/localStorage';
import { networksParams } from '@/helpers/blockchain';
import axios from 'axios';

declare let window: any;

export const DurationToYMDh = (ms: number) => {
	let baseTime = new Date(0);
	let duration = new Date(ms);

	let y = duration.getUTCFullYear() - baseTime.getUTCFullYear();
	let m = duration.getUTCMonth() - baseTime.getUTCMonth();
	let d = duration.getUTCDate() - baseTime.getUTCDate();
	let h = duration.getUTCHours() - baseTime.getUTCHours();
	let min = duration.getUTCMinutes() - baseTime.getUTCMinutes();
	let sec = duration.getUTCSeconds() - baseTime.getUTCSeconds();

	return { y, m, d, h, min, sec };
};

export const DurationToString = (ms: number, length: number = 3) => {
	const temp: { [key: string]: number } = DurationToYMDh(ms);
	const res: string[] = [];
	for (const key in temp) {
		if (Object.prototype.hasOwnProperty.call(temp, key)) {
			const value: number = temp[key];
			if (value) {
				res.push(`${value}${key}`);
			}
		}
	}
	return res.slice(0, length).join(' ');
};

export const formatDate = (date: Date) => {
	return date
		.toLocaleString('en-US', {
			weekday: 'short',
			day: 'numeric',
			year: 'numeric',
			month: 'short',
			hour: 'numeric',
			minute: 'numeric',
		})
		.replace(/,/g, '');
};

export const smallFormatDate = (date: Date) => {
	return date
		.toLocaleString('en-US', {
			day: 'numeric',
			year: 'numeric',
			month: 'short',
		})
		.replace(/,/g, '');
};

export const getGasPreference = (
	networkConfig: BasicNetworkConfig,
): GasPreference => {
	const selectedWallet = window.localStorage.getItem(StorageLabel.WALLET);
	// MetaMask works with gas preference config
	if (selectedWallet === EWallets.METAMASK)
		return networkConfig.gasPreference || {};

	// For torus, it should be empty to work!
	return {};
};

export const isSSRMode = typeof window === 'undefined';

export const compareAddresses = (
	add1: string | undefined | null,
	add2: string | undefined | null,
) => {
	return add1?.toLowerCase() === add2?.toLowerCase();
};

export const isUserRegistered = (user?: IUser) => {
	return Boolean(user && user.name && user.email);
};

export const htmlToText = (text?: string) => {
	if (!text) return;
	return text
		.replace(/<\/(?:.|\n)*?>/gm, ' ') // replace closing tags w/ a space
		.replace(/<(?:.|\n)*?>/gm, '') // strip opening tags
		.trim();
};

export const capitalizeFirstLetter = (string: string) => {
	return string.charAt(0).toUpperCase() + string.slice(1);
};

const noImgColors = [
	brandColors.cyan[500],
	brandColors.mustard[500],
	brandColors.giv[500],
];
export const noImgColor = () => noImgColors[Math.floor(Math.random() * 3)];

export const noImgIcon = '/images/GIV-icon-text.svg';

export const isNoImg = (image: string | undefined) =>
	!(image && !Number(image));

export const shortenAddress = (
	address: string | null | undefined,
	charsLength = 4,
) => {
	const prefixLength = 2; // "0x"
	if (!address) {
		return '';
	}
	if (address.length < charsLength * 2 + prefixLength) {
		return address;
	}
	return `${address.slice(0, charsLength + prefixLength)}…${address.slice(
		-charsLength,
	)}`;
};

export function formatTxLink(
	chainId: number | undefined,
	hash: string | undefined,
) {
	return `${networkInfo(chainId).networkPrefix}tx/${hash}`;
}

export async function sendTransaction(
	web3: Web3Provider,
	params: any,
	txCallbacks: any,
	contractAddress: string,
	fromSigner: any,
	// traceableDonation = false
) {
	try {
		let web3Provider = web3;
		let txn = null;
		const txParams: any = {
			to: params?.to,
			// value: params?.value
		};

		web3Provider = fromSigner;

		// TRACEABLE DONATION
		// if (traceableDonation) {
		//   //
		//   // DEV: 0x279277482F13aeF92914317a0417DD591145aDc9
		//   // RELEASE: 0xC59dCE5CCC065A4b51A2321F857466A25ca49B40
		//   // TRACE: 0x30f938fED5dE6e06a9A7Cd2Ac3517131C317B1E7
		//
		//   // TODO !!!!!!!!!!!!
		//   const givethBridgeCurrent = new GivethBridge(
		//     web3,
		//     process.env.NEXT_PUBLIC_GIVETH_BRIDGE_ADDRESS
		//   )
		//   console.log({ givethBridgeCurrent })
		//   return alert('This is a trace donation, do something NOW!')
		// }

		// ERC20 TRANSFER
		if (contractAddress && contractAddress !== AddressZero) {
			const contract = new Contract(contractAddress, tokenAbi, web3);
			const decimals = await contract.decimals.call();
			txParams.value = ethers.utils.parseUnits(
				params?.value,
				parseInt(decimals),
			);
			const instance = contract.connect(web3.getSigner());

			if (fromSigner) {
				txn = await instance.transfer(txParams?.to, txParams?.value);
				txCallbacks?.onTransactionHash(txn?.hash, txn?.from);
				return txn;
			}
			const from = await fromSigner.getAccounts();
			return instance
				.transfer(txParams?.to, txParams?.value)
				.send({
					from: from[0],
				})
				.on('transactionHash', txCallbacks?.onTransactionHash)
				.on('receipt', function (receipt: any) {
					console.log('receipt>>>', receipt);
					txCallbacks?.onReceiptGenerated(receipt);
				})
				.on('error', (error: any) => txCallbacks?.onError(error)); // If a out of gas error, the second parameter is the receipt.
		}

		// REGULAR ETH TRANSFER
		txParams.value = ethers.utils.parseEther(params?.value);
		if (!txCallbacks || fromSigner) {
			// gets hash and checks until it's mined
			txn = await web3Provider.sendTransaction(txParams);
			txCallbacks?.onTransactionHash(txn?.hash, txn?.from);
		}

		console.log('stTxn ---> : ', { txn });
		return txn;
	} catch (error: any) {
		console.log('Error sending transaction: ', { error });
		throw error;
	}
}

export async function signMessage(
	message: string,
	address: string | undefined | null,
	chainId?: number,
	signer?: any,
) {
	try {
		// COMMENTING THIS AS BACKEND NEEDS TO BE UPDATED TO THIS WAY

		// const customPrefix = `\u0019${window.location.hostname} Signed Message:\n`
		// const prefixWithLength = Buffer.from(`${customPrefix}${message.length.toString()}`, 'utf-8')
		// const finalMessage = Buffer.concat([prefixWithLength, Buffer.from(message)])

		// const hashedMsg = keccak256(finalMessage)

		// const domain = {
		//   name: 'Giveth Login',
		//   version: '1',
		//   chainId
		// }

		// const types = {
		//   // EIP712Domain: [
		//   //   { name: 'name', type: 'string' },
		//   //   { name: 'chainId', type: 'uint256' },
		//   //   { name: 'version', type: 'string' }
		//   //   // { name: 'verifyingContract', type: 'address' }
		//   // ],
		//   User: [{ name: 'wallets', type: 'address[]' }],
		//   Login: [
		//     { name: 'user', type: 'User' },
		//     { name: 'contents', type: 'string' }
		//   ]
		// }

		// const value = {
		//   user: {
		//     wallets: [address]
		//   },
		//   contents: hashedMsg
		// }

		// return await signer._signTypedData(domain, types, value)

		let signedMessage = null;
		const customPrefix = `\u0019${window.location.hostname} Signed Message:\n`;
		const prefixWithLength = Buffer.from(
			`${customPrefix}${message.length.toString()}`,
			'utf-8',
		);
		const finalMessage = Buffer.concat([
			prefixWithLength,
			Buffer.from(message),
		]);

		const hashedMsg = keccak256(finalMessage);
		const send = promisify(signer.provider.provider.sendAsync);
		const msgParams = JSON.stringify({
			primaryType: 'Login',
			types: {
				EIP712Domain: [
					{ name: 'name', type: 'string' },
					{ name: 'chainId', type: 'uint256' },
					{ name: 'version', type: 'string' },
					// { name: 'verifyingContract', type: 'address' }
				],
				Login: [{ name: 'user', type: 'User' }],
				User: [{ name: 'wallets', type: 'address[]' }],
			},
			domain: {
				name: 'Giveth Login',
				chainId,
				version: '1',
			},
			message: {
				contents: hashedMsg,
				user: {
					wallets: [address],
				},
			},
		});
		const { result } = await send({
			method: 'eth_signTypedData_v4',
			params: [address, msgParams],
			from: address,
		});
		signedMessage = result;

		return signedMessage;
	} catch (error) {
		console.log('Signing Error!', { error });
		return false;
	}
}

export const checkLinkActive = (route: string, href: string) => {
	if (route === href) {
		return true;
	}
	if (href === Routes.GIVECONOMY) {
		return isGivEconomyRoute(route);
	}
	return false;
};

export const isGivEconomyRoute = (route: string) => {
	const givEconomyRoute = giveconomyTabs.find(
		giveconomyTab => giveconomyTab.href === route,
	);
	return !!givEconomyRoute;
};

export const showToastError = (err: any) => {
	const errorMessage =
		typeof err === 'string' ? err : JSON.stringify(err.message || err);
	gToast(errorMessage, {
		type: ToastType.DANGER,
		position: 'top-center',
	});
	console.log(err);
};

export const calcBiggestUnitDifferenceTime = (_time: string) => {
	const time = new Date(_time);
	const diff: { [key: string]: number } = DurationToYMDh(
		Date.now() - time.getTime(),
	);
	if (diff.y > 0) return ` ${diff.y} year${diff.y > 1 ? 's' : ''} ago`;
	if (diff.m > 0) return ` ${diff.m} month${diff.m > 1 ? 's' : ''} ago`;
	if (diff.d > 0) return ` ${diff.d} day${diff.d > 1 ? 's' : ''} ago`;
	if (diff.h > 0) return ` ${diff.h} hour${diff.h > 1 ? 's' : ''} ago`;
	if (diff.min > 0)
		return ` ${diff.min} minute${diff.min > 1 ? 's' : ''} ago`;
	return ' Just now';
};

export const detectBrave = async () => {
	// @ts-ignore
	return (navigator.brave && (await navigator.brave.isBrave())) || false;
};

export const transactionLink = (networkId: number, txHash: string) => {
	if (!networksParams[networkId]) return '';
	return `${networksParams[networkId].blockExplorerUrls[0]}/tx/${txHash}`;
};

const getSafeUrl = (hash: string, chainId: number) => {
	let url = '';
	switch (chainId) {
		case 1:
			url = 'https://safe-transaction.gnosis.io/api/v1/';
			break;
		case 100:
			url = 'https://safe-transaction.xdai.gnosis.io/api/v1/';
			break;
	}
	return url;
};

export const isSafeTx = async (hash: string, chainId: number) => {
	const url = getSafeUrl(hash, chainId);

	const checkTx = await axios.get(`${url}multisig-transactions/${hash}/`);
	const { safeTxHash } = checkTx.data;
	if (safeTxHash === hash) {
		return true;
	} else {
		return false;
	}
};

export const checkSafeTxStatus = async (
	currentAllowance: string,
): Promise<boolean> => {

};
