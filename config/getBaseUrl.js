module.exports.getBaseUrl =  getBaseUrl();

function getBaseUrl(){
  // TODO: Verify production config
  if(process.env.NODE_ENV === 'development') {
    //return "http://localhost:1337";
	//return "http://snsdev7:1337";
	//return "http://ec2-35-165-249-11.us-west-2.compute.amazonaws.com";
	//return "http://ec2-35-165-20-111.us-west-2.compute.amazonaws.com";
	return "http://snsdev7:1337";
  } else if(process.env.NODE_ENV === 'staging') {
    return "http://snsdev7:1337";
  } else if(process.env.NODE_ENV === 'uat') {
    return "http://snsdev7:1337";
  } else if(process.env.NODE_ENV === 'production') {
    return "http://snsdev7:1337";
  } else{
    //return "http://localhost:1337";
	//return "http://snsdev7:1337";
	//return "http://ec2-35-165-249-11.us-west-2.compute.amazonaws.com";
	//return "http://ec2-35-165-20-111.us-west-2.compute.amazonaws.com";
	return "http://snsdev7:1337";
  }
}
