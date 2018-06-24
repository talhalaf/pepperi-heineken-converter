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
    setTimeout(()=>{ 
        getPDFObject(ActivityID,request.token)
        .then((res)=>{
            console.log('All data for PDF was generated succesfully!');
            sendPDFFile(response,res.newPDFFilePath,1000);
        })
        .catch(e=>{
            console.log("error creating PDF:",e,"Sending 404.html");
            response.sendFile(publicPath+'/404.html');
        });},1000);
    });

app.get('/PDFAttachment/:ActivityID',authenticate,(request,response) => {
    let ActivityID = request.params.ActivityID;
    setTimeout(()=>{ 
        getPDFObject(ActivityID,request.token)
        .then((res)=>{
            console.log('All data for PDF was generated succesfully!');
            sendPDFAttachment(response,res.newPDFFilePath,1000);
        })
        .catch(e=>{
            console.log("error creating PDF:",e,"Sending 404.html");
            response.sendFile(publicPath+'/404.html');
        });},1000);
    });
let sendPDFAttachment = (response,newPDFFilePath,timeToWait,numberOfTries) => {
    numberOfTries = numberOfTries || 1;
    console.log('Waiting '+timeToWait/1000+' second(s)...');
    if (timeToWait/1000 > 10){
        throw new Error('File Not Found!');
    }
    else {
        setTimeout(()=>{
            fs.stat(newPDFFilePath,(err,stats)=>{

                //File is not ready yet, redirecting to the same URL.
                if (!stats){
                    console.log('--------------------------------');
                    console.log('Could not locate the file on the Machine yet...')
                    console.log('--------------------------------');
                    timeToWait = numberOfTries%2 == 0 ? timeToWait*1.5 : timeToWait;
                    sendPDFFile(response,newPDFFilePath,timeToWait,numberOfTries+1);
                }
                else if (!err){
                    console.log('--------------------------------');
                    console.log('Success! PDF was created on the machine...')
                    console.log('--------------------------------');
                    fileLocated = true;
                    response.attachment(newPDFFilePath).sendFile(newPDFFilePath);
                } else {
                    console.log(error);
                }
            });
        },timeToWait);
    }
}

let sendPDFFile = (response,newPDFFilePath,timeToWait,numberOfTries) => {
    numberOfTries = numberOfTries || 1;
    console.log('Waiting '+timeToWait/1000+' second(s)...');
    if (timeToWait/1000 > 10){
        throw new Error('File Not Found!');
    }
    else {
        setTimeout(()=>{
            fs.stat(newPDFFilePath,(err,stats)=>{

                //File is not ready yet, redirecting to the same URL.
                if (!stats){
                    console.log('--------------------------------');
                    console.log('Could not locate the file on the Machine yet...')
                    console.log('--------------------------------');
                    timeToWait = numberOfTries%2 == 0 ? timeToWait*1.5 : timeToWait;
                    sendPDFFile(response,newPDFFilePath,timeToWait,numberOfTries+1);
                }
                else if (!err){
                    console.log('--------------------------------');
                    console.log('Success! PDF was created on the machine...')
                    console.log('--------------------------------');
                    fileLocated = true;
                    response.sendFile(newPDFFilePath);
                } else {
                    console.log(error);
                }
            });
        },timeToWait);
    }
}


app.listen(port,() => {
    console.log(`Server is up on port ${port}`);
});