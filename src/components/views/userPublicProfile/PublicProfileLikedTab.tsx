import { client } from '@/apollo/apolloClient';
import { FETCH_USER_LIKED_PROJECTS } from '@/apollo/gql/gqlProjects';
import { IUserLikedProjects } from '@/apollo/types/gqlTypes';
import { IProject } from '@/apollo/types/types';
import Pagination from '@/components/Pagination';
import ProjectCard from '@/components/project-card/ProjectCard';
import { FC, useEffect, useState } from 'react';
import { Loading } from './PublicProfileProjectsTab';
import { IUserPublicProfileView, NothingToSee } from './UserPublicProfile.view';
import styled from 'styled-components';
import { mediaQueries } from '@/lib/constants/constants';

const itemPerPage = 6;

const PublicProfileLikedTab: FC<IUserPublicProfileView> = ({
	myAccount,
	user,
}) => {
	const [loading, setLoading] = useState(false);
	const [projects, setProjects] = useState<IProject[]>([]);
	const [totalCount, setTotalCount] = useState<number>(0);
	const [page, setPage] = useState(0);

	useEffect(() => {
		if (!user) return;
		const fetchUserProjects = async () => {
			setLoading(true);
			const { data: userLikedProjects } = await client.query({
				query: FETCH_USER_LIKED_PROJECTS,
				variables: {
					userId: parseFloat(user.id || '') || -1,
					take: itemPerPage,
					skip: page * itemPerPage,
				},
			});
			setLoading(false);
			if (userLikedProjects?.likedProjectsByUserId) {
				const likedProjectsByUserId: IUserLikedProjects =
					userLikedProjects.likedProjectsByUserId;
				setProjects(likedProjectsByUserId.projects);
				setTotalCount(likedProjectsByUserId.totalCount);
			}
		};
		fetchUserProjects();
	}, [page, user]);

	return (
		<>
			{!loading && totalCount == 0 ? (
				<NothingWrapper>
					<NothingToSee
						title={`${
							myAccount ? "You haven't" : "This user hasn't"
						} liked any projects yet!`}
						heartIcon={true}
					/>
				</NothingWrapper>
			) : (
				<LikedContainer>
					{projects?.map(project => (
						<ProjectCard key={project.id} project={project} />
					))}
					{loading && <Loading />}
				</LikedContainer>
			)}

			<Pagination
				currentPage={page}
				totalCount={totalCount}
				setPage={setPage}
				itemPerPage={itemPerPage}
			/>
		</>
	);
};

export default PublicProfileLikedTab;

const NothingWrapper = styled.div`
	position: relative;
	padding: 100px 0;
`;

const LikedContainer = styled.div`
	display: grid;
	position: relative;
	gap: 24px;
	margin-bottom: 64px;
	padding: 0;
	align-items: center;
	${mediaQueries.laptop} {
		grid-template-columns: repeat(2, 1fr);
	}
	${mediaQueries.laptopL} {
		grid-template-columns: repeat(3, 1fr);
	}
	${mediaQueries.desktop} {
		grid-template-columns: repeat(3, 1fr);
	}
`;
