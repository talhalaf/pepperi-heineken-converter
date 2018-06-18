const path = require('path');
const request = require('request');
const fs = require('fs');

const publicPath = path.join(__dirname,'..','..',path.win32.basename('/public'));

let getToken = (auth) =>{
  console.log("getting token");
  return new Promise((resolve,reject)=>{ 
    // let Base64EncodedCredentials = Buffer.from(email+':'+password).toString('base64');
    request({
      url: `https://api.pepperi.com/v1.0/company/apitoken`,
      json: true,
      headers:{
        'Authorization':`Basic ${auth}`,
        'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'
      }
    },(error,response,body)=>{
      if(error)
       reject(error);
      resolve(body);
   });
  });
}

let authenticate = (req, res, next) => {
  console.log("authenticating...");

  //extract auth from URL
  let auth = req.query.auth;

  getToken(auth).then(res=>{
    console.log("resolving auth result");
    if (!res || res.CompanyID === 0){
      return Promise.reject("no result or no company ID - authentication error");
    }
    req.token = Buffer.from('TokenAuth:'+res.APIToken).toString('base64');
    // console.log(req.token);
    console.log("authentication success");
    next();
  }).catch(e=>{
    console.log(e, 'Sending 401.html');
    res.status(401).sendFile(publicPath+'/401.html');
  })
};

module.exports = {authenticate};
