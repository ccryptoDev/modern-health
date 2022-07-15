"use strict";

module.exports.routes = {
	"get /banktransaction": {
		controller: "BanktransactionController",
		action: "getbanktransaction"
	},
	"post /saveplaiddetails": {
		controller: "BanktransactionController",
		action: "saveplaiddetails"
	},
	"post /updateUserdataPlaid": {
		controller: "BanktransactionController",
		action: "updateUserdataPlaid"
	},
	"post /submitApplicationButton": {
		controller: "BanktransactionController",
		action: "submitApplicationButton"
	}
};
