// User Controller
import * as userService from "../services/userService.js";
import * as otpService from "../services/otpService.js";
import { sendVerificationEmailService } from "../services/emailService.js";
import jwt from "jsonwebtoken";
import { AuthorizationError, ValidationError } from "@expensio/sharedlib";

//prefix /api/users

// POST @ /send-otp PUBLIC
const sendOTPController = async (req, res, next) => {
	try {
		const { phone, email } = req.body;

		if (!phone && !email) {
			throw new ValidationError(
				"Please provide a valid phone number or email."
			);
		}

		if (phone === "+911234567890" || email === "guest@test.com") {
			throw new AuthorizationError("Not Allowed for Guest User");
		}

		const { message, userExists, otp } = await otpService.handleSendOTPService(
			phone,
			email
		);
		res.status(200).json({ message, userExists, otp });
	} catch (error) {
		// res.status(error.statusCode || 400).json({ error: error.message });
		next(error);
	}
};

// POST @ /verify-otp PUBLIC (also creates users.)
const verifyOTPController = async (req, res, next) => {
	try {
		const { phone, email, otp, userData } = req.body;

		if (!phone && !email) {
			throw new ValidationError(
				"Please provide a valid phone number or email."
			);
		}

		if (phone === "+911234567890" || email === "guest@test.com") {
			throw new AuthorizationError("Not Allowed for Guest User");
		}

		if (!otp) {
			throw new ValidationError("Please provide an OTP.");
		}
		const result = await otpService.handleVerifyOTPService(
			phone,
			email,
			otp,
			userData
		);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// GET @ /send-verification-email PRIVATE
const sendVerificationEmailController = async (req, res, next) => {
	try {
		const userId = req.user.id;
		if (userId == 0) {
			throw new AuthorizationError("Not Allowed for Guest User");
		}
		await sendVerificationEmailService(userId);
		res.status(200).send({ message: "Verification email sent successfully." });
	} catch (error) {
		next(error);
	}
};

// GET @ /verify-email PUBLIC
const verifyEmailController = async (req, res, next) => {
	try {
		const { token } = req.query;
		if (token === "guest") {
			throw new AuthorizationError("Not Allowed for Guest User");
		}
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		await userService.verifyUserEmailService(decoded.email);
		res.status(200).json({ message: "Email verified successfully" });
	} catch (error) {
		next(error);
	}
};

// PUT @ /user PRIVATE
const updateProfileController = async (req, res, next) => {
	try {
		const userId = req.user.id;
		if (userId == 0) {
			throw new AuthorizationError("Not Allowed for Guest User");
		}

		const updates = req.body;
		const updatedUser = await userService.updateUserProfileService(
			userId,
			updates
		);
		res.status(200).json(updatedUser);
	} catch (error) {
		next(error);
	}
};

// DELETE @ /user PRIVATE
const deleteUserController = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const userPhone = req.user.phone;

		if (userId == 0) {
			throw new AuthorizationError("Not Allowed for Guest User");
		}

		const rowsDeleted = await userService.deleteUserService(userId, userPhone);
		if (rowsDeleted > 0) {
			res.status(200).send({ message: "User deleted successfully." });
		} else {
			res.status(404).send({ message: "User not found." });
		}
	} catch (error) {
		next(error);
	}
};

const getUserDetailsController = async (req, res, next) => {
	try {
		const userId = req.user.id;
		if (userId == 0) {
			const user = {
				id: 0,
				phone: "+911234567890",
				first_name: "Guest",
				last_name: "User",
				username: "guest",
				email: "guest@test.com",
				profile_picture_url: null,
				bio: "This is the official guest user, intended for checking out features.",
			};

			res.status(200).json(user);
			return;
		}
		const user = await userService.findUserByIdService(userId);
		res.status(200).json(user);
	} catch (error) {
		next(error);
	}
};

const checkUsernameAvailabilityController = async (req, res, next) => {
	try {
		const { username } = req.body;

		if (!username) {
			throw new ValidationError("Please provide a valid username.");
		}

		const usernameRegex = /^[a-zA-Z0-9_]+$/;

		if (!usernameRegex.test(username)) {
			throw new ValidationError(
				"Username must contain only alphanumeric characters and underscores."
			);
		}

		const isAvailable =
			await userService.checkUsernameAvailabilityService(username);

		res.status(200).json({ username, isAvailable });
	} catch (error) {
		next(error);
	}
};

export {
	sendOTPController,
	verifyOTPController,
	getUserDetailsController,
	sendVerificationEmailController,
	verifyEmailController,
	updateProfileController,
	deleteUserController,
	checkUsernameAvailabilityController,
};
