const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const hbs = require('hbs');
// const bodyParser = require('body-parser');

// Added heroku buildpacks:set https://github.com/jontewks/puppeteer-heroku-buildpack

const {getPDFObject,getHTMLObject} = require('./utils/getactivitydata.js');
var {authenticate} = require('./middleware/authenticate');

var app = express();
const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname,'..',path.win32.basename('/public'));
app.use(express.static(publicPath));

app.get('/PDF/:ActivityID',authenticate,(request,response) => {
    let ActivityID = request.params.ActivityID;
    let result;
    getPDFObject(ActivityID,request.token).then((res)=>{
        console.log("HI");
        // response.sendFile(path.join(__dirname,'..',path.win32.basename(`template${ActivityID}.html`)));
        result = res;
        setTimeout(() => {
            response.sendFile(result.newPDFFilePath); 
        },9000);
    }).catch(e=>{
        console.log("error creating PDF:",e,"Sending 404.html");
        response.sendFile(publicPath+'/404.html');
    });
})
// app.get('/HTML/:ActivityID',authenticate,(request,response) => {
//     let ActivityID = request.params.ActivityID;
//     let result;
//     getHTMLObject(ActivityID,request.token).then((res)=>{
//         console.log("HI");
//         result = res;
//         console.log(result.newHTMLFilePath);
//         return response.sendFile(result.newHTMLFilePath);

//     }).catch(e=>{
//         console.log("error creating PDF:",e,"Sending 404.html");
//         console.log("sending file...");
//         response.sendFile(publicPath+'/404.html');
//     });
// })
//48659549
app.listen(port,() => {
    console.log(`Server is up on port ${port}`);
});