const path = require('path');
const fs = require('fs');
const express = require('express');
const url = require('url');
// const bodyParser = require('body-parser');

// Added heroku buildpacks:set https://github.com/jontewks/puppeteer-heroku-buildpack

const {getPDFObject,getPDFFileLocation} = require('./utils/getactivitydata.js');
var {authenticate} = require('./middleware/authenticate');

var app = express();
const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname,'..',path.win32.basename('/public'));
app.use(express.static(publicPath));

app.get('/PDF/:ActivityID',authenticate,(request,response) => {
    let ActivityID = request.params.ActivityID;
    let auth = request.query.auth;
    let numOfTries = request.query.numOfTries ? parseInt(request.query.numOfTries) : 1;
    let token = request.token || request.query.token;
    let urlPath = url.format({
        pathname: '/PDF/'+ActivityID,
        query:{
            "auth": auth,
            "numOfTries": numOfTries+1,
            "token": token
        }
     });
    if (numOfTries > 1){
        token = request.query.token;
        let PDFFileLocation = getPDFFileLocation(ActivityID);
        setTimeout(()=>{ 
            fs.stat(PDFFileLocation,(err,stats) => {
                if (!stats){
                    console.log('--------------------------------');
                    console.log('Could not locate the file on the '+parseInt(numOfTries) +' try yet...')
                    console.log('--------------------------------');
                    console.log('Waited 1 second, response redirect to '+urlPath);
                    response.redirect(url.format({
                        pathname: '/PDF/'+ActivityID,
                        query:{
                            "auth": auth,
                            "numOfTries": numOfTries+1,
                            "token": token
                        }
                     }));
                }
                else if (!err) {
                    console.log('--------------------------------');
                    console.log('Success! PDF was created on the machine and sent to the client!')
                    console.log('--------------------------------');
                    fileLocated = true;
                    response.sendFile(PDFFileLocation);
                } else{
                    console.log(err);
                }
            });
        },1000);
    }
    else{
        setTimeout(()=>{ 
        getPDFObject(ActivityID,request.token).then((res)=>{
            console.log('All data for PDF was generated succesfully!');
            // response.sendFile(path.join(__dirname,'..',path.win32.basename(`template${ActivityID}.html`)));
            result = res;
            fs.stat(result.newPDFFilePath,(err,stats)=>{
                //File is not ready yet, redirecting to the same URL.
                if (!stats){
                    console.log('--------------------------------');
                    console.log('Could not locate the file on the Machine yet...')
                    console.log('--------------------------------');
                    console.log('Waited 1 second, response redirect to '+urlPath);
                    response.redirect(url.format({
                        pathname: '/PDF/'+ActivityID,
                        query:{
                            "auth": auth,
                            "numOfTries": numOfTries+1,
                            "token": token
                        }
                     }));
                }
                else if (!err){
                    console.log('--------------------------------');
                    console.log('Success! PDF was created on the machine...')
                    console.log('--------------------------------');
                    fileLocated = true;
                    response.sendFile(result.newPDFFilePath);
                } else {
                    console.log(error);
                }
            });
        }).catch(e=>{
            console.log("error creating PDF:",e,"Sending 404.html");
            response.sendFile(publicPath+'/404.html');
        });},1000);
    }
});


app.listen(port,() => {
    console.log(`Server is up on port ${port}`);
});