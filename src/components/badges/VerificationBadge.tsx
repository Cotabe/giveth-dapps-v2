import Image from 'next/image';
import { Overline } from '@giveth/ui-design-system';
import styled from 'styled-components';

import { FlexCenter } from '../styled-components/Flex';
import TraceIcon from '/public//images/trace.svg';
import VerifiedIcon from '/public//images/verified.svg';

const VerificationBadge = (props: { verified?: boolean; trace?: boolean }) => {
	const { verified, trace } = props;
	const text = verified ? 'VERIFIED' : trace ? 'TRACE' : '';
	const icon = verified ? VerifiedIcon : trace ? TraceIcon : '';
	return (
		<Wrapper>
			<Image src={icon} alt='badge icon' />
			<TextBadge styleType='Small'>{text}</TextBadge>
		</Wrapper>
	);
};

const Wrapper = styled(FlexCenter)`
	height: 30px;
	background: rgba(9, 17, 57, 0.6);
	border-radius: 56px;
	color: white;
	padding: 0 12px 0 10px;
	margin-right: 8px;
`;

const TextBadge = styled(Overline)`
	padding-left: 0.5rem;
	margin-right: 5px;
`;

export default VerificationBadge;
