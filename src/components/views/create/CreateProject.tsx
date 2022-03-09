import React, { useEffect, useRef, useState } from 'react';
import {
	brandColors,
	Button,
	Caption,
	H3,
	H4,
	IconExternalLink,
	neutralColors,
	OulineButton,
	H6,
} from '@giveth/ui-design-system';
import { useMutation } from '@apollo/client';
import { utils } from 'ethers';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import Debounced from 'lodash.debounce';
import { useRouter } from 'next/router';
import Image from 'next/image';

import {
	ACTIVATE_PROJECT,
	CREATE_PROJECT,
	UPDATE_PROJECT,
} from '@/apollo/gql/gqlProjects';
import { getAddressFromENS, isAddressENS } from '@/lib/wallet';
import { IProjectCreation, IProjectEdition } from '@/apollo/types/types';
import {
	CategoryInput,
	DescriptionInput,
	ImageInput,
	LocationInput,
	NameInput,
	WalletAddressInput,
} from './Inputs';
import useUser from '@/context/UserProvider';
import Logger from '@/utils/Logger';
import SuccessfulCreation from './SuccessfulCreation';
import { ProjectGuidelineModal } from '@/components/modals/ProjectGuidelineModal';
import {
	isDescriptionHeavy,
	titleValidation,
	walletAddressValidation,
} from '@/helpers/createProjectValidation';
import { compareAddresses, showToastError } from '@/lib/helpers';
import { EProjectStatus } from '@/apollo/types/gqlEnums';
import { slugToProjectView } from '@/lib/routeCreators';
import { client } from '@/apollo/apolloClient';
import LightBulbIcon from '/public/images/icons/lightbulb.svg';
import { Shadow } from '@/components/styled-components/Shadow';

export enum ECreateErrFields {
	NAME = 'name',
	DESCRIPTION = 'description',
	WALLET_ADDRESS = 'walletAddress',
}

export interface ICreateProjectErrors {
	[ECreateErrFields.NAME]: string;
	[ECreateErrFields.DESCRIPTION]: string;
	[ECreateErrFields.WALLET_ADDRESS]: string;
}

export interface ICategoryComponent {
	[key: string]: boolean;
}

const CreateProject = (props: { project?: IProjectEdition }) => {
	const { library, chainId } = useWeb3React();
	const [addProjectMutation] = useMutation(CREATE_PROJECT);
	const [editProjectMutation] = useMutation(UPDATE_PROJECT);
	const router = useRouter();

	const { project } = props;

	const isEditMode = !!project;
	const isDraft = project?.status.name === EProjectStatus.DRAFT;
	const defaultImpactLocation = project?.impactLocation || '';

	const [creationSuccessful, setCreationSuccessful] = useState<any>(null);
	const [showGuidelineModal, setShowGuidelineModal] = useState(false);
	const [name, setName] = useState(project?.title || '');
	const [description, setDescription] = useState(project?.description || '');
	const [categories, setCategories] = useState(project?.categories || []);
	const [image, setImage] = useState(project?.image || '');
	const [walletAddress, setWalletAddress] = useState(
		project?.walletAddress || '',
	);
	const [isLoading, setIsLoading] = useState(false);
	const [impactLocation, setImpactLocation] = useState(
		project?.impactLocation || '',
	);
	const [errors, setErrors] = useState<ICreateProjectErrors>({
		[ECreateErrFields.NAME]: isEditMode ? '' : 'Title is required',
		[ECreateErrFields.DESCRIPTION]: '',
		[ECreateErrFields.WALLET_ADDRESS]: '',
	});

	const {
		state: { user },
	} = useUser();

	const debouncedTitleValidation = useRef<any>();
	const debouncedAddressValidation = useRef<any>();
	const debouncedDescriptionValidation = useRef<any>();

	useEffect(() => {
		if (!isEditMode) {
			setShowGuidelineModal(true);
		}
	}, []);

	useEffect(() => {
		const userAddress = user?.walletAddress || '';
		if (!isEditMode) {
			setWalletAddress(userAddress);
			walletAddressValidation(
				userAddress,
				library,
				errors,
				setErrors,
				chainId,
			);
		}
	}, [user]);

	useEffect(() => {
		debouncedTitleValidation.current = Debounced(titleValidation, 1000);
		debouncedAddressValidation.current = Debounced(
			walletAddressValidation,
			1000,
		);
		debouncedDescriptionValidation.current = Debounced(
			isDescriptionHeavy,
			1000,
		);
	}, []);

	const handleInputChange = (value: string, id: string) => {
		if (id === ECreateErrFields.NAME) {
			setName(value);
			if (isEditMode && value === project.title) {
				const _errors = { ...errors };
				_errors[ECreateErrFields.NAME] = '';
				setErrors(_errors);
				return;
			}
			debouncedTitleValidation.current(value, errors, setErrors);
		} else if (id === ECreateErrFields.WALLET_ADDRESS) {
			setWalletAddress(value);
			if (isEditMode && compareAddresses(value, project?.walletAddress)) {
				const _errors = { ...errors };
				_errors[ECreateErrFields.WALLET_ADDRESS] = '';
				setErrors(_errors);
				return;
			}
			debouncedAddressValidation.current(
				value,
				library,
				errors,
				setErrors,
				chainId,
			);
		} else if (id === ECreateErrFields.DESCRIPTION) {
			setDescription(value);
			debouncedDescriptionValidation.current(value, errors, setErrors);
		}
	};

	const submitErrorHandler = (id: string, error: string) => {
		document.getElementById(id)?.scrollIntoView({
			behavior: 'smooth',
		});
		showToastError(error);
	};

	const isReadyToPublish = () => {
		for (let [key, value] of Object.entries(errors)) {
			if (value) {
				submitErrorHandler(key, value);
				return false;
			}
		}
		return true;
	};

	const onSubmit = async (drafted?: boolean) => {
		try {
			if (!isReadyToPublish()) return;

			const address = isAddressENS(walletAddress)
				? await getAddressFromENS(walletAddress, library)
				: walletAddress;

			const projectData: IProjectCreation = {
				title: name,
				description,
				impactLocation,
				categories: categories.map(category => category.name),
				organisationId: 1,
				walletAddress: utils.getAddress(address),
				image,
				isDraft: !!drafted,
			};

			setIsLoading(true);

			const addedProject = isEditMode
				? await editProjectMutation({
						variables: {
							newProjectData: projectData,
							projectId: parseFloat(project.id as string),
						},
				  })
				: await addProjectMutation({
						variables: {
							project: { ...projectData },
						},
				  });

			if (isDraft && !drafted) {
				await client.mutate({
					mutation: ACTIVATE_PROJECT,
					variables: { projectId: Number(project.id) },
				});
			}

			if (addedProject) {
				// Success
				setIsLoading(false);
				const _project = isEditMode
					? addedProject.data?.updateProject
					: addedProject.data?.createProject;
				if (drafted) {
					await router.push(slugToProjectView(_project.slug));
				} else {
					if (!isEditMode || (isEditMode && isDraft)) {
						setCreationSuccessful(_project);
					} else {
						await router.push(slugToProjectView(_project.slug));
					}
				}
			}
		} catch (e) {
			setIsLoading(false);
			const error = e as Error;
			Logger.captureException(error);
			showToastError(error);
		}
	};

	if (creationSuccessful) {
		return <SuccessfulCreation project={creationSuccessful} />;
	}

	return (
		<>
			{showGuidelineModal && (
				<ProjectGuidelineModal
					showModal={showGuidelineModal}
					setShowModal={setShowGuidelineModal}
				/>
			)}
			{user && (
				<>
					<CreateContainer>
						<Title>
							{isEditMode
								? 'Project details'
								: 'Create a Project'}
						</Title>

						<div>
							<NameInput
								value={name}
								setValue={e =>
									handleInputChange(e, ECreateErrFields.NAME)
								}
								error={errors[ECreateErrFields.NAME]}
							/>
							<DescriptionInput
								value={description}
								setValue={e =>
									handleInputChange(
										e,
										ECreateErrFields.DESCRIPTION,
									)
								}
								error={errors[ECreateErrFields.DESCRIPTION]}
							/>
							<CategoryInput
								value={categories}
								setValue={setCategories}
							/>
							<LocationInput
								defaultValue={defaultImpactLocation}
								setValue={setImpactLocation}
							/>
							<ImageInput
								value={image}
								setValue={setImage}
								setIsLoading={setIsLoading}
							/>
							<WalletAddressInput
								value={walletAddress}
								setValue={e =>
									handleInputChange(
										e,
										ECreateErrFields.WALLET_ADDRESS,
									)
								}
								error={errors[ECreateErrFields.WALLET_ADDRESS]}
							/>

							<PublishTitle>
								{isEditMode
									? 'Publish edited project'
									: `Let's Publish!`}
							</PublishTitle>
							<PublishList>
								<li>
									{isEditMode ? 'Edited' : 'Newly published'}{' '}
									projects will be &quot;unlisted&quot; until
									reviewed by our team {isEditMode && 'again'}
									.
								</li>
								<li>
									You can still access your project from your
									account and share it with your friends via
									the project link!
								</li>
								<li>
									You&apos;ll receive an email from us once
									your project is listed.
								</li>
							</PublishList>
							<Buttons>
								{(!isEditMode || isDraft) && (
									<OulineButton
										label='PREVIEW '
										buttonType='primary'
										disabled={isLoading}
										icon={<IconExternalLink size={16} />}
										onClick={() => onSubmit(true)}
									/>
								)}
								<Button
									label='PUBLISH'
									buttonType='primary'
									disabled={isLoading}
									onClick={() => onSubmit(false)}
								/>
							</Buttons>
						</div>
					</CreateContainer>
					<Guidelines onClick={() => setShowGuidelineModal(true)}>
						<Image src={LightBulbIcon} alt='Light Bulb Icon' />
						<H6>Submission guidelines</H6>
					</Guidelines>
				</>
			)}
		</>
	);
};

const Guidelines = styled.div`
	width: 325px;
	height: 87px;
	display: flex;
	align-items: center;
	gap: 20px;
	padding: 28px;
	border-radius: 8px;
	box-shadow: ${Shadow.Dark[500]};
	position: fixed;
	top: 104px;
	right: 10px;
	cursor: pointer;

	> h6 {
		font-weight: 700;
	}
`;

const CreateContainer = styled.div`
	display: flex;
	flex-direction: column;
	margin: 104px 0 154px 264px;
	max-width: 720px;
	> div {
		display: flex;
		flex-direction: column;
		margin: 48px 0;
	}
`;

const Buttons = styled.div`
	display: flex;
	justify-content: center;
	flex-direction: row;
	margin: 61px 0 32px 0;
	button {
		width: 100%;
		max-width: 320px;
		&:first-of-type {
			margin-right: 10px;
		}
	}
`;

const Title = styled(H3)`
	color: ${brandColors.deep[600]};
	font-weight: bold;
`;

const PublishTitle = styled(H4)`
	margin: 45px 0 24px 0;
	color: ${brandColors.deep[900]};
	font-weight: bold;
`;

const PublishList = styled(Caption)`
	color: ${neutralColors.gray[900]};
`;

export default CreateProject;
