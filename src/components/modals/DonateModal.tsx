import { useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import {
	brandColors,
	H3,
	H6,
	P,
	neutralColors,
	Button,
	semanticColors,
	IconInfo,
} from '@giveth/ui-design-system';
import { IconWalletApprove } from '@giveth/ui-design-system/lib/cjs/components/icons/WalletApprove';
import { captureException } from '@sentry/nextjs';

import { IModal, Modal } from '@/components/modals/Modal';
import { IProject } from '@/apollo/types/types';
import { isAddressENS, getAddressFromENS } from '@/lib/wallet';
import { formatPrice, sendTransaction, showToastError } from '@/lib/helpers';
import * as transaction from '../../services/transaction';
import { saveDonation, saveDonationTransaction } from '@/services/donation';
import FixedToast from '@/components/toasts/FixedToast';
import { mediaQueries } from '@/lib/constants/constants';
import { IProjectAcceptedToken } from '@/apollo/types/gqlTypes';
import { ISuccessDonation } from '@/components/views/donate/CryptoDonation';

interface IDonateModal extends IModal {
	closeParentModal?: () => void;
	project: IProject;
	token: IProjectAcceptedToken;
	amount: number;
	price?: number;
	anonymous?: boolean;
	setInProgress?: any;
	setUnconfirmed?: any;
	setSuccessDonation: (i: ISuccessDonation) => void;
	givBackEligible?: boolean;
}

const DonateModal = ({
	setShowModal,
	project,
	token,
	amount,
	price,
	anonymous,
	setInProgress,
	setSuccessDonation,
	setUnconfirmed,
	givBackEligible,
}: IDonateModal) => {
	const { account, library, chainId } = useWeb3React();

	const [donating, setDonating] = useState(false);
	const [donationSaved, setDonationSaved] = useState(false);

	const { walletAddress, id, title } = project || {};

	const avgPrice = price && price * amount;

	const confirmDonation = async () => {
		try {
			// Traceable by default if it comes from Trace only
			// Depends on the toggle if it's an IO to Trace project
			// let traceable = project?.fromTrace
			//   ? true
			//   : isTraceable
			//   ? isTraceable
			//   : switchTraceable
			let traceable = false;

			const toAddress = isAddressENS(walletAddress!)
				? await getAddressFromENS(walletAddress!, library)
				: walletAddress;
			await transaction.send(
				library,
				toAddress,
				token.address!,
				amount,
				sendTransaction,
				{
					onTransactionHash: async (transactionHash: string) => {
						// Save initial txn details to db
						const {
							donationId,
							savedDonation,
							saveDonationErrors,
						} = await saveDonation(
							account!,
							toAddress,
							transactionHash,
							chainId!,
							amount,
							token.symbol!,
							Number(id),
							token.address!,
							anonymous!,
						);
						console.log('DONATION RESPONSE: ', {
							donationId,
							savedDonation,
							saveDonationErrors,
						});
						setDonationSaved(true);
						// onTransactionHash callback for event emitter
						if (saveDonationErrors?.length > 0) {
							showToastError(saveDonationErrors);
						}
						transaction.confirmEtherTransaction(
							transactionHash,
							(res: transaction.IEthTxConfirmation) => {
								try {
									if (!res) return;
									// toast.dismiss()
									if (res?.tooSlow === true) {
										// Tx is being too slow
										// toast.dismiss()
										setSuccessDonation({
											transactionHash,
											tokenSymbol: token.symbol,
											subtotal: amount,
											givBackEligible,
											tooSlow: true,
										});
										setInProgress(true);
									} else if (res?.status) {
										// Tx was successful
										// toast.dismiss()
										setSuccessDonation({
											transactionHash,
											tokenSymbol: token.symbol,
											subtotal: amount,
											givBackEligible,
										});
										setUnconfirmed(false);
									} else {
										// EVM reverted the transaction, it failed
										setSuccessDonation({
											transactionHash,
											tokenSymbol: token.symbol,
											subtotal: amount,
											givBackEligible,
										});
										setUnconfirmed(true);
										if (res?.error) {
											showToastError(res.error);
										} else {
											showToastError(
												"Transaction couldn't be confirmed or it failed",
											);
										}
									}
								} catch (error) {
									showToastError(error);
								}
							},
							0,
							library,
						);
						await saveDonationTransaction(
							transactionHash,
							donationId,
						);
					},
					onReceiptGenerated: (receipt: any) => {
						console.log({ receipt });
						setSuccessDonation({
							transactionHash: receipt?.transactionHash,
							tokenSymbol: token.symbol,
							subtotal: amount,
						});
					},
					onError: showToastError,
				},
				traceable,
			);

			// Commented notify, and instead we are using our own service
			// transaction.notify(transactionHash)
		} catch (error: any) {
			setDonating(false);
			captureException(error);
			if (
				error?.data?.code === 'INSUFFICIENT_FUNDS' ||
				error?.data?.code === 'UNPREDICTABLE_GAS_LIMIT'
			) {
				showToastError('Insufficient Funds');
			} else showToastError(error);
		}
	};

	return (
		<Modal
			showModal
			setShowModal={setShowModal}
			headerTitle='Donating'
			headerTitlePosition='left'
			headerIcon={<IconWalletApprove size={32} />}
		>
			<DonateContainer>
				<DonatingBox>
					<P>You are donating</P>
					<H3>
						{formatPrice(amount)} {token.symbol}
					</H3>
					{avgPrice ? <H6>{formatPrice(avgPrice)} USD</H6> : null}
					<P>
						To <span>{title}</span>
					</P>
				</DonatingBox>
				<Buttons>
					{donationSaved && (
						<FixedToast
							message='Your donation is being processed, you can close this modal.'
							color={semanticColors.blueSky[700]}
							backgroundColor={semanticColors.blueSky[100]}
							icon={
								<IconInfo
									size={16}
									color={semanticColors.blueSky[700]}
								/>
							}
						/>
					)}
					<DonateButton
						buttonType='primary'
						donating={donating}
						disabled={donating}
						label={donating ? 'DONATING' : 'DONATE'}
						onClick={() => {
							setDonating(!donating);
							confirmDonation();
						}}
					/>
					{donationSaved && (
						<CloseButton
							label='CLOSE THIS MODAL'
							buttonType='texty'
							onClick={() => setShowModal(false)}
						/>
					)}
				</Buttons>
			</DonateContainer>
		</Modal>
	);
};

const DonateContainer = styled.div`
	background: white;
	color: black;
	padding: 24px 24px 38px;
	margin: 0;
	width: 100%;
	${mediaQueries.tablet} {
		width: 494px;
	}
`;

const DonatingBox = styled.div`
	color: ${brandColors.deep[900]};
	> :first-child {
		margin-bottom: 8px;
	}
	h3 {
		margin-top: -5px;
	}
	h6 {
		color: ${neutralColors.gray[700]};
		margin-top: -5px;
	}
	> :last-child {
		margin: 12px 0 32px 0;
		> span {
			font-weight: 500;
		}
	}
`;

const DonateButton = styled(Button)`
	background: ${(props: { donating: boolean }) =>
		props.donating ? brandColors.giv[200] : brandColors.giv[500]};
	:hover:enabled {
		background: ${brandColors.giv[700]};
	}
	:disabled {
		cursor: not-allowed;
	}
	* {
		margin: auto 0;
		padding: 0 8px 0 0;
		font-weight: bold;
	}
`;

const Buttons = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;

	> :first-child {
		margin: 15px 0;
	}
`;

const CloseButton = styled(Button)`
	margin: 5px 0 0 0;
	:hover {
		background: transparent;
	}
`;

export default DonateModal;
