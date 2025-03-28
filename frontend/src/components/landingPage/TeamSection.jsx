// src/components/landingPage/TeamSection.jsx
import React from "react";
import {
	Box,
	Grid,
	Typography,
	Container,
	Card,
	CardMedia,
} from "@mui/material";
import { motion } from "framer-motion";
import { styled } from "@mui/system";

// We will add afterwards as we have 10 members rn
const teamMembers = [
	{
		// Team Member 1
	},
	{
		// Team Member 2
	},
];

const StyledCard = styled(Card)(({ theme }) => ({
	position: "relative",
	borderRadius: "20px",
	overflow: "hidden",
	boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.1)",
	cursor: "pointer",
	transition: "transform 0.5s",
	"&:hover": {
		transform: "translateY(-10px)",
		boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.2)",
	},
}));

const StyledOverlay = styled(Box)(({ theme }) => ({
	position: "absolute",
	top: 0,
	left: 0,
	width: "100%",
	height: "100%",
	background:
		"linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)",
	opacity: 0,
	transition: "opacity 0.5s",
	display: "flex",
	alignItems: "flex-end",
	padding: theme.spacing(3),
	color: "#FFFFFF",
	"&:hover": {
		opacity: 1,
	},
}));

const TeamSection = () => {
	return (
		<Box
			id="team-section"
			sx={{
				py: { xs: 8, md: 12 },
				backgroundColor: "#0D0D0D",
				color: "#ffffff",
			}}
		>
			<Container maxWidth="lg">
				<Typography
					variant="h2"
					sx={{
						textAlign: "center",
						mb: 8,
						fontWeight: "bold",
						letterSpacing: "1px",
						textTransform: "uppercase",
					}}
				>
					Our Team
				</Typography>
				<Grid container spacing={6}>
					{teamMembers.map((member, idx) => (
						<Grid item xs={12} sm={6} md={6} key={idx}>
							<motion.div
								initial={{ opacity: 0, y: 50 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.8, delay: idx * 0.2 }}
							>
								<a
									href={member.linkedIn}
									target="_blank"
									rel="noopener noreferrer"
									style={{ textDecoration: "none" }}
								>
									<StyledCard>
										<CardMedia
											component="img"
											height="400"
											image={member.imageUrl}
											alt={member.name}
										/>
										<StyledOverlay>
											<Box>
												<Typography variant="h4" sx={{ fontWeight: "bold" }}>
													{member.name}
												</Typography>
												<Typography variant="subtitle1" sx={{ mb: 1 }}>
													{member.role}
												</Typography>
												<Typography variant="body1">
													{member.description}
												</Typography>
											</Box>
										</StyledOverlay>
									</StyledCard>
								</a>
							</motion.div>
						</Grid>
					))}
				</Grid>
			</Container>
		</Box>
	);
};

export default TeamSection;
