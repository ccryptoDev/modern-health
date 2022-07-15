/**
 * EsignatureController
 *
 * @description :: Server-side logic for managing Esignatures
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
 
'use strict';

var request = require('request'),
  moment = require('moment'),
  uuid = require('node-uuid'),
  md5 = require('md5');

var crypto   = require('crypto');
 
module.exports = {
	saveSignature: saveSignatureAction,
};

function decodeBase64Image(dataString) 
{
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  var response = {};

  if (matches.length !== 3) 
  {
	return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

function saveSignatureAction(req, res) {
	var userid = req.session.userId;
	sails.log.info( "JH EsignatureController.js saveSignatureAction userid: ", userid );

	req.session.businessPurposesCheckbox = req.param( "businessPurposesCheckbox" );
	req.session.brokerParticipatedCheckbox = req.param( "brokerParticipatedCheckbox" );
	req.session.eftaCheckbox = req.param( "eftaCheckbox" );

	var remoteAddress = ( req.headers[ "x-forwarded-for" ] || req.headers[ "x-real-ip" ] || req.connection.remoteAddress ).replace( "::ffff:", "" ).replace( /^::1$/, "127.0.0.1" );
	var userAgent = req.headers['user-agent'];
	var hiddensignatureid = req.param( 'hiddensignatureid' );
	var userReference = "";
	var firstname = "";
	var lastname = "";
	var screenID = "";
	var applicationReference = "";

	User.findOne( { id: userid } )
	.then( function( userData ) {
		if( userData ) {
			userReference = userData.userReference;
			firstname = userData.firstname;
			lastname = userData.lastname;

			Screentracking.findOne( { user: userid, iscompleted: 0 } )
			.then( function( screentrackingData ) {
				if( screentrackingData ) {
					screenID = screentrackingData.id;
					applicationReference = screentrackingData.applicationReference;

					try {
						var imageTypeRegularExpression = /\/(.*?)$/;
						var crypto = require('crypto');
						var seed = crypto.randomBytes(20);
						var uniqueSHA1String = crypto.createHash( 'sha1' ).update( seed ).digest( 'hex' );
						var base64Data = req.param( 'imgBase64' );
						var imageBuffer = decodeBase64Image( base64Data );
						var esignatureType = "";
						if(req.param( 'esignatureType' ) == 2 ) { esignatureType = 13; }
						else if(req.param( 'esignatureType' ) == 1 ) { esignatureType = 12; }
						else { esignatureType = 10; }

						var userUploadedFeedMessagesLocation = sails.config.appPath + '/assets/images/signatures/';
						var uniqueRandomImageName = 'image-' + uniqueSHA1String;
						var imageTypeDetected = imageBuffer.type.match( imageTypeRegularExpression );
						var userUploadedImagePath = userUploadedFeedMessagesLocation + uniqueRandomImageName + '.' + imageTypeDetected[1];

						try {
							if( "undefined" === typeof hiddensignatureid || hiddensignatureid == '' || hiddensignatureid == null ) {
								require( 'fs' ).writeFileSync( userUploadedImagePath, imageBuffer.data );
							}
							var signatureArray = {
								'user_id' : userid,
								'full_name' : firstname,
								'initial' : lastname,
								'ip_address' : remoteAddress,
								'device' : userAgent,
								'localPath' : userUploadedImagePath,
								'signature' : uniqueRandomImageName + '.' + imageTypeDetected[1],
								'active' : 1,
								'type': esignatureType,
								'screentracking': screenID
							};
							//sails.log.info( "signatureArray: ", signatureArray );
							if( hiddensignatureid != "" ) {
								var updateParams = {
									active: 1,
									full_name: firstname,
									initial: lastname,
									ip_address: remoteAddress,
									device: userAgent
								}
								Esignature.update( { id: hiddensignatureid }, updateParams )
								.exec( function afterwards( err, updated ) {
									if (err) {
										var responseData = {
											status: 400,
											message: 'Error:: Unable to update signature details'
										};
										res.contentType('application/json');
										res.json(responseData);
									}
									var responseData = {
										status: 200,
										message:'Signature updated successfully',
										signatureid:hiddensignatureid
									};
									res.contentType('application/json');
									res.json(responseData);
								});
							} else {
								Esignature.saveSignature( signatureArray )
								.then( function ( signatureData ) {
									if( signatureData ) {
										var signatureid = signatureData.id;

										// Move the file to s3 bucket
										S3Service.uploadAsset( signatureData, userReference, applicationReference )
										.then(function ( uploadData ) {

											Screentracking.update( { id: screenID }, { esignature: signatureid })
											.exec( function afterwards( err, updated ) {
												var signCriteria = { screentracking: screenID, active: 1 };

												Esignature.findOne( signCriteria )
												.sort( "createdAt DESC" )
												.then( function( signatureData ) {
													var agreementsignpath = '';

													if( "undefined" !== typeof signatureData && signatureData != '' && signatureData != null )
													{
														agreementsignpath = Utils.getS3Url( signatureData.standardResolution );
													}

													var responseData = {
														status: 200,
														message:'Signature created successfully',
														signatureid: signatureid,
														agreementsignpath: agreementsignpath
													};
													res.contentType( 'application/json' );
													res.json( responseData );
												});
											});
										});
									}
									else {
										var responseData = {
											status: 400,
											message:'Error:: Invalid singaturedetails'
										};
										res.contentType('application/json');
										res.json(responseData);
									}
								}).catch(function (err) {
									var responseData = {
										status: 400,
										message:'Unable to save singature: Error:: ' + err
									};
									res.contentType('application/json');
									res.json(responseData);
								});
							}
						} catch( error ) {
							var responseData = {
								status: 400,
								message:'Unable to create singature: Error:: '+error
							};
							res.contentType('application/json');
							res.json(responseData);
						}
					} catch( error ) {
						var responseData = {
							status: 400,
							message:'Unable to create singature: Error:: '+error
						};
						res.contentType('application/json');
						res.json(responseData);
					}
				}
				else{
					var responseData = {
						status: 400,
						message:'Error:: Invalid screentracking details'
					};
					res.contentType('application/json');
					res.json(responseData);
				}
			}).catch(function (err) {
				var responseData = {
					status: 400,
					message:'Invalid screentracking data: Error:: '+err
				};
				res.contentType('application/json');
				res.json(responseData);
			});
		}
		else {
			var responseData = {
				status: 400,
				message:'Error:: Invalid screentracking details'
			};
			res.contentType('application/json');
			res.json(responseData);
		}
	}).catch(function (err) {
		var responseData = {
			status: 400,
			message:'Unable to fetch user details'
		};
		res.contentType('application/json');
		res.json(responseData);
	});
}
