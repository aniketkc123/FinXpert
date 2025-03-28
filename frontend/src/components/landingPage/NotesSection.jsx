// src/components/landingPage/NotesSection.jsx
import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { motion } from "framer-motion";
// import backgroundImage from "/warning-background.jpg";
const NotesSection = () => {
	return (
		<Box
			id="notes-section"
			sx={{
				position: "relative",
				py: { xs: 12, md: 20 },
				textAlign: "center",
				color: "#FFFFFF",
				overflow: "hidden",
				// height: "500px",
			}}
		></Box>
	);
};

export default NotesSection;
