/* global sails User Screentracking Repullbankaccount PayrollDetection */
/**
 * BanktransactionController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

'use strict';
const moment = require( "moment" );
const _ = require( "lodash" );
const fs = require( "fs" );

module.exports = {
	getbanktransaction: getbanktransaction,
	saveplaiddetails: saveplaiddetailsAction,
	updateUserdataPlaid: updateUserdataPlaidAction,
	saveplaidresponse: saveplaidresponse,
	saveloanoffer: saveloanoffer,
	createloandetails: createloandetailsAction,
	finalize: finalize,
	finalizeValidate: finalizeValidate,
	submitApplicationButton: submitApplicationButton
};

function getbanktransaction( req, res ) {
	const resstatusvalue = req.flash( "resstatus" );
	const message = req.flash( "resmessage" );
	const linkbankid = "";
	const linkaccountid = "";
	let userBankAccountres;
	let checkingcnt = 0;
	const applicationerror = req.session.applicationerror;
	req.session.applicationerror = "";
	const criteria = { id: req.session.userId };
	const ip = ( req.headers[ "x-forwarded-for" ] || req.headers[ "x-real-ip" ] || req.connection.remoteAddress ).replace( "::ffff:", "" ).replace( /^::1$/, "127.0.0.1" );
	User.findOne( criteria )
	.then( function( userDetails ) {
		return Screentracking.findOne( { user: userDetails.id, iscompleted: 0 } )
		.sort( "createdAt DESC" )
		.then( function( screenDetails ) {
			req.session.screentrackingId = screenDetails.id;
			// sails.log.info( "screenDetails",screenDetails );
			const startdate = moment().subtract( 180, "days" ).format( "YYYY-MM-DD" );
			const enddate = moment().format( "YYYY-MM-DD" );
			let totalpayroll = 0;
			const subTypeArray = [];
			const payRollArray = [];

			return Repullbankaccount.getRepullAccountList( screenDetails, userDetails.id )
			.then( function( bankAccountList ) {
				// sails.log.info( "bankAccountList", bankAccountList );
				sails.log.info( "bankAccountList.status", bankAccountList.status );
				if( bankAccountList.status == 200 ) {
					userBankAccountres = bankAccountList.data;

					// sails.log.info( "userBankAccountres==========",userBankAccountres );

					return Repullbankaccount.getMultiloanRepull( screenDetails, userDetails.id, userBankAccountres )
					.then( function( bankAccount ) {
						// console.log( "bankAccount: %j", bankAccount );
						const userBankAccount = bankAccount.userBankAccount;
						let accountTransactions = [];
						_.forEach( userBankAccount, function( userbankData ) {

							_.forEach( userbankData.accounts, ( account ) => {
								if( account.subtype !== "credit card" ) {
									account.institutionName = userbankData.institutionName;
									account.bankid = userbankData.id;
									subTypeArray.push( account );
								}
								if( account.subtype == "checking" ) {
									checkingcnt++;
								}
							} );

							/* ==============PAY DATE Ticket Update ========================== */
							// console.log( "userbankData: %j", userbankData );

							_.forEach( userbankData.transactions, function( transactions ) {
								accountTransactions = accountTransactions.concat( transactions );
							} );
							/* ==============PAY DATE Ticket Update ========================== */
						} );

						const payrollDetected = PayrollDetection.getInfo( accountTransactions, userDetails.id );
						// sails.log.info( "BanktransactionController.getbanktransactionAction; payrollDetected:", JSON.stringify( payrollDetected ) );
						const payrolldata = payrollDetected.payrolls;
						payrollDetected.transactions.forEach( ( transaction ) => {
							if( transaction.date < startdate || transaction.date > enddate ) {
								return;
							}
							const payRollItem = _.clone( transaction );
							payRollItem.amount = Math.abs( parseFloat( payRollItem.amount ) ).toLocaleString( "en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 } );
							payRollItem.category = payRollItem.category.join( ", " );
							payRollArray.push( payRollItem );
							// sails.log.info( "BanktransactionController.getbanktransactionAction; payRollItem: %j", payRollItem );
						} );

						totalpayroll = payrollDetected.annualIncome;
						sails.log.info( "BanktransactionController.getbanktransactionAction; totalpayroll:", totalpayroll );

						// if( totalpayroll > 0 ) {
						// 	totalpayroll = parseFloat( ( totalpayroll / sails.config.plaid.grossIncomeRate ).toFixed( 2 ) );
						// 	sails.log.info( "BanktransactionController.getbanktransactionAction; totalpayroll w/ grossIncomeRate:", totalpayroll );
						// }

						const screenUpdate = { totalpayroll: totalpayroll, payrolldata: payrolldata, lastlevel: 3 };
						return Screentracking.update( { id: screenDetails.id }, screenUpdate )
						.then( ( updated ) => {
							const screentracking = updated[ 0 ];
							return ApplicationService.getProductRuleBanking( screentracking )
							.catch( ( err ) => {
								sails.log.error( "getbanktransaction; catch:", err );
							} )
							.then( () => {
								req.session.levels = 3;
								return res.redirect( "/myoffers" );
							} );
						} );
					} );
				} else {
					const userBankAccount = [];
					const templateData = {
						user: userDetails,
						accountDetails: subTypeArray,
						payRollArray: payRollArray,
						userBankAccount: userBankAccount,
						status: resstatusvalue,
						message: message,
						ip: ip,
						agreementObject: { date: moment().format( "MM/DD/YYYY" ) },
						username: `${userDetails.firstname} ${userDetails.lastname}`,
						screenDetails: screenDetails,
						totalpayroll: totalpayroll,
						incomeamount: screenDetails.incomeamount,
						linkaccountid: linkaccountid,
						linkbankid: linkbankid
					};
					// return res.view( "frontend/banktransaction/getbankdetails", templateData );
					return res.view( "frontend/banktransaction/getbankdetails", templateData );
				}
			} )
			.catch( function( err ) {
				sails.log.error( "BanktransactionController.getbanktransactionAction; catch:", err );
				const responsedata = { status: 400, message: "You are not allowed to change bank accounts." };
				return res.view( "frontend/banktransaction/getbankdetails", responsedata );
			} );
		} )
		.catch( function( err ) {
			sails.log.error( "BanktransactionController.getbanktransactionAction; catch:", err );
			const responsedata = { status: 400, message: "You are not allowed to change bank accounts." };
			return res.view( "frontend/banktransaction/getbankdetails", responsedata );
		} );
	} )
	.catch( function( err ) {
		sails.log.error( "BanktransactionController.getbanktransactionAction; catch:", err );
		const responsedata = { status: 400, message: "You are not allowed to change bank accounts." };
		return res.view( "frontend/banktransaction/getbankdetails", responsedata );
	} );
}

function saveplaidresponse( req, res ) {
	// var payID = req.param( "payid" );
	// var bankToken = req.param( "bankToken" );
	var public_token = req.param( "public_token" );
	let account_id = req.param( "account_id" );
	var institutionName = account_id.institution.name;
	var institutionType = account_id.institution.institution_id;
	var user = req.user;

	const plaiddata = {
		public_token: public_token,
		account_id: account_id,
		institutionName: institutionName,
		institutionType: institutionType,
		userid: req.session.userId,
		useremail: user.email
	};
	var plaiddatares = JSON.stringify(plaiddata);
	fs.appendFileSync( "logs/plaidResponse" + req.session.userId + "_" + moment().format( "YYYY-MM-DD-hh-mm-ss") + ".txt", plaiddatares );
	User.findOne( { id: req.session.userId } )
	.then( function( userDetails ) {
		return Screentracking.findOne( { user: userDetails.id, iscompleted: 0 } )
		.sort( "createdAt DESC" )
		.then( function ( screenDetails ) {
			if( ! screenDetails ) {
				return Promise.reject( new Error( "missing screen details" ) );
			}
			return InstitutionService.generateAccessToken( public_token )
			.then( function( access_token ) {
				var token = access_token.access_token;
				return InstitutionService.accountDetail( token )
				.then( function( accountDetails ) {
					sails.log.info( "accountDetails1111111:", accountDetails );
					sails.log.info( "session:", req.session );
					return UserBankAccount.createInstitutionDetail( institutionName, institutionType, accountDetails, userDetails, token, screenDetails.id )
					.then( function( userBankAccntDet ) {
						sails.log.info( "userBankAccntDet:", userBankAccntDet );
						if( ! userBankAccntDet ) {
							res.contentType( "application/json" );
							return res.json( { status: 400, message: "Your bank account details not saved." } );
						}
						return Repullbankaccount.getRepullAccountList( screenDetails, userDetails.id )
						.then( function ( bankAccountlist ) {
							sails.log.info( "bankAccountlist", bankAccountlist );
							let userAccntDet;
							let userBankAccountId;
							if ( bankAccountlist.status != 200 ) {
								return Promise.reject( new Error( "missing bank details" ) );
							}
							var userBankAccountres = bankAccountlist.data;
							return Repullbankaccount.getMultiloanRepull( screenDetails, userDetails.id, userBankAccountres )
							.then( function ( bankAccount ) {
								var userBankAccount = bankAccount.userBankAccount;
								let accountTransactions = [];
								_.forEach( userBankAccount, function ( userbankData ) {
									userBankAccountId = userbankData.id;
									_.forEach( userbankData.transactions, function ( transactions ) {
										accountTransactions = accountTransactions.concat( transactions );
									} );
								} );

								// sails.log.verbose( "BanktransactionController.saveplaidresponse; accountTransactions:", JSON.stringify( accountTransactions ) );
								const payrollDetected = PayrollDetection.getInfo( accountTransactions, userDetails.id );
								sails.log.info( "BanktransactionController.saveplaidresponse; payrollDetected:", JSON.stringify( payrollDetected ) );
								const payrolldata = payrollDetected.payrolls;

								var totalpayroll = payrollDetected.annualIncome;
								sails.log.info( "BanktransactionController.saveplaidresponse; totalpayroll:", totalpayroll );

								// if ( totalpayroll > 0 ) {
								// 	totalpayroll = parseFloat( ( totalpayroll / sails.config.plaid.grossIncomeRate ).toFixed( 2 ) );
								// 	sails.log.info( "BanktransactionController.saveplaidresponse; totalpayroll w/ grossIncomeRate:", totalpayroll );
								// }

								var bankId;
								var itemId;
								return Screentracking.update( { user: req.session.userId }, { totalpayroll: totalpayroll, payrolldata: payrolldata } )
								.then( () => {
									userBankAccount.some( ( bankdetails ) => {
										bankdetails.accounts.some( ( accountDetail ) => {
											if( accountDetail.subtype !== "credit card" ) {
												bankId = bankdetails.id;
												itemId = accountDetail._id;
												return true;
											}
										} );
										if( bankId && itemId ) return true;
									} );
									fs.appendFileSync( "logs/plaidResponse" + req.session.userId + "_" + moment().format( "YYYY-MM-DD-hh-mm-ss" ) + ".txt", "itemId = " + itemId + "\n\n\n" );
									fs.appendFileSync( "logs/plaidResponse" + req.session.userId + "_" + moment().format( "YYYY-MM-DD-hh-mm-ss" ) + ".txt", "bankId = " + bankId + "\n\n\n" );
									return Account.createAccountDetail( userBankAccountId, userDetails, itemId, itemId, "", screenDetails.incomeamount )
									.then( function ( accDet ) {
										if( accDet ) {
											userAccntDet = accDet;
											return Account.update( { id: accDet.id }, { totalpayroll: screenDetails.totalpayroll, payrolldatearray: screenDetails.payrolldatearray } );
										}
										return Promise.reject( new Error( "missing account detail" ) );
									} );
								} )
								.then( () => {
									var lastlevel = 3;
									return Screentracking.updateLastScreenName( userDetails, "Select Account", lastlevel, userAccntDet, userAccntDet.id, "", [] )
									.then( function( screenTracking ) {
										res.contentType( "application/json" );
										return res.json( { status: 200, message: "success", bankid: bankId, bankaccount: itemId } );
									} );
								} );
							} );
						} );
					} );
				} );
			} )
			.catch( function( err ) {
				sails.log.error( "BanktransactionController.saveplaidresponse; catch:", err );
				res.contentType( "application/json" );
				res.json( { status: 400, message: "Your bank account details not saved." } );
			} );
		} );
	} )
	.catch( function( err ) {
		sails.log.error( "BanktransactionController.saveplaidresponse; catch:", err );
		res.contentType( "application/json" );
		res.json( { status: 400, message: "Your bank account details not saved." } );
	} );
}

function saveplaiddetailsAction(req,res) {

	//sails.log.info("Plaid called");

	var public_token = req.param('public_token');
	var account_id = req.param('account_id');
	req.session.first_name		= req.param('firstName');
	req.session.last_name 		= req.param('lastName');
	req.session.security_number = req.param('ssn');
	var institutionName = account_id.institution.name;
	var institutionType = account_id.institution.institution_id;
	var practimeManagementID = req.session.appPracticeId;


	const plaiddata = {
		public_token: public_token,
		account_id: account_id,
		institutionName: institutionName,
		institutionType: institutionType,
	  //userid:  user.id,
	  //useremail:  user.email
	};

	var plaiddatares = JSON.stringify(plaiddata);

	fs.appendFileSync('logs/plaidResponse_'+moment().format('YYYY-MM-DD-hh-mm-ss')+'.txt', plaiddatares);

		InstitutionService.generateAccessToken(public_token)
		 .then(function (access_token) {

			var token = access_token.access_token;

			//sails.log.info("token: ",token);

			 InstitutionService.accountDetail(token)
			   .then(function (accountDetails) {

					//sails.log.info("accountDetails11111asdff11: ");

					 UserBankAccount.createInstitutionDetail(institutionName, institutionType, accountDetails, '', token)
					 .then(function (userBankAccntDet) {

						   //sails.log.info("userBankAccntDet::::::::::::::",userBankAccntDet)
						   if(userBankAccntDet)
						   {
								//clicktosave starts here
								req.session.isplaidConnected	=	1;
								var clicktoSave =0;
								var applicationuserId='';
								if("undefined" !== typeof req.session.clicktosave && req.session.clicktosave != '' && req.session.clicktosave != null && req.session.clicktosave == '1'){
									clicktoSave = 1;
								}
 								//-- Register user details in user table
								User.registerNewPlaidUserApplication(userBankAccntDet,practimeManagementID,clicktoSave,req)
								.then(function (responseData) {
 									if(responseData.code==200)
									{
										var userData = responseData.userData;
										var userID = responseData.userData.id;
										var userBankAccountID = responseData.plaidData.userBankAccount;
										var plaidID = responseData.plaidData.id;

										var bankcriteria ={ id: userBankAccountID};
										var updatecriteria ={ user: userID };

										var plaidcriteria ={ id: plaidID};

										UserBankAccount.update(bankcriteria,updatecriteria)
										.exec(function afterwards(err, updated){

										   PlaidUser.update(plaidcriteria,updatecriteria)
										   .exec(function afterwards(err, updated){
 												Screentracking.createLastScreenName('Plaid',2,responseData.userData,'','','').then(function (screenObj) {

													//Added for ticket no 2756 to find out the application type.
													var screenCriteria	=	{ id: screenObj.id };
													Screentracking.update(screenCriteria,{applicationType:"Application wizard"}).
													exec(function afterwards(err, screentrackingupdated){});

													//req.session.userId = userID;
													req.session.applicationuserId = userID;
													req.session.userEmail = userData.email;
													if(!req.session.Electronicsign){ req.session.Electronicsign = ''; }

													//var userCriteria = {id:req.session.userId}
													var userCriteria = {id:req.session.applicationuserId};
													User.update(userCriteria, {consentsChecked: req.session.Electronicsign}).exec(function afterwards(err, applicationfeeupdated){});

													var json = {
														status: 200,
														message: 'success'
													};
													res.contentType('application/json');
													res.json(json);
												});
 											});
										});
									}
									else if(responseData.code==300)
									{
										var plaiduserDetails = responseData.plaidData;
										var isuserInput= plaiduserDetails.isuserInput;

										var userBankAccountID = plaiduserDetails.userBankAccount;
										var plaidID = plaiduserDetails.id;


										req.session.isplaidEmpty = isuserInput;
										req.session.tempplaidID = plaidID;
										req.session.tempuserBankAccountID = userBankAccountID;

										var json = {
											status: 200,
											message: 'Empty plaid user data'
										};
										res.contentType('application/json');
										res.json(json);
									}
									else if(responseData.code==500)
									{
										var json = {
											status: 400,
											message: 'Your email address already exist in system.'
										};
										res.contentType('application/json');
										res.json(json);
									}
									else
									{
										var json = {
											status: 400,
											message: 'Unable to register. Try again'
										};
										res.contentType('application/json');
										res.json(json);
									}
								})
								.catch(function (err) {
										var json = {
											status: 400,
											message: 'Unable to register. Try again'
										};
										res.contentType('application/json');
										res.json(json);
								});
						   }
						   else
						   {
								var json = {
									status: 400,
									message: 'Your bank account details not saved.'
								};
								res.contentType('application/json');
								res.json(json);
						   }



							//sails.log.info("userBankAccntDet: ",userBankAccntDet);

							//req.session.userId = userBankAccntDet.userData.id;
							//req.session.userEmail = userBankAccntDet.userData.email;
							//if(!req.session.Electronicsign){ req.session.Electronicsign = ''; }

							//var userCriteria = {id:req.session.userId}
							//User.update(userCriteria, {consentsChecked: req.session.Electronicsign}).exec(function afterwards(err, applicationfeeupdated){});

						   /*if(userBankAccntDet)
						   {
								var json = {
									status: 200,
									message: 'success'
								};
								res.contentType('application/json');
								res.json(json);
						   }
						   else
						   {
								var json = {
									status: 400,
									message: 'Your bank account details not saved.'
								};
								res.contentType('application/json');
								res.json(json);
						   }*/
					});
			 })
			.catch(function (err) {
				var json = {
					status: 400,
					message: 'Your bank account details not saved.'
				};
				res.contentType('application/json');
				res.json(json);
			})
		});
}

function updateUserdataPlaidAction(req,res) {

	//sails.log.info("Update fun");

	var ssnNumber = req.param('ssnNumber');
	//var userId = req.session.userId;
	var userId = req.session.applicationuserId;
	var userCriteria = {id:userId};

	sails.log.info("userCriteria ",userCriteria);
	sails.log.info("ssnNumber ",ssnNumber);

	User.update(userCriteria, {ssnNumber: ssnNumber})
	.exec(function afterwards(err, userUpdated){

		var json = {
			status: 200,
			message: 'success'
		};
		res.contentType('application/json');
		res.json(json);
	});

}

function saveloanoffer( req, res ) {
	res.contentType( "application/json" );
	// var fullOffer= JSON.parse(req.param('fullOffer'));

	const screenid = req.param( "screenid" );
	const loanId = req.param( "loanId" );

	const userDetails = { id: req.session.userId };
	const lastlevel = 4;

	Screentracking.findOne( { id: screenid } )
	.populate( "user" )
	.then( ( screentracking ) => {
		if( ! screentracking ) {
			const err = new Error( `Screentracking: document not found by id: ${screenid}` );
			// sails.log.error( "BanktransactionController.saveloanofferAction; Screentracking.findOne() error:", err );
			return Promise.reject( err );
		}
		// const offers = screentracking.offers;
		const loanIdx = ( parseInt( loanId ) - 1 );
		const selectedOffer = screentracking.offers[ loanIdx ];
		// const selectedOffer = {};
		// for( let idx = 0; idx < offers.length; idx++ ) {
		// 	if( offers[ idx ].loanID == loanid ) {
		// 		offer = offers[ idx ];
		// 		break;
		// 	}
		// }

		// offer.downpayment = 1500; // FIXME: Downpayment will be calculated when the offers are generated.
		/* this is weird stuff.  We are translating a patientfi offer into loantopia offerdata object */
		// selectedOffer.downpayment = offer.downpayment;
		// selectedOffer.loanId = offer.loanID;
		// selectedOffer.apr = offer.apr.toString();
		// selectedOffer.payment = offer.monthpayment;
		// selectedOffer.financedAmount = offer.financedAmount;
		// selectedOffer.financedAmount = offer.finalrequestedloanamount;
		// selectedOffer.interestRate = offer.interestRate.toString();
		// selectedOffer.loanTerm = offer.loanTerm.toString();
		// // selectedOffer.contractDate = new Date( parseInt( offer.LoanSetup.contractDate.replace( /[^\d]/g, "" ) ) * 1000 );
		// // selectedOffer.firstPaymentDate = new Date( parseInt( offer.LoanSetup.firstPaymentDate.replace( /[^\d]/g, "" ) ) * 1000 );
		// selectedOffer.paymentFrequency = "loan.frequency." + offer.paymentfreq;
		// selectedOffer.financeCharge = offer.interestfeeamount;
		// selectedOffer.totalOfPayments = ( selectedOffer.financedAmount + parseInt( offer.interestfeeamount ) ).toString();
		// selectedOffer.state = screentracking.user.state;
		return Screentracking.updateLastScreenName( userDetails, "Loan Offer Details", lastlevel, "", "", "", [ selectedOffer ] );
	} )
	.then( ( screenTracking ) => {
		req.session.levels = lastlevel;
		return res.json( { "success": true } );
	} )
	.catch( ( err ) => {
		sails.log.error( "BanktransactionController#saveloanofferAction :: err :", err );
		return res.handleError( err );
	} );
}

function createloandetailsAction( req, res ) {
	var userId = req.session.userId;
	// sails.log.info( "JH BanktransactionController.js createloandetailsAction userId", userId );

	Screentracking.findOne( { user: userId, iscompleted: [ 0, 1 ] } )
	.sort( "createdAt DESC" )
	.then( ( screentracking ) => {
		var creditscore = screentracking.creditscore;
		//sails.log.info('screentracking---- : ', screentracking);
		return User.findOne( { id: userId } )
		.then( ( userDetails ) => {
			//sails.log.info('userDetails ',userDetails);
			return PaymentManagement.createLoanPaymentSchedule( screentracking )
			.then( ( paymentDetails ) => {
				if( paymentDetails == "" || paymentDetails == null || "undefined" == typeof paymentDetails ) {
					return;
				}
				req.session.levels = 5;
				screentracking.lastlevel = 5;
				screentracking.lastScreenName = "Finalize";
				return screentracking.save()
				.then( ( updated ) => {
					return User.update( { id: screentracking.user }, { isExistingLoan: true } )
					.then( ( userupdated ) => {
						//badlist update in payment
						if( userupdated[ 0 ].badList == 1 ) {
							PaymentManagement.update( { id: paymentDetails.id }, { blockedList: ( screentracking.blockedList == true ? true : false ) } ).exec( ( err, updated ) => {} );
						} else {
							PaymentManagement.update( { id: paymentDetails.id }, { blockedList: false } ).exec( ( err, updated ) => {} );
						}
						// return Transunions.findOne( { id: screentracking.transunion } )
						// .then( ( userres ) => {
						return PaymentManagement.update( { id: paymentDetails.id }, { creditScore: creditscore } )
						.then( ( userupdated ) => {
							return Achdocuments.find( { user: screentracking.user } )
							.then( ( AchdocumentsDetails ) => {
								if ( "undefined" !== typeof AchdocumentsDetails && AchdocumentsDetails != "" && AchdocumentsDetails != null ) {
									const promiseAll = [];
									AchdocumentsDetails.forEach( ( achDoc ) => {
										promiseAll.push( Achdocuments.update( { user: screentracking.user }, { paymentManagement: paymentDetails.id } ) );
									} );
									return Promise.all( promiseAll );
								}
								return Achdocuments.find( { paymentManagement: screentracking.id } )
								.then( ( AchdocumentsDetails ) => {
									if ( "undefined" == typeof AchdocumentsDetails || AchdocumentsDetails == "" || AchdocumentsDetails == null ) {
										return;
									}
									const promiseAll = [];
									AchdocumentsDetails.forEach( ( achDoc ) => {
										promiseAll.push( Achdocuments.update( { paymentManagement: screentracking.id }, { paymentManagement: paymentDetails.id } ) );
									} );
									return Promise.all( promiseAll );
								} );
							} );
						} );
					// } );
					} );
				} );
			} );
		} )
		.then( () => {
			req.session.levels = 5;
			screentracking.lastlevel = 5;
			return screentracking.save()
			.then( () => {
				return res.redirect( "/finalize" );
			} );
		} )
	} )
	.catch( ( err ) => {
		sails.log.error( "BanktransactionController#addconsolidateAction :: err", err );
		return res.handleError( err );
	} );
}

function mytest( req, res ) {
	console.log("hello world!");
}

function finalize( req, res ) {
	const userId = req.session.userId;
	let errorval = "";
	let successval = "";
	let emailSent = "";
	let emailerr = "";

	if( ! userId ) {
		return res.view( "frontend/banktransaction/finalize" );
	}

	errorval = ( req.session.errorval != "" ? req.session.errorval : "" );
	successval = ( req.session.successval != "" ? req.session.successval : "" );
	emailSent = ( req.session.emailSent != "" ? req.session.emailSent : "" );
	req.session.errorval = "";
	req.session.successval = "";
	req.session.emailSent = "";

	if( req.session.emailerr != "" ) {
		emailerr = req.session.emailerr;
		req.session.emailerr = "";
	}

	User.findOne( { id: userId } )
	.then( ( userData ) => {
		return Achdocuments.find( { user: userId } )
		.populate( "proofdocument" )
		.then( function( achDocs ) {
			var emailAddress = userData.email;

			const docuploaded = {
				emailVer: userData.isEmailVerified,
				govIDDoc: false,
				payrollDoc: false,
				payroll2Doc: false,
				utilityDoc: false,
				debitCardDoc: false,
				voidCheckDoc: false,
				isBankAdded: userData.isBankAdded
			};

			var documenttype = {
				documenttype1: sails.config.loanDetails.doctype1,
				documenttype2: sails.config.loanDetails.doctype2,
				documenttype3: sails.config.loanDetails.doctype3,
				documenttype4: sails.config.loanDetails.doctype4,
				documenttype5: sails.config.loanDetails.doctype5,
				documenttype6: sails.config.loanDetails.doctype6,
				documenttype7: sails.config.loanDetails.doctype7
			};
			const documentimage = {
				documentimage1: "",
				documentimage2: "",
				documentimage3: "",
				documentimage4: "",
				documentimage5: "",
				documentimage6: "",
				documentimage7: []
			};

			const otherdocuments = [];

			let prevDate1;
			let prevDate2;
			let prevDate3;
			let prevDate4;
			let prevDate5;
			let prevDate6;

			achDocs.forEach( ( documentvalue ) => {
				if( documentvalue.proofdocument.isImageProcessed ) {
					sails.log.info( "documentvalue", documentvalue );
					if( documenttype.documenttype1 == documentvalue.docname ) { // doctype is govID
						if( documentimage.documentimage1 != "") { // already found one image
							if( prevDate1 < documentvalue.createdAt ) { // get the lastest upload to display
								documentimage.documentimage1 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
								prevDate1 = documentvalue.createdAt;
							}
						} else { // no previous image found
							documentimage.documentimage1 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							prevDate1 = documentvalue.createdAt;
							docuploaded.govIDDoc = true;
							sails.log.info("docuploaded.govIdDoc", docuploaded.govIdDoc);
						}
					} else if( documenttype.documenttype2 == documentvalue.docname ) { // doctype is payroll1
						if( documentimage.documentimage2 != "") { // already found one image
							if( prevDate2 < documentvalue.createdAt ) { // get the lastest upload to display
								documentimage.documentimage2 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
								prevDate2 = documentvalue.createdAt;
							}
						} else{ // haven't found image
							documentimage.documentimage2 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							prevDate2 = documentvalue.createdAt;
							docuploaded.payrollDoc = true;
						}
					} else if( documenttype.documenttype3 == documentvalue.docname ) { // doctype is payroll2
						if( documentimage.documentimage3 != "") { // already found one image
							if( prevDate3 < documentvalue.createdAt ) { // get the lastest upload to display
								documentimage.documentimage3 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
								prevDate3 = documentvalue.createdAt;
							}
						} else{ // haven't found image
							documentimage.documentimage3 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							prevDate3 = documentvalue.createdAt;
							docuploaded.payroll2Doc = true;
						}
					} else if( documenttype.documenttype4 == documentvalue.docname ) { // doctype is utility bill
						if( documentimage.documentimage4 != "") { // already found one image
							if( prevDate4 < documentvalue.createdAt ) { // get the lastest upload to display
								documentimage.documentimage4 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
								prevDate4 = documentvalue.createdAt;
							}
						} else { // haven't found image
							documentimage.documentimage4 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							prevDate4 = documentvalue.createdAt;
							docuploaded.utilityDoc = true;
						}
					} else if( documenttype.documenttype5 == documentvalue.docname ) { // doctype is debit card
						if( documentimage.documentimage5 != "") { // already found one image
							if( prevDate5 < documentvalue.createdAt ) { // get the lastest upload to display
								documentimage.documentimage5 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
								prevDate5 = documentvalue.createdAt;
							}
						} else { // haven't found image
							documentimage.documentimage5 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							prevDate5 = documentvalue.createdAt;
							docuploaded.debitCardDoc = true;
						}
					} else if( documenttype.documenttype6 == documentvalue.docname ) { // doctype is void check
						if( documentimage.documentimage6 != "") { // already found one image
							if( prevDate6 < documentvalue.createdAt ) { // get the lastest upload to display
								documentimage.documentimage6 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
								prevDate6 = documentvalue.createdAt;
							}
						} else{ // haven't found image
							documentimage.documentimage6 = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							prevDate6 = documentvalue.createdAt;
							docuploaded.voidCheckDoc = true;
						}
					} else { // doctype others
							documentvalue.proofdocument.standardResolution = Utils.getS3Url( documentvalue.proofdocument.standardResolution );
							otherdocuments.push( documentvalue );
							sails.log.info("otherdocuments ", otherdocuments );
					}
				}
			} );

			let todocount = 0;
			if( ! docuploaded.emailVer ) ++todocount;
			if( ! docuploaded.isBankAdded ) ++todocount;
			if( ! docuploaded.govIDDoc ) ++todocount;
			if( ! docuploaded.payrollDoc ) ++todocount;
			if( ! docuploaded.payroll2Doc ) ++todocount;
			if( ! docuploaded.utilityDoc ) ++todocount;
			if( ! docuploaded.debitCardDoc ) ++todocount;
			if( ! docuploaded.voidCheckDoc ) ++todocount;

			return PaymentManagement.findOne( { user: userId } )
			.then( function( paymentData ) {
				return Screentracking.findOne( { user: userId } )
				.then( function( screendata ) {
					let oboToken = "";
					return finalizeValidateInternal( userId )
					.then( ( validationError ) => {
						const tplData = {
							emailAddress: emailAddress,
							docuploaded: docuploaded,
							todocount: todocount,
							user: userData,
							paymentmanagementdata: paymentData,
							screentrackingdetails: screendata,
							achDocs: achDocs,
							errorval: errorval,
							successval: successval,
							documenttype: documenttype,
							documentimage: documentimage,
							otherdocuments: otherdocuments,
							emailSent: emailSent,
							emailerr: emailerr,
							pciwalletToken: ( userData.hasOwnProperty( "pciwalletToken" ) ? userData.pciwalletToken : null ),
							oboToken: oboToken,
							mobileOptedIn: ( userData.hasOwnProperty( "mobileOptedIn" ) ? userData.mobileOptedIn : false ),
							numberIsMobile: ( userData.hasOwnProperty( "phoneIsMobile" ) ? userData.phoneIsMobile : false ),
							mobileNumber: ( userData.hasOwnProperty( "phoneNumber" ) ? userData.phoneNumber : "" ),
							validated: ( validationError == null )
						};
						return res.view( "frontend/banktransaction/finalize", tplData );
					} );
				} );
			} );
		} );
	} )
	.catch( ( err ) => {
		sails.log.error( "BanktransactionController#finalizeAction err:", err );
		return res.handleError( err );
	} );
}

function finalizeValidateInternal( userId ) {
	return User.findOne( { id: userId } )
	.then( ( userData ) => {
		/* check for email address */
		if( !userData.email || userData.email.length == 0 ) {
			return "Email Address is required.";
		}

		/* check that email has been validated */
		if( !userData.isEmailVerified ) {
			return "Email has not been verified.";
		}

		/* check for phone  */
		if( !userData.phoneNumber || userData.phoneNumber.length == 0 ) {
			return "Mobile phone is required.";
		}

		/* check that phone is validated */
		if( !userData.isPhoneVerified ) {
			return "Mobile phone has not been verified.";
		}

		return null;
	} )
	.catch( () => {
		return "Failed to find user.";
	} );
}

function finalizeValidate( req, res ) {
	const userId = req.session.userId;
	return finalizeValidateInternal( userId )
	.then( ( err ) => {
		const json = {};
		if( err ) {
			json.status = 400;
			json.error = err;
		} else {
			json.status = 200;
		}
		res.contentType( "application/json" );
		return res.status( json.status ).json( json );
	} );
}

function submitApplicationButton( req, res ) {
	const userid = req.param( "userid" );
	sails.log.info( "BanktransactionController.js submitApplicationButtonAction userid= " + userid );

	// then change status in paymentmanagement from INCOMPLETE -> PENDING && lastlevel in screentracking from 6 -> 7
	User.findOne( { id: userid } )
	.then( function( userData ) {
		return Screentracking.findOne( { $and: [ { user: userid }, { iscompleted: { $ne: 2 } } ] } )
		.then( function( screentrackingData ) {
			screentrackingData.lastlevel = 6;
			screentrackingData.iscompleted = 1;
			screentrackingData.save( function( err ) {
				if( err ) {
					sails.log.info( "JH UserController.js submitApplicationButtonAction screentrackingData.save err: ", err );
					return res.redirect( "/finalize" );
				}
				return res.redirect( "/dashboard" );
			} );
			return PaymentManagement.findOne( { screentracking: screentrackingData.id } )
			.then( function( paymentmanagementData ) {
				paymentmanagementData.status = "PENDING";
				paymentmanagementData.achstatus = 0;
				paymentmanagementData.save( function( err ) {
					if( err ) {
						sails.log.info( "JH UserController.js submitApplicationButtonAction paymentmanagementdata.save err: ", err );
						return res.redirect( "/finalize" );
					}
				} );
			} );
		} );
	} );
}
