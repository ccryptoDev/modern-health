/* global module, sails, User, PracticeManagement, Screentracking */

'use strict';

var moment = require('moment');
var Q = require('q');

var mailerConfig = sails.config.mailer;

module.exports = {
	/* sent to customer */
	senduserRegisterEmail: senduserRegisterEmail,
	profileEmailSend: profileEmailSend,
	sendforgotpasswordEmail: sendforgotpasswordEmail,
	sendFundedLoanMail: sendFundedLoanMail,
	sendNewOfferDetails: sendNewOfferDetails,
	sendUserRegisterByCustomerServiceEmail: sendUserRegisterByCustomerServiceEmail,
	continueApplicationEmail: continueApplicationEmail,
	sendAdminRegisterEmail: sendAdminRegisterEmail,
	/* sent to admins and customer service */
	sendAdminForgetPasswordEmail: sendAdminForgetPasswordEmail,
	changePasswordEmail: changePasswordEmail,
	resendInviteUrl: resendInviteUrl
};

/* sent to customer start */
function senduserRegisterEmail( user ) {
	const hostName = mailerConfig.hostName;
	// let hostName = "http://localhost:8300";
	const Link = hostName + "/emailverifylanding/" + user.id;
	const email = user.email;
	const name = user.firstname;
	const rolename = user.rolename;

	User.findOne( { email: user.email } )
	.then( ( registermailforuser ) => {
		PracticeManagement.findOne( { id: registermailforuser.practicemanagement } )
		.then( ( practicemanagement ) => {
			sails.renderView( 'emailTemplates/userregisteremail', {
				layout: false,
				Link: Link,
				practiceName: practicemanagement.PracticeName,
				email: email,
				name: name,
				rolename: rolename,
				registermailforuser: registermailforuser,
				hostName: hostName
			}, ( err, view ) => {
				if( err ) {
					sails.log.error('Email template for Forgot password error',err);
				} else {
					const mailer = mailerConfig.contactAccount;
					const mailOptions = {
						from: mailerConfig.sender,
						to: user.email,
						subject: 'Registration Success',
						html: view
					};
					mailer.sendMail(mailOptions, function (error, info) {
						if (error) {
							sails.log.error('Mailer error', error);
							console.log('Mailer error', error);
						}
						sails.log.info('Message sent: ', info);
					});
				}
			});
		});
	});
	return;
}

function profileEmailSend( userdetails ) {
	sails.log.info( "EmailService.profileEmailSend userdetails:", userdetails );
	const hostName = mailerConfig.hostName;
	// const hostName = "http://localhost:8300";
	const Link = hostName + "/emailverifylanding/" + userdetails.id;
	const email = userdetails.email;
	const name = userdetails.firstname;
	const rolename = userdetails.rolename;

	return User.findOne( { email: userdetails.email } )
	.then( (registermailforuser) => {
		return PracticeManagement.findOne( { id: registermailforuser.practicemanagement } )
		.then( ( practicemanagement ) => {
			return new Promise( ( resolve, reject ) => {
				sails.renderView( "emailTemplates/profileEmail",{
					layout: false,
					Link: Link,
					email: email,
					name: name,
					practiceName: practicemanagement.PracticeName,
					rolename: rolename,
					registermailforuser: registermailforuser,
					hostName: hostName
				}, function( err, view ) {
					if( err ) {
						sails.log.error( 'Email template for Forgot password error', err );
						return reject( err );
					} else {
						const mailer = mailerConfig.contactAccount;
						const mailOptions = {
							from: mailerConfig.sender,
							to: userdetails.email,
							subject: 'Account Verification',
							html: view
						};
						mailer.sendMail( mailOptions, function( error, info ) {
							if( error ) {
								sails.log.error( 'Mailer error', error );
								console.log( 'Mailer error', error );
								return reject( error );
							}
							sails.log.info('Message sent: ', info);
							// console.log('Message %s sent: %s', info.messageId, info.response);
							return resolve();
						} );
					}
				} );
			});
		});
	} );
}

function sendforgotpasswordEmail( user ) {
	const hostName = mailerConfig.hostName;
	// const hostName = "http://localhost:8300";
	const Link = hostName + '/usersetpassword/' + user.id;

	User.findOne( { email: user.email } )
	.then(function( forgotpassworddetail ) {
		PracticeManagement.findOne( { id: forgotpassworddetail.practicemanagement } )
		.then( ( practicemanagement ) => {
			sails.renderView('emailTemplates/userforgetpassword', {
				layout: false,
				Link: Link,
				practiceName: practicemanagement.PracticeName,
				user: user,
				name: forgotpassworddetail.firstname,
				forgotpassworddetail: forgotpassworddetail,
				hostName: hostName
			}, function( err, view ) {
				if( err ) {
				sails.log.error( 'Email template for Forgot password error', err );
				} else {
					const mailer= mailerConfig.contactAccount;
					const mailOptions = {
						from: mailerConfig.sender,
						to: user.email,
						subject: 'Forgot Password',
						html: view
					};
					mailer.sendMail(mailOptions, function (error, info) {
						if (error) {
							sails.log.error('Mailer error', error);
							console.log('Mailer error', error);
						}
						sails.log.info('Message sent: ', info);
					} );
				}
			} );
		} );
	} );
	return;
}

function sendFundedLoanMail( loanData ) {
	const currentDate = moment().format('MM-DD-YYYY');
	const hostName = mailerConfig.hostName;
	// const hostName = "http://localhost:8300";
	const loanReference = loanData.loanReference;
	const firstname = loanData.firstname;
	// var userLoginurl = hostName + '/signin';
	const Link = hostName + '/';

	PracticeManagement.findOne( { id: loanData.practiceId } )
	.then( ( practicemanagement ) => {
		sails.renderView('emailTemplates/loanFunded', {
			layout: false,
			currentDate: currentDate,
			practiceName: practicemanagement.PracticeName,
			hostName: hostName,
			loanReference: loanReference,
			name: firstname,
			Link: Link
		}, function( err, view ) {
			if (err) {
				sails.log.error('Email template rendering error', err);
			} else {
				const mailer = mailerConfig.contactAccount;
				const mailOptions = {
					from: mailerConfig.sender,
					to: loanData.email,
					subject: 'Agreement Approved',
					html: view
				};
				mailer.sendMail(mailOptions, function (error, info) {
					if (error) {
						sails.log.error('Mailer error', error);
						console.log('Mailer error', error);
					}
					sails.log.info('Message sent: ', info);
				} );
			}
		});
	} );
	return;
}

function sendNewOfferDetails( screenID ) {
	const hostName = mailerConfig.hostName;
	// const hostName = "http://localhost:8300";
	sails.log.info( "EmailService.sendNewOfferDetails screenID:", screenID );

	Screentracking.findOne( { id: screenID } )
	.populate('user')
	.populate('practicemanagement')
	.then( function( screenDetails ) {
		var offerData = screenDetails.offerdata[0];
		var userDetails = screenDetails.user;
		var Link = hostName + "/login";

		sails.renderView('emailTemplates/changeloanoffer', {
			layout: false,
			Link: Link,
			practiceName: screenDetails.practicemanagement.PracticeName,
			email: userDetails.email,
			name: userDetails.firstname,
			userDetails: userDetails,
			hostName: hostName,
			offerData: offerData
		}, function( err, view ) {
			if( err ) {
				sails.log.error( 'Email template for Notify from Denied error', err );
			} else{
				const mailer= mailerConfig.contactAccount;
				const mailOptions = {
					from: mailerConfig.sender,
					to: userDetails.email,
					subject: 'New Offer Available',
					html: view
				};
				mailer.sendMail( mailOptions, function( error, info ) {
					if( error ) {
						sails.log.error( 'Mailer error', error );
					}
					sails.log.info('Message sent: ', info);
				});
			}
		});
	});
	return;
}

function sendUserRegisterByCustomerServiceEmail( user, leadAPI ) {
	// const hostName = "http://localhost:8300";
	const hostName = mailerConfig.hostName;
	const userLoginurl = hostName + '/setpassword/' + user.user_id;
	PracticeManagement.findOne( { id: user.practicemanagement } )
	.then( ( practicemanagement ) => {
		sails.renderView( 'emailTemplates/registerNewUserByCustomerService', {
			layout: false,
			user: user,
			practiceName: practicemanagement.PracticeName,
			name: user.firstname,
			Link: userLoginurl
		}, function( err, view ) {
			if( err ) {
				sails.log.error( 'Email template rendering error', err );
			} else {
				const mailer = mailerConfig.contactAccount;
				const mailOptions = {
					from: mailerConfig.sender,
					to: user.email,
					subject: 'User Registration By Customer Service',
					html: view
				};
				mailer.sendMail(mailOptions, function (error, info) {
					if (error) {
						sails.log.error('Mailer error', error);
						console.log('Mailer error', error);
					}
					sails.log.info('Message sent: ', info);
					// console.log('Message %s sent: %s', info.messageId, info.response);
				} );
			}
		} );
	} );
   return;
}

function continueApplicationEmail( emailData ) {
	// const hostName = "http://localhost:8300";
	const hostName = mailerConfig.hostName;
	const email = emailData.userId;
	emailData.Link = hostName + "/user/confirm/set-password/" + email;
	// emailData.Link = `http://localhost:8300/user/confirm/set-password/${emailData.userId}`;
	// emailData.Link = `${mailerConfig.hostName}/user/confirm/set-password/${emailData.userId}`;
	PracticeManagement.findOne( { id: emailData.practicemanagement } )
	.then( ( practicemanagement ) => {
		emailData.practiceName = practicemanagement.PracticeName;
		sails.renderView( "emailTemplates/continueApplicationEmail", emailData, ( err, view ) => {
			if( err ) {
				sails.log.error( "continueApplicationEmail; err:", err );
				return;
			}
			const mailer = mailerConfig.contactAccount;
			const mailOptions = {
				from: mailerConfig.sender,
				to: emailData.toEmail,
				bcc: emailData.bccEmails,
				subject: "Please continue your application",
				html: view
			};
			mailer.sendMail( mailOptions, ( err, info ) => {
				if( err ) {
					sails.log.error( "continueApplicationEmail; mailer err:", err );
					return;
				}
				sails.log.info( "continueApplicationEmail; sent:", info );
			} );
		} );
	} );
}
/* sent to customer end */
/* sent to admins and customer service start */
function sendAdminForgetPasswordEmail( user ) {
	const adminLoginurl = mailerConfig.hostName+ '/AdminLogin';
	sails.renderView('emailTemplates/adminforgetpassword', {
		layout: false,
		user: user,
		name: user.name,
		Link: adminLoginurl
	}, function( err, view ) {
		if( err ) {
			sails.log.error( 'Email template rendering error', err );
		} else {
			const mailer = mailerConfig.contactAccount;
			const mailOptions = {
				from: mailerConfig.sender,
				to: user.email,
				subject: 'Admin Forget Password Request',
				html: view
			};
			mailer.sendMail(mailOptions, function (error, info) {
				if( error ) {
					sails.log.error('Mailer error', error);
					console.log('Mailer error', error);
				}
				sails.log.info('Message sent: ', info);
				// console.log('Message %s sent: %s', info.messageId, info.response);
			} );
		}
	} );
	return;
}

function changePasswordEmail( user ) {
	const adminLoginurl = mailerConfig.hostName + '/AdminLogin';
	sails.renderView('emailTemplates/changepasswordemail', {
		layout: false,
		user: user,
		name: user.name,
		Link: adminLoginurl
	}, function( err, view ) {
		if( err ) {
			sails.log.error('Email template rendering error', err);
		} else {
			const mailer = mailerConfig.contactAccount;
			const mailOptions = {
				from: mailerConfig.sender,
				to: user.email,
				subject: sails.config.lender.shortName + ' Admin password change notification',
				html: view
			};

			mailer.sendMail( mailOptions, function( error, info ) {
				if( error ) {
					sails.log.error('Mailer error', error);
					console.log('Mailer error', error);
				}
				sails.log.info('Message sent: ', info);
				// console.log('Message %s sent: %s', info.messageId, info.response);
			} );
		}
	} );
	return;
}

function sendAdminRegisterEmail( user ) {
	const adminLoginurl = mailerConfig.hostName + '/AdminLogin';
	sails.renderView('emailTemplates/adminregisteremail', {
		layout: false,
		user: user,
		name: user.name,
		Link: adminLoginurl
	}, function( err, view ) {
		if( err ) {
			sails.log.error('Email template rendering error', err);
		} else {
			const mailer = mailerConfig.contactAccount;
			const mailOptions = {
				from: mailerConfig.sender,
				to: user.email,
				subject: sails.config.lender.shortName + ' Admin login Access',
				html: view
			};
			mailer.sendMail(mailOptions, function( error, info ) {
				if( error ) {
					sails.log.error('Mailer error', error);
					console.log('Mailer error', error);
				}
				sails.log.info('Message sent: ', info);
				// console.log('Message %s sent: %s', info.messageId, info.response);
			} );
		}
	});
	return;
}

function resendInviteUrl( practiceData ) {
	// const hostName = mailerConfig.hostName;
	const hostName = "http://localhost:8300";
	const Link = practiceData.PracticeUrl;
	const emailId = practiceData.PracticeEmail;
	const name = practiceData.PracticeName;
	PracticeManagement.findOne( { PracticeEmail: emailId } )
	.then( function( practicedetail ) {
		sails.renderView('emailTemplates/resendinvite', {
			layout: false,
			Link: Link,
			// practiceName: practiceData.PracticeName,
			practiceData: practiceData,
			name: name,
			hostName: hostName
		}, function( err, view ) {
			if( err ) {
				sails.log.error( 'Email template for Practice Invite error', err );
			} else {
				const mailer= mailerConfig.contactAccount;
				const mailOptions = {
					from: mailerConfig.sender,
					to: emailId,
					subject: 'Invite Url',
					html: view
				};
				mailer.sendMail(mailOptions, function (error, info) {
					if (error) {
						sails.log.error('Mailer error', error);
						console.log('Mailer error', error);
					}
					sails.log.info('Message sent: ', info);
				} );
			}
		});
	});
	return;
}
/* sent to admins and customer service end */
