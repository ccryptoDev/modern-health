"use strict";

const nodemailer = require( "nodemailer" );

const SENDGRID_USER = "NickCurry1";
const SENDGRID_PASSWORD = "P4Q24H123";

const SENDGRID_EMAIL = "no-reply@modernhealthfinance.com";
const SENDGRID_DISPLAY_NAME = "Modern Health Finance";

module.exports.mailer = {
	hostName: getHostName(),
	sender: `${SENDGRID_DISPLAY_NAME} <${SENDGRID_EMAIL}>`,
	email_id: "no-reply@modernhealthfinance.com",

	/*
	 * Contact account ()
	 */
	contactAccount: nodemailer.createTransport( {
		service: "SendGrid",
		auth: {
			user: SENDGRID_USER,
			pass: SENDGRID_PASSWORD
		}
	} ),
	transporter: nodemailer.createTransport( {
		service: "SendGrid",
		auth: {
			user: SENDGRID_USER,
			pass: SENDGRID_PASSWORD
		}
	} )
};

function getHostName() {
	if( process.env.NODE_ENV === "development" ) {
		return "https://modern-health.alchemylms.com";
	} else if( process.env.NODE_ENV === "staging" ) {
		return "https://modern-health.alchemylms.com";
	} else if( process.env.NODE_ENV === "uat" ) {
		return "https://apply.modernhealthfinance.com";
	} else {
		return "https://apply.modernhealthfinance.com";
	}
}
