/* global sails, MathExt */
"use strict";

/**
 * TestController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const request = require( "request" );
const Q = require( "q" );
const _ = require( "lodash" );
const moment = require( "moment" );

const fs = require( "fs" );
const ip = require( "ip" );

module.exports = {
	testTransunioun: testTransuniounAction,
	testActumDebit: testActumDebitAction,
	testCheckActumPayment: testCheckActumPaymentAction,
	testStripeRecurringPayment: testStripeRecurringPaymentAction,
	testActumRecurringPayment: testActumRecurringPaymentAction,
	testRegeneratePromissoryNote: testRegeneratePromissoryNoteAction,
	testcheckCreditStatus: testcheckCreditStatusAction,
	testShowInterestRate: testShowInterestRateAction,
	updateLoansetting: updateLoansetting,
	testFundPracticeCreditPayment: testFundPracticeCreditPaymentAction,
	testMakeAmortizationSchedule: testMakeAmortizationSchedule
};

// --Actum debit recurring
function testActumRecurringPaymentAction( req, res ) {
	CronService.getAllActumDebitPayment( req, res )
	.then( function( responseData ) {
		const json = {
			status: 200,
			message: "Actum debit recurring payment success",
			responseData: responseData
		};
		res.contentType( "application/json" );
		res.json( json );
	} )
	.catch( function( err ) {
		sails.log.error( "Error:", err );

		const json = {
			status: 400,
			message: "Unable to perform actum debit recurring payment"
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}

// --stripe recurring for practice
function testStripeRecurringPaymentAction( req, res ) {
	CronService.getAllStripeRecurringPayment( req, res )
	.then( function( responseData ) {
		const json = {
			status: 200,
			message: "Stripe recurring payment success",
			responseData: responseData
		};
		res.contentType( "application/json" );
		res.json( json );
	} )
	.catch( function( err ) {
		sails.log.error( "Error:", err );

		const json = {
			status: 400,
			message: "Unable to perform stripe recurring payment"
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}

// --Actum check payment
function testCheckActumPaymentAction( req, res ) {
	// var history_id='80574575';
	const order_id = 18585977;

	ActumService.checkActumPaymentStatus( order_id )
	.then( function( responseData ) {
		sails.log.info( "Enter Actum responseData::", responseData );

		if( responseData.status == 200 ) {
			var json = {
				responseData: responseData
			};
		} else {
			var json = {
				responseData: responseData
			};
		}
		res.contentType( "application/json" );
		res.json( json );
	} )
	.catch( function( err ) {
		sails.log.error( "Error:", err );

		const json = {
			status: 400,
			message: "Unable to check payment status"
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}

// --Actum test debit
function testActumDebitAction( req, res ) {
	const userData = [];
	const accountData = [];
	const amount = "1.00";
	const IPFromRequest = req.headers[ "x-forwarded-for" ] || req.connection.remoteAddress;

	ActumService.processActumDebitPayment( userData, accountData, amount, IPFromRequest )
	.then( function( responseData ) {
		if( responseData.status == 200 ) {
			var json = {
				responseData: responseData
			};
		} else {
			var json = {
				responseData: responseData
			};
		}
		res.contentType( "application/json" );
		res.json( json );
	} )
	.catch( function( err ) {
		sails.log.error( "Error:", err );

		const json = {
			status: 400,
			message: "Unable to create debit transaction"
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}

function testTransuniounAction() {
	const apiuserRefNumber = sails.config.applicationConfig.apiuserRefNumber;
	const apiindustryCode = sails.config.applicationConfig.apiindustryCode;
	const apimemberCode = sails.config.applicationConfig.apimemberCode;
	const apiprefixCode = sails.config.applicationConfig.apiprefixCode;
	const apiKeyPassword = sails.config.applicationConfig.apiKeyPassword;
	const apiEnv = sails.config.applicationConfig.apiEnv;
	const apiPassword = sails.config.applicationConfig.apiPassword;

	const addressarray = {
		untiapt: "",
		street_name: "Deeboyer",
		city: "Lakewood	",
		state: "CA",
		zip_code: "90712"
	};

	const userArray = {
		first: "Anita",
		middle: "",
		last: "Abdo"
	};

	const transactionControl = {
		userRefNumber: apiuserRefNumber,
		subscriber: {
			industryCode: apiindustryCode,
			memberCode: apimemberCode,
			inquirySubscriberPrefixCode: apiprefixCode,
			password: apiPassword
		},
		options: {
			processingEnvironment: apiEnv,
			country: "us",
			language: "en",
			contractualRelationship: "individual",
			pointOfSaleIndicator: "none"
		}
	};

	const certificate = {
		key: "WAKPAMNIKEY.pem",
		crt: "WAKPAMNI.pem",
		password: apiKeyPassword
	};

	const userDetail = {
		id: "5b5efde2e7247064aa3bd5c1",
		email: "vigneshs002@gmail.com",
		dateofBirth: "04/22/1996"
	};

	Transunion.createcertificate( userArray, addressarray, "666429061", userDetail, transactionControl )
	.then( function( responseDetails ) {
		sails.log.info( "responseDetails", responseDetails );

		if( responseDetails.code == 200 ) {
			Screentracking.updateApplicationDetails( userDetail, addressarray )
			.then( function( applicationDetails ) {
				sails.log.info( "applicationDetails", applicationDetails );
			} )
			.catch( function( err ) {
				sails.log.error( "ApplicationService#createcertificate::Err ::", err );
				const responsedata = { code: 400, message: "Could not recieve your credit details" };
				return resolve( responsedata );
			} );
		}
	} )
	.catch( function( err ) {
		sails.log.error( "ApplicationService#createcertificate::Err ::", err );
		// return reject(err);
		const responsedata = {
			code: 400,
			message: "Could not recieve your credit details"
		};
		return resolve( responsedata );
	} );
}

// --Regenerate promissory note
function testRegeneratePromissoryNoteAction( req, res ) {
	let limitvalue = 1; // -- default
	if( "undefined" !== typeof req.param( "limitvalue" ) && req.param( "limitvalue" ) != "" && req.param( "limitvalue" ) != null ) {
		limitvalue = req.param( "limitvalue" );
	}

	const consentcriteria = {
		documentKey: "202",
		loanupdated: 1,
		paymentManagement: { $exists: true },
		regenerate: { $exists: false }
	};

	/* var criteriaID ='5c41e8f6cd3b1d763d6dec4d';
	var consentcriteria={
		id:criteriaID
	}*/

	UserConsent.find( consentcriteria )
	// .populate(user)
	// .populate(paymentManagement)
	.sort( "createdAt ASC" )
	.limit( limitvalue )
	.then( function( consentDetails ) {
		sails.log.info( "consentDetails.length:", consentDetails.length );

		if( consentDetails.length > 0 ) {
			const forlength = consentDetails.length;
			let loopcount = 0;
			let errorloopcount = 0;
			const lendingerrorloopcount = 0;
			_.forEach( consentDetails, function( consentData ) {
				const paymentDataId = consentData.paymentManagement;
				const userDataId = consentData.user;

				sails.log.info( "paymentId:", paymentDataId );
				sails.log.info( "userId:", userDataId );
				sails.log.info( "---------------------------:" );

				ApplicationService.reGeneratepromissorypdf( paymentDataId, userDataId, req, res )
				.then( function( generatedResponse ) {
					sails.log.info( "generatedResponse:", generatedResponse );

					if( generatedResponse ) {
						UserConsent.update( { id: consentData.id }, { regenerate: 1 } ).exec( function afterwards( err, updated ) {
							UserConsent.update( { id: generatedResponse.id }, { regenerate: 2 } ).exec( function afterwards( err, updated ) {
								loopcount++;

								if( loopcount == forlength ) {
									const json = {
										status: 200,
										message: "Consent count::" + forlength,
										loopcount: "Loop count::" + loopcount,
										errorloopcount: "Error Loop count::" + errorloopcount,
										lendingerrorloopcount: "Lending Error Loop count::" + lendingerrorloopcount
									};
									res.contentType( "application/json" );
									res.json( json );
								}

								/* UserConsent
							.reGenerateLendingDisclosureAgreement(paymentDataId,res,req)
							.then(function (lendingreponse) {

								sails.log.info("lendingreponse:",lendingreponse);

								if(lendingreponse.code==400)
								{
									errorloopcount++;
									lendingerrorloopcount++;
								}

								loopcount++;

								if(loopcount==forlength)
								{
									var json = {
										status:200,
										message:'Consent count::'+forlength,
										loopcount:'Loop count::'+loopcount,
										errorloopcount:'Error Loop count::'+errorloopcount,
										lendingerrorloopcount:'Lending Error Loop count::'+lendingerrorloopcount
									};
									res.contentType('application/json');
									res.json(json);
								}
							 })
							 .catch(function (err) {

									sails.log.info("Error:",err);

									loopcount++;
									errorloopcount++;
									lendingerrorloopcount++;

									if(loopcount==forlength)
									{
										var json = {
											status:200,
											message:'Consent count::'+forlength,
											loopcount:'Loop count::'+loopcount,
											errorloopcount:'Error Loop count::'+errorloopcount,
											lendingerrorloopcount:'Lending Error Loop count::'+lendingerrorloopcount
										};
										res.contentType('application/json');
										res.json(json);
									}
							 });*/
							} );
						} );
					} else {
						sails.log.info( "consent not generated:" );

						loopcount++;
						errorloopcount++;

						if( loopcount == forlength ) {
							const json = {
								status: 200,
								message: "Consent count::" + forlength,
								loopcount: "Loop count::" + loopcount,
								errorloopcount: "Error Loop count::" + errorloopcount,
								lendingerrorloopcount: "Lending Error Loop count::" + lendingerrorloopcount
							};
							res.contentType( "application/json" );
							res.json( json );
						}
					}
				} )
				.catch( function( err ) {
					sails.log.info( "Final Error:", err );

					loopcount++;
					errorloopcount++;

					if( loopcount == forlength ) {
						const json = {
							status: 200,
							message: "Consent count::" + forlength,
							loopcount: "Loop count::" + loopcount,
							errorloopcount: "Error Loop count::" + errorloopcount,
							lendingerrorloopcount: "Lending Error Loop count::" + lendingerrorloopcount
						};
						res.contentType( "application/json" );
						res.json( json );
					}
				} );
			} );
		} else {
			const json = {
				status: 400,
				message: "No consent found::" + consentDetails.length
			};
			res.contentType( "application/json" );
			res.json( json );
		}
	} )
	.catch( function( err ) {
		const json = {
			status: 500,
			message: err
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}

function testcheckCreditStatusAction( req, res ) {
	CronService.checkLenderCreditStatus( req, res )
	.then( function( responseData ) {
		const json = {
			status: 200,
			message: "Actum " + sails.config.lender.shortName + " Credit Status success",
			responseData: responseData
		};
		res.contentType( "application/json" );
		res.json( json );
	} )
	.catch( function( err ) {
		sails.log.error( "Error:", err );

		const json = {
			status: 400,
			message: "Unable to perform " + sails.config.lender.shortName + " Credit Status"
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}

function testShowInterestRateAction( req, res ) {
	const stateCode = req.param( "statecode" );
	const term = parseInt( req.param( "term" ) );
	const maxloanamount = parseInt( req.param( "amount" ) );

	const intcriteria = {
		stateCode: stateCode,
		term: term,
		maxloanamount: maxloanamount
	};

	// sails.log.info('testController#testShowInterestRateAction :: intcriteria::', intcriteria);

	Loaninterestrate.find( intcriteria )
	.then( function( interestData ) {
		const gradecriteria = {
			stateCode: stateCode,
			gradeterm: term,
			maxloanamount: maxloanamount
		};

		Loangradesettings.find( gradecriteria )
		.then( function( gradeData ) {
			interestData = _.orderBy( interestData, [ "maxcreditscore" ], [ "desc" ] );
			gradeData = _.orderBy( gradeData, [ "gradelevel" ], [ "asc" ] );

			const responseData = {
				interestData: interestData,
				gradeData: gradeData,
				interestlength: interestData.length,
				gradelength: gradeData.length,
				stateCode: stateCode,
				term: term,
				maxloanamount: maxloanamount
			};

			sails.log.info( "testController#testShowInterestRateAction :: responseData", responseData );

			res.view( "admin/showInterestRate", { responseData: responseData } );
		} )
		.catch( function( err ) {
			sails.log.error( "testController#testShowInterestRateAction :: err", err );
			const errors = err.message;
			res.view( "admin/error/404", {
				data: err.message,
				layout: "layout"
			} );
		} );
	} )
	.catch( function( err ) {
		sails.log.error( "testController#testShowInterestRateAction :: err", err );
		const errors = err.message;
		res.view( "admin/error/404", {
			data: err.message,
			layout: "layout"
		} );
	} );
}
function updateLoansetting( req, res ) {
	const loanOptions = {
		$or: [ { loansettingsupdated: { $eq: 0, $exists: true } }, { loansettingsupdated: { $exists: false } } ]
	};
	PracticeManagement.find( loanOptions ).then( function( practicedata ) {
		const practiceLength = practicedata.length;
		let loopCount = 0;
		_.forEach( practicedata, function( practice ) {
			const inputData = { practiceid: practice.id, enabledTerms: sails.config.plaid.interestTermsArr };
			LoanSettings.createPracticeLoansettings( inputData, function( loansetresponse ) {
				sails.log.info( "practice ID:", practice.id );
				PracticeManagement.update( { id: practice.id }, { loansettingsupdated: 1 } ).exec( function afterwards( err, updated ) {
					loopCount++;
					sails.log.info( "loop practice ID:", practice.id );
					sails.log.info( "loop counter value ", loopCount );
					sails.log.info( "=======================================" );
					if( loopCount == practiceLength ) {
						const json = {
							status: 200,
							message: "Updated",
							loopCount: loopCount,
							practiceLength: practiceLength
						};
						res.contentType( "application/json" );
						res.json( json );
					}
				} );
			} );
		} );
	} );
}

// --Actum Credit Payment
function testFundPracticeCreditPaymentAction( req, res ) {
	const IPFromRequest = ip.address();
	const practiceId = "5b803bf89db31e772cb06e14";

	// -- For testing
	const paybackAmount = "1.00";

	let creditStatus = 0;
	let failure_code = "";
	let failure_message = "";
	let message = "";

	PracticeManagement.findOne( { id: practiceId } )
	.then( function( practiceData ) {
		ActumService.processPracticeCreditPayment( practiceData, paybackAmount, IPFromRequest )
		.then( function( transactionDetail ) {
			sails.log.info( "transactionDetail::", transactionDetail );
			if( transactionDetail.status == 200 ) {
				const creditResponseData = transactionDetail.jsonObj;
				const creditStatusTxt = creditResponseData.status.toLowerCase();

				if( "undefined" !== typeof creditResponseData.authcode && creditResponseData.authcode != "" && creditResponseData.authcode != null ) {
					failure_code = creditResponseData.authcode;
				}

				if( "undefined" !== typeof creditResponseData.reason && creditResponseData.reason != "" && creditResponseData.reason != null ) {
					failure_message = creditResponseData.reason;
				}

				if( creditStatusTxt == "accepted" ) {
					creditStatus = 1;
					message = "Payment completed successfully";
				} else if( creditStatusTxt == "declined" ) {
					creditStatus = 2;
					message = "Unable to process credit payment: " + failure_message + " (" + failure_code + " )";
				} else if( creditStatusTxt == "verify" ) {
					creditStatus = 3;
					message = "Unable to process credit payment: " + creditStatusTxt;
				} else {
					creditStatus = 4;
					message = "Unable to process credit payment: " + failure_message + " (" + failure_code + " )";
				}

				var json = {
					status: 200,
					message: "Unable to perform actum credit payment",
					creditStatus: creditStatus,
					failure_code: failure_code,
					failure_message: failure_message,
					message: message
				};
				res.contentType( "application/json" );
				res.json( json );
			} else {
				var json = {
					status: 400,
					message: "Unable to perform actum credit payment"
				};
				res.contentType( "application/json" );
				res.json( json );
			}
		} )
		.catch( function( err ) {
			sails.log.error( "Error:", err );
			const json = {
				status: 400,
				message: "Unable to perform actum credit payment"
			};
			res.contentType( "application/json" );
			res.json( json );
		} );
	} )
	.catch( function( err ) {
		sails.log.error( "Error:", err );
		const json = {
			status: 400,
			message: "Unable to fetch practice details"
		};
		res.contentType( "application/json" );
		res.json( json );
	} );
}


function testMakeAmortizationSchedule( req, res ) {
	const reqParams = req.allParams();
	const principal = parseFloat( reqParams.principal );
	const payment = parseFloat( reqParams.payment );
	const interestRate = parseFloat( reqParams.interestRate );
	const term = parseFloat( reqParams.term );
	res.json( MathExt.makeAmortizationSchedule( principal, payment, interestRate, term ) );
}
