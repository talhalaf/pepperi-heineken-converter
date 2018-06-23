const request = require('request');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
//'Authorization':'Basic VG9rZW5BdXRoOjUyOGIwYmQyLTJiMzgtNGMxNC05ODc3LTVjNTZiYWZlM2JkNA==',
//'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'
const newFilesLocation = path.join(__dirname ,'..','new-files');

let getActivityData = (activityId,token) => {
    console.log(`Getting activity ${activityId} data...`);
    console.log(activityId);
    return new Promise((resolve,reject)=>{
        request({
            url: `https://api.pepperi.com/v1.0/activities/${activityId}?full_mode=true`,
            json:true,
            headers:{
                'Authorization':`Basic ${token}`,
                'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'
            }
        },(error,response,body)=>{
           if(error || body.fault){
                reject(body.fault.faultstring);
           }
           resolve(body);
        });
    });
    
}

let getPDFFile = async (path,newPDFFilePath) => {
    puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(async browser => {
        const page = await browser.newPage();
        page.setViewport({
            height:1024,
            width:768
        });
        await page.goto('file:///'+path, {waitUntil: 'networkidle0'});
        await page.screenshot({path: 'screenshot.png'});
        let PDFFile = await page.pdf({
            path: newPDFFilePath,
            printBackground: true,
            format: 'A4',
            height: 1080,
            width:1920 
        });
        // await page.content().then(res=>{
        //   console.log(res);
        // });
        await browser.close();
      }).catch(e=>{
        console.log(e);
    });
}
let getPDFData = async (activityId,token) =>{
    let PDFObject = {};
    let activityData = await getActivityData(activityId,token);
    let accountRef = activityData.Account.Data;
    PDFObject.TSAPDFQuestions = activityData.TSAPDFQuestions;
    PDFObject.questionsGroupsMeta = PDFObject.TSAPDFQuestions.trim().split('|');
    PDFObject.questionsGroupsMeta = PDFObject.questionsGroupsMeta.map(group => {
        return group.trim().split(',');
    });


    PDFObject.questions = [];
    for (let i = 0 ; i < PDFObject.questionsGroupsMeta.length ; i++){
        for (let j = 0 ; j < PDFObject.questionsGroupsMeta[i].length ; j++){
            question = PDFObject.questionsGroupsMeta[i][j].trim().split(':');
            position = (i * PDFObject.questionsGroupsMeta[i].length)+j
            console.log(question , position);
            PDFObject.questions[position] = {
                question: activityData['TSA'+question[0]],
                answer: activityData['TSA'+question[0]+'Answer'],
                grade: activityData['TSA'+question[1]],
                picture1: activityData['TSA'+question[2]],
                picture2: activityData['TSA'+question[3]]
            }
        }
    }

    // TODO: dynamic fields fetching from TSAPDFHeaders
    PDFObject.ActivityID = activityData.InternalID;
    PDFObject.AccountName = accountRef.Name;
    PDFObject.AccountID = accountRef.ExternalID;
    PDFObject.Address = accountRef.Street + ', ' + accountRef.City + ', ' + accountRef.Country;
    PDFObject.ActionDateTime = activityData.ActionDateTime;
    PDFObject.AgentName = activityData.Agent.Data.FirstName +' '+ activityData.Agent.Data.LastName;
    PDFObject.TSAAgentSign = activityData.TSAAgentSign ? activityData.TSAAgentSign.URL : '';

    if (!activityData)
        reject("bla bla");
    fs.writeFileSync('activityData.json',JSON.stringify(activityData,undefined,2));

    return PDFObject;
}
let getPDFFileLocation = (activityId) => {
    return path.join(newFilesLocation,'/template'+activityId+'.pdf');
}
let getPDFObject = async (activityId,token) =>  {
    let PDFObject = await getPDFData(activityId,token);
    await fs.writeFileSync(path.join(newFilesLocation,activityId+'.json'),JSON.stringify(PDFObject,undefined,2));
    let HTMLfile = path.join(__dirname , '..', 'template-files' ,'backup.html');
    let HTMLdata = fs.readFileSync(HTMLfile);
    let newHTMLData = `\n <script>const PDFObject = ${JSON.stringify(PDFObject,undefined,2)} </script>` + HTMLdata ;
    let newHTMLPath = path.join(newFilesLocation,'/template'+activityId+'.html');
    let newPDFFilePath = path.join(newFilesLocation,'/template'+activityId+'.pdf');
    await fs.writeFileSync(newHTMLPath,newHTMLData);
    await getPDFFile(newHTMLPath,newPDFFilePath);
    PDFObject.newPDFFilePath = newPDFFilePath;
    return PDFObject;
}
module.exports.getPDFObject = getPDFObject;
module.exports.getPDFFileLocation = getPDFFileLocation;