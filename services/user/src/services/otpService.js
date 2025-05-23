import twilioClient from "../config/twilio.js";
import * as otpModel from "../models/otpModel.js";
import * as userService from "../services/userService.js";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import pool from "../config/db.js";

import {
	RateLimitError,
	OtpSendingError,
	ValidationError,
	InternalServerError,
	logError,
} from "@expensio/sharedlib";
import {
	deleteUserByPhoneOrEmailModel,
	findIfUserExistsByPhoneOrEmailModel,
} from "../models/userModel.js";
import { sendEmail } from "./emailService.js";
import { otpMailHtmlTemplate } from "../utils/otpMailHtmlTemplate.js";

import config from "../config/config.js";

const otpLimit = config.MAX_OTP_REQUEST_LIMIT;

const generateOTP = () => {
	return crypto.randomInt(100000, 999999).toString(); // 6 digit otp
};

export const handleSendOTPService = async (phone, email) => {
	let otpRequest;
	if (email) {
		otpRequest = await otpModel.findOtpRequestByEmailModel(email);
	} else {
		otpRequest = await otpModel.findOtpRequestByPhoneModel(phone);
	}

	if (otpRequest) {
		const now = new Date();
		if (otpRequest.is_blocked_until > now) {
			throw new RateLimitError(
				`User is blocked from receiving OTPs. Try again after ${otpRequest.is_blocked_until}`
			);
		}
		if (otpRequest.request_count >= otpLimit) {
			// reset request_count to avoid permanent block
			await otpModel.updateOtpRequestModel(phone, email, {
				is_blocked_until: new Date(now.getTime() + 60 * 60 * 1000), // Block for 1 hour
				request_count: 0, // to avoid permanent blocking
			});
			throw new RateLimitError(
				"Too many OTP requests. Please try after 1 hour."
			);
		}
	}

	const otp = generateOTP();

	const otpExpiry = new Date(new Date().getTime() + 30 * 60 * 1000); // OTP expire time (currently set to 30 minutes)

	// update or create OTP request record
	const result = await otpModel.createOrUpdateOtpRequestModel({
		phone,
		email,
		otp,
		last_request_time: new Date(),
		otp_expiry: otpExpiry,
		request_count: otpRequest ? otpRequest.request_count + 1 : 1,
	});

	const environment = process.env.NODE_ENV;
	if (email) {
		await sendEmail({
			from: `"FinXpert" <krishwave66@gmail.com>`,
			to: email,
			subject: "FinXpert: OTP for Login",
			html: otpMailHtmlTemplate(otp),
		});
	}
	if (environment !== "development") {
		// Send OTP via SMS using Twilio
		try {
			if (phone) {
				await twilioClient.messages.create({
					to: phone,
					from: process.env.TWILIO_PHONE_NUMBER,
					body: `Your OTP is: ${otp}`,
				});
			}
		} catch (error) {
			throw new OtpSendingError("Failed to send OTP.");
		}
	}

	return {
		message: "OTP sent successfully.",
		userExists: result.user_exists,
		otp: environment === "development" ? otp : undefined,
	};
};

export const handleVerifyOTPService = async (phone, email, otp, userData) => {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		let otpRequest;

		if (email) {
			otpRequest = await otpModel.findOtpRequestByEmailModel(email, client);
		} else {
			otpRequest = await otpModel.findOtpRequestByPhoneModel(phone, client);
		}

		if (
			!otpRequest ||
			otpRequest.otp !== otp ||
			otpRequest.otp_expiry < new Date()
		) {
			throw new ValidationError("OTP is invalid or has expired.");
		}

		const userExistsInOtpRequestTable = otpRequest.user_exists;
		let user;

		if (!userExistsInOtpRequestTable) {
			// Check if the user exists in the users table (including soft-deleted users)
			const userExistsInUserTable = await findIfUserExistsByPhoneOrEmailModel(
				phone,
				email,
				client
			);

			// If the user exists in the users table, delete the entry to prepare for re-creation
			if (userExistsInUserTable) {
				await deleteUserByPhoneOrEmailModel(phone, email, client);

				// NOTE::::: Commit the transaction after deletion to release locks
				await client.query("COMMIT");

				// Start a new transaction for user creation
				await client.query("BEGIN");
			}

			// ************* WARNING ********************************************************************
			// BLUNDER WARNING::: If user registers via Email first to send the OTP, and provides a number
			// with his registration to verify OTP, that number wont be verified.
			// Same goes for vice versa.
			// SO CURRENTLY, MOBILE NUMBER WONT BE VERIFIED FOR OBVIOUS REASONS.
			// *******************************************************************************************
			if (
				!userData ||
				!userData.firstName ||
				!userData.username ||
				!userData.phone ||
				!userData.email ||
				(!phone && !email) ||
				(phone && userData.phone !== phone) ||
				(email && userData.email !== email)
			) {
				throw new ValidationError(
					"Missing/invalid required user data fields: firstName, username, email and phone are required."
				);
			}
			//Check username validity
			const usernameRegex = /^[a-zA-Z0-9_]+$/;
			if (!usernameRegex.test(userData.username)) {
				throw new ValidationError(
					"Username must contain only alphanumeric characters and underscores."
				);
			}

			const isAvailable = await userService.checkUsernameAvailabilityService(
				userData.username
			);

			if (!isAvailable) {
				throw new ValidationError("Username is not available.");
			}

			if (!otpRequest.phone) {
				await otpModel.updateOtpRequestPhoneModel(
					userData.phone,
					userData.email,
					client
				);
			} else if (!otpRequest.email) {
				await otpModel.updateOtpRequestEmailModel(
					userData.phone,
					userData.email,
					client
				);
			}

			//IF EMAIL IS PROVIDED FOR VERIFICATION, YOU SHOULD VERIFY THE PHONE HERE, OR VICE VERSA.
			//
			//

			// Create a new user and mark them as existing in the otp_requests table
			user = await userService.createUserService(userData, client);

			await otpModel.markUserExistsModel(phone, email, client);
		} else {
			// If the user exists in the otp_requests table, find the user in the users table
			if (email) {
				user = await userService.findUserByEmailService(email, client);
			} else {
				user = await userService.findUserByPhoneService(phone, client);
			}
		}

		const token = generateToken({
			id: user.id,
			phone: user.phone,
			email: user.email,
		});

		// Reset the OTP request to avoid reuse
		await otpModel.resetOtpRequestModel(phone, email, client);

		await client.query("COMMIT");

		// Prepare a success message
		const message = userExistsInOtpRequestTable
			? "User logged in successfully."
			: "User registered and logged in successfully.";
		return { user, token, message };
	} catch (error) {
		await client.query("ROLLBACK");
		logError(error);
		throw new InternalServerError(
			"Failed to verify OTP and handle user registration/login."
		);
	} finally {
		client.release();
	}
};
