/**
 * UserBankAccount.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
const Q = require( "q" );
const in_array = require( "in_array" );
const _ = require( "lodash" );

module.exports = {
	//
	attributes: {
		accounts: {
			type: "array"
		},
		accessToken: {
			type: "string"
		},
		institutionName: {
			type: "string"
		},
		institutionType: {
			type: "string"
		},
		transaction: {
			type: "array"
		},
		isDeleted: {
			type: "boolean",
			defaultsTo: false
		},
		user: {
			model: "User"
		},
		item_id: {
			type: "string"
		},
		access_token: {
			type: "string"
		},
		transavail: {
			type: "integer",
			defaultsTo: 0
		},
		repullstatus: {
			type: "integer",
			defaultsTo: 0
		},
		bankfilloutmanually: {
			type: "integer",
			defaultsTo: 0
		},
		screentracking: { "model": "Screentracking" },
		toApi: toApi
	},

	createInstitutionDetail: createInstitutionDetail,
	updateAccessToken: updateAccessToken,
	filterCheckingAccounts: filterCheckingAccounts,
	findIfUserBankAccount: findIfUserBankAccount,
	createChangeBankDetail: createChangeBankDetail,
	createUserBankDetail: createUserBankDetail,
	getAllUserBankAccounts: getAllUserBankAccounts
};

function toApi() {
	const userBankAccount = this.toObject();

	// filter checking accounts
	userBankAccount.checkingAccounts = UserBankAccount.filterCheckingAccounts( userBankAccount );
	// remove transactions
	delete userBankAccount.transactions;
	delete userBankAccount.accessToken;

	return userBankAccount;
}

function createUserBankDetail( institutionName, institutionType, accountDetails, user, token ) {
	return Q.promise( function( resolve, reject ) {
		// sails.log.info("Enter institution details");

		InstitutionService.getAssetTransactionDetail( token, accountDetails, "all", user.id )
		.then( function( transactionDetails ) {
			const item_id = accountDetails.item.item_id;
			transavail = 0;
			if( transactionDetails.total_transactions > 0 ) {
				transavail = 1;
			}

			const transactionGenerated = {};
			const accountDetail = [];

			if( transactionDetails.total_transactions > 0 ) {
				// sails.log.info("enter if loop for transactions:: ")

				_.forEach( transactionDetails.transactions, function( transaction ) {
					// sails.log.info("transaction.account_id :: ", transaction.account_id);

					if( !_.has( transaction.account_id, transactionGenerated ) ) {
						// transactionGenerated[transaction._account]=[];
						// sails.log.info('Enter if loop');
						// transactionGenerated[transaction.account_id]=[];
					} else {
						// sails.log.info('Enter else loop');
					}

					if( !transactionGenerated.hasOwnProperty( transaction.account_id ) ) {
						// sails.log.info('Enter property if loop');
						transactionGenerated[ transaction.account_id ] = [];
					} else {
						// sails.log.info('Enter property else loop');
					}

					const obj = {
						id: transaction.transaction_id,
						account_id: transaction.account_id,
						amount: transaction.amount,
						date: transaction.date,
						name: transaction.name,
						meta: transaction.payment_meta,
						pending: transaction.pending,
						type: transaction.transaction_type,
						category: transaction.category,
						category_id: transaction.category_id,
						score: transaction.location
						// pending_transaction_id: transaction.pending_transaction_id,
						// account_owner: transaction.account_owner
					};

					// sails.log.info("obj values :: ", obj);

					// transactionGenerated[transaction._account].push(obj) ;
					transactionGenerated[ transaction.account_id ].push( obj );
				} );
			}

			const accountsData = [];

			_.forEach( accountDetails.accounts, function( accountsval ) {
				const metaData = {
					limit: accountsval.balances.limit,
					name: accountsval.name,
					number: accountsval.mask,
					official_name: accountsval.official_name
				};

				const filteredAccountsDetails = _.filter( accountDetails.numbers, { account_id: accountsval.account_id } );

				if( filteredAccountsDetails.length > 0 ) {
					filteredAccountsDetailsJson = filteredAccountsDetails[ 0 ];
				}

				const objdata = {
					_id: accountsval.account_id,
					_item: accountsval.account_id,
					_user: accountsval.account_id,
					balance: accountsval.balances,
					institution_type: institutionType,
					meta: metaData,
					numbers: filteredAccountsDetailsJson,
					subtype: accountsval.subtype,
					type: accountsval.type
				};

				accountsData.push( objdata );
			} );

			/* var objdata = {
                        "_id" : "DzRDJnLY3EhJjZ1791woc1aAvVqLzYtZB1v5z",
                        "_item" : "DzRDJnLY3EhJjZ1791woc1aAvVqLzYtZB1v5z",
                        "_user" : "DzRDJnLY3EhJjZ1791woc1aAvVqLzYtZB1v5z",
                        "balance" : {
                                "available" : -29.15,
                                "current" : -29.15,
                                "limit" : null
                        },
                        "institution_type" : "ins_1",
                        "meta" : {
                                "limit" : null,
                                "name" : "Regular Savings",
                                "number" : "9448",
                                "official_name" : "Regular Savings"
                        },
                        "numbers" : {
                                "account" : "229016369448",
                                "account_id" : "DzRDJnLY3EhJjZ1791woc1aAvVqLzYtZB1v5z",
                                "routing" : "063100277",
                                "wire_routing" : "026009593"
                        },
                        "subtype" : "savings",
                        "type" : "depository"
                };
			accountsData.push(objdata) ;*/

			const userBankAccount = {
				accounts: accountsData,
				accessToken: token,
				institutionName: institutionName,
				institutionType: institutionType,
				user: user.id,
				transactions: transactionGenerated,
				item_id: item_id,
				access_token: token,
				transavail: transavail
			};

			UserBankAccount.create( userBankAccount )
			.then( function( entity ) {
				// check if user has a marqeta card
				PlaidUser.createForUserBankAccount( entity ).then( function( plaidUserDet ) {
					const usercriteria = { id: plaidUserDet.user };

					User.findOne( usercriteria )
					.then( function( userDetails ) {
						_.forEach( plaidUserDet.emails, function( plaiduserDetails ) {
							sails.log.info( "plaidUserDet.emails::", plaidUserDet.emails );
							sails.log.info( "userDetails.email::", userDetails.email );

							const type = plaiduserDetails.type;

							if( type == "primary" ) {
								const emailId = userDetails.email;
								const plaidEmail = plaiduserDetails.data;

								if( emailId == plaidEmail ) {
									sails.log.info( "plaidUserDet.user::", plaidUserDet.user );

									userDetails.isEmailVerified = true;
								}
							}
						} ); // foreachend

						// sails.log.info("plaidUserDet.user::",userDetails.names);

						// var names = userDetails.names;
						const street = userDetails.street;
						const city = userDetails.city;
						const state = userDetails.state;
						const zipCode = userDetails.zip;

						userDetails.street = street;
						userDetails.city = city;
						userDetails.state = state;
						userDetails.zipCode = zipCode;
						userDetails
						.save( function( err ) {
							if( err ) {
								return reject( err );
							}

							const sccriteria = { user: user.id, iscompleted: 0 };
							Screentracking.findOne( sccriteria )
							.sort( "createdAt DESC" )
							.then( function( userscreenres ) {
								UserBankAccount.update( { id: entity.id }, { screentracking: userscreenres.id } ).exec( function afterwards( err, updated ) {} );
							} );

							const Apidata = entity.toApi();
							return resolve( Apidata );
						} )
						.catch( function( err ) {
							return reject( err );
						} );
					} )
					.catch( function( err ) {
						return reject( err );
					} );
				} );
				const Apidata = entity.toApi();
				return resolve( Apidata );
			} )
			.catch( function( err ) {
				return reject( err );
			} );
		} )
		.catch( function( err ) {
			return reject( err );
		} );
	} );
}

function createInstitutionDetail( institutionName, institutionType, accountDetails, user, token, screentrackingId ) {
	return Q.promise( function( resolve, reject ) {
		const isSandbox = _.get( sails, "config.isSandbox", false );
		sails.log.verbose( "createInstitutionDetail; accountDetails:", JSON.stringify( accountDetails ) );
		InstitutionService.getAssetTransactionDetail( token, accountDetails, "all", user.id )
		.then( function( transactionDetails ) {
			sails.log.verbose( "createInstitutionDetail; getAssetTransactionDetail() total_transactions:", transactionDetails.total_transactions );
			const item_id = accountDetails.item.item_id;
			let transavail = 0;
			if( transactionDetails.total_transactions > 0 ) {
				transavail = 1;
			}

			const transactionGenerated = {};
			if( transactionDetails.total_transactions > 0 ) {
				sails.log.info( "enter if loop for transactions:: " );
				_.forEach( transactionDetails.transactions, function( transaction ) {
					if( !transactionGenerated.hasOwnProperty( transaction.account_id ) ) {
						// sails.log.info('Enter property if loop');
						transactionGenerated[ transaction.account_id ] = [];
					}

					const obj = {
						id: transaction.transaction_id,
						account_id: transaction.account_id,
						amount: transaction.amount,
						date: transaction.date,
						name: transaction.name,
						meta: transaction.payment_meta,
						pending: transaction.pending,
						type: transaction.transaction_type,
						category: transaction.category,
						category_id: transaction.category_id,
						score: transaction.location
						// pending_transaction_id: transaction.pending_transaction_id,
						// account_owner: transaction.account_owner
					};
					transactionGenerated[ transaction.account_id ].push( obj );
				} );
			}

			const accountsData = [];

			_.forEach( accountDetails.accounts, function( accountsval ) {
				const metaData = {
					limit: accountsval.balances.limit,
					name: accountsval.name,
					number: accountsval.mask,
					official_name: accountsval.official_name
				};

				let accountNumbers = _.filter( accountDetails.numbers.ach, { account_id: accountsval.account_id } );
				// sails.log.verbose( "accountNumbers:", accountNumbers );
				accountNumbers = accountNumbers.length > 0 ? accountNumbers[ 0 ] : null;

				const objdata = {
					_id: accountsval.account_id,
					_item: accountsval.account_id,
					_user: accountsval.account_id,
					balance: accountsval.balances,
					institution_type: institutionType,
					meta: metaData,
					numbers: accountNumbers,
					subtype: accountsval.subtype,
					type: accountsval.type
				};
				accountsData.push( objdata );
			} );

			sails.log.info( "userBankAccount array:: " );
			const userBankAccount = {
				accounts: accountsData,
				accessToken: token,
				institutionName: institutionName,
				institutionType: institutionType,
				user: user.id,
				transactions: transactionGenerated,
				item_id: item_id,
				access_token: token,
				transavail: transavail,
				screentracking: screentrackingId
			};

			UserBankAccount.create( userBankAccount )
			.then( function( entity ) {
				sails.log.info( "entity created" );

				// check if user has a marqeta card
				PlaidUser.createForUserBankAccount( entity )
				.then( function( plaidUserDet ) {
					/*
					entity.user = plaidUserDet.userData.id;
					entity.save();

					Screentracking.createLastScreenName('Plaid',2,plaidUserDet.userData,'','',''); */

					// var Apidata = entity.toApi();
					return resolve( plaidUserDet );
				} )
				.catch( function( err ) {
					sails.log.info( "error", err );
					return reject( err );
				} );
			} )
			.catch( function( err ) {
				sails.log.info( "error", err );
				return reject( err );
			} );
		} )
		.catch( function( err ) {
			sails.log.info( "error", err );
			return reject( err );
		} );
	} );
}

function filterCheckingAccounts( userBankAccount ) {
	const checkingAccounts = [];
	userBankAccount.accounts.map( function( account ) {
		if( account.subtype === "checking" ) {
			checkingAccounts.push( account );
		}
	} );

	return checkingAccounts;
}

function updateAccessToken( user, accessToken ) {
	return Q.promise( function( resolve, reject ) {
		const criteria = {
			user: user.id
		};

		UserBankAccount.findOne( criteria ).then( function( userbankaccount ) {
			userbankaccount.access_token = accessToken;
			userbankaccount.save( function( err ) {
				if( err ) {
					sails.log.error( "User#updateAccessToken :: Error :: ", err );

					return reject( {
						code: 500,
						message: "INTERNAL_SERVER_ERROR"
					} );
				}
				return resolve( userbankaccount );
			} );
		} );
	} );
}

function findIfUserBankAccount( accountId, userId ) {
	return Q.promise( function( resolve, reject ) {
		const criteria = {
			user: userId,
			isDeleted: false
		};
		let isUserAccount = false;
		UserBankAccount.findOne( criteria )
		.then( function( userBankAccount ) {
			if( !userBankAccount ) {
				sails.log.error( "User#findIfUserBankAccount :: No accounts Found for User" );
				return reject( {
					code: 404,
					message: "USER_BANK_ACCOUNT_NOT_FOUND"
				} );
			}
			_.forEach( userBankAccount.accounts, function( bankAccount ) {
				if( bankAccount._id === accountId ) {
					isUserAccount = true;
					return resolve( userBankAccount );
				}
			} );
			if( isUserAccount === false ) {
				sails.log.warning( "UserBankAccount#findIfUserBankAccount :: Account Does not belomng to user" );
				return reject( {
					code: 404,
					message: "NO_LINKED_ACCOUNT_FOR_USER"
				} );
			}
		} )
		.catch( function( err ) {
			sails.log.error( "UserBankAccount#findIfUserBankAccount :: Error" );
			return reject( {
				code: 404,
				message: "INTERNAL_SERVER_ERROR"
			} );
		} );
	} );
}

function createChangeBankDetail( institutionName, institutionType, accountDetails, user, token ) {
	return Q.promise( function( resolve, reject ) {
		// sails.log.info("Enter institution details");
		// sails.log.info("accountDetails: ",accountDetails);

		InstitutionService.getAssetTransactionDetail( token, accountDetails, "all", user.id )
		.then( function( transactionDetails ) {
			const item_id = accountDetails.item.item_id;

			// sails.log.info("accountDetails item_id: ",item_id);
			// sails.log.info("accountDetails transactionDetails: ",transactionDetails);

			transavail = 0;
			if( transactionDetails.total_transactions > 0 ) {
				transavail = 1;
			}

			const transactionGenerated = {};
			const accountDetail = [];

			if( transactionDetails.total_transactions > 0 ) {
				_.forEach( transactionDetails.transactions, function( transaction ) {
					// sails.log.info("transaction.account_id :: ", transaction.account_id);

					if( !_.has( transaction.account_id, transactionGenerated ) ) {
					} else {
					}

					if( !transactionGenerated.hasOwnProperty( transaction.account_id ) ) {
						// sails.log.info('Enter property if loop');
						transactionGenerated[ transaction.account_id ] = [];
					} else {
						// sails.log.info('Enter property else loop');
					}

					const obj = {
						id: transaction.transaction_id,
						account_id: transaction.account_id,
						amount: transaction.amount,
						date: transaction.date,
						name: transaction.name,
						meta: transaction.payment_meta,
						pending: transaction.pending,
						type: transaction.transaction_type,
						category: transaction.category,
						category_id: transaction.category_id,
						score: transaction.location
					};

					transactionGenerated[ transaction.account_id ].push( obj );
				} );
			}

			// sails.log.info("accountDetails transactionGenerated: ",transactionGenerated);
			// sails.log.info("accountDetails.accounts: ",accountDetails.accounts);

			const accountsData = [];

			_.forEach( accountDetails.accounts, function( accountsval ) {
				const metaData = {
					limit: accountsval.balances.limit,
					name: accountsval.name,
					number: accountsval.mask,
					official_name: accountsval.official_name
				};

				const filteredAccountsDetails = _.filter( accountDetails.numbers, { account_id: accountsval.account_id } );

				// sails.log.info("filteredAccountsDetails length: ",filteredAccountsDetails.length);
				// sails.log.info("filteredAccountsDetails: ",filteredAccountsDetails);

				if( filteredAccountsDetails.length > 0 ) {
					filteredAccountsDetailsJson = filteredAccountsDetails[ 0 ];
				}

				// sails.log.info("filteredAccountsDetails::",filteredAccountsDetails);

				const objdata = {
					_id: accountsval.account_id,
					_item: accountsval.account_id,
					_user: accountsval.account_id,
					balance: accountsval.balances,
					institution_type: institutionType,
					meta: metaData,
					numbers: filteredAccountsDetailsJson,
					subtype: accountsval.subtype,
					type: accountsval.type
				};

				// sails.log.info("objdata: ",objdata);
				accountsData.push( objdata );
			} );

			/* sails.log.info("institutionName: ",institutionName);
			sails.log.info("institutionType: ",institutionType);
			sails.log.info("token: ",token);
			sails.log.info("userid: ",user.id);
			sails.log.info("item_id: ",item_id);
			sails.log.info("transavail: ",transavail);*/

			const userBankAccount = {
				accounts: accountsData,
				accessToken: token,
				institutionName: institutionName,
				institutionType: institutionType,
				user: user.id,
				transactions: transactionGenerated,
				item_id: item_id,
				access_token: token,
				transavail: transavail
			};

			// sails.log.info("userBankAccount: ",userBankAccount);

			UserBankAccount.create( userBankAccount )
			.then( function( entity ) {
				// check if user has a marqeta card
				PlaidUser.createForUserBankAccount( entity ).then( function( plaidUserDet ) {
					MarqetaService.checkOrCreateForUser( user, plaidUserDet ).then( function( fluidCard ) {
						sails.log.info( "UserBankAccount#createChangeBankDetail :: Fluid Card found for user :: ", fluidCard );
					} );

					const Apidata = entity.toApi();
					return resolve( Apidata );
				} );
			} )
			.catch( function( err ) {
				return reject( err );
			} );
		} )
		.catch( function( err ) {
			return reject( err );
		} );
	} );
}

function getAllUserBankAccounts( userBankAccountData ) {
	return Q.promise( function( resolve, reject ) {
		if( userBankAccountData ) {
			const data = [];
			const institutionArray = [];
			const checkingAccounts = [];

			_.forEach( userBankAccountData, function( userbankData ) {
				let blockUserBankAccount = 0;

				const institutionType = userbankData.institutionType;
				const arrayres = institutionArray.indexOf( institutionType );
				if( arrayres == "-1" ) {
					institutionArray.push( institutionType );
					data.push( userbankData );

					// -- checking only checking account
					userbankData.accounts.map( function( account ) {
						if( account.subtype === "checking" ) {
							checkingAccounts.push( account.numbers.account );
						}
					} );
				} else {
					// -- checking only checking account
					userbankData.accounts.map( function( account ) {
						if( account.subtype === "checking" ) {
							if( in_array( account.numbers.account, checkingAccounts ) ) {
								blockUserBankAccount = 1;
							} else {
								checkingAccounts.push( account.numbers.account );
							}
						}
					} );

					if( blockUserBankAccount == 0 ) {
						data.push( userbankData );
					}
				}
			} );

			// sails.log.info("Userbankaccount responseData::",responseData);

			var responseData = {
				code: 200,
				userBankAccountData: data,
				institutionArray: institutionArray,
				checkingAccounts: checkingAccounts
			};
			return resolve( responseData );
		} else {
			var responseData = {
				code: 400,
				userBankAccountData: userBankAccountData
			};
			return resolve( responseData );
		}
	} );
}
