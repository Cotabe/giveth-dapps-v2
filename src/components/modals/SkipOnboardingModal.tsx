import {
	IconInfo32,
	Lead,
	semanticColors,
	IconInfo16,
	Caption,
	Button,
} from '@giveth/ui-design-system';
import styled from 'styled-components';
import { FC } from 'react';
import { useRouter } from 'next/router';
import { Flex } from '../styled-components/Flex';
import { Modal, IModal } from './Modal';

export const SkipOnboardingModal: FC<IModal> = ({ setShowModal }) => {
	const router = useRouter();
	return (
		<Modal
			setShowModal={setShowModal}
			headerIcon={<IconInfo32 />}
			headerTitle='Are you sure?'
			headerTitlePosition='left'
		>
			<SkipOnboardingModalContainer>
				<Desc>
					If you don’t add required informations, you can’t create
					projects to receive funds.
				</Desc>
				<AlertBox>
					<IconInfo16 />
					<Caption>
						You can update your info from profile later too.
					</Caption>
				</AlertBox>
				<OKButton
					size='small'
					label='OK, I’LL DO IT NOW'
					onClick={() => setShowModal(false)}
				/>
				<CancelButton
					size='small'
					label='OK, I’LL DO IT LATER'
					buttonType='texty'
					onClick={() => router.back()}
				/>
			</SkipOnboardingModalContainer>
		</Modal>
	);
};

const SkipOnboardingModalContainer = styled.div`
	width: 494px;
	padding: 24px;
`;

const Desc = styled(Lead)`
	margin: 38px 0 60px;
	text-align: left;
`;

const AlertBox = styled(Flex)`
	background: ${semanticColors.blueSky[100]};
	color: ${semanticColors.blueSky[700]};
	border: 1px solid ${semanticColors.blueSky[700]};
	box-sizing: border-box;
	border-radius: 8px;
	gap: 16px;
	padding: 16px;
	align-items: center;
`;

const OKButton = styled(Button)`
	width: 100%;
	margin: 16px 0;
`;

const CancelButton = styled(Button)`
	width: 100%;
`;
