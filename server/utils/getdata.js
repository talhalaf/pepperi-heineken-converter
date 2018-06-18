const request = require('request');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
//'Authorization':'Basic VG9rZW5BdXRoOjUyOGIwYmQyLTJiMzgtNGMxNC05ODc3LTVjNTZiYWZlM2JkNA==',
//'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'

//TODO: inserting into headers Authorization dinamically.
let getTransactionDataByFields = (transactionId,token,UIControlFields)=> {
    const fieldsString = UIControlFields.filter(UIControl => {
        let hasSpaces = UIControl.ApiName.indexOf(" ");
        if (UIControl.ApiName.length !== 0 
            && UIControl.FieldType !== 13
            && UIControl.FieldType !== 11
            && UIControl.ApiName !== 'AccountLanguage'      //Failing validation, Bad ApiName
            && UIControl.ApiName !== 'AccountCurrency'      //Failing validation, Bad ApiName
            && UIControl.ApiName !== 'CatalogExpirationDate'
            && hasSpaces === -1)  {
            return UIControl;
        }else {
            console.log("fieldValue cannot be fetched:",UIControl.ApiName, "FieldType",UIControl.FieldType);
        }
    }).map(UIControl => UIControl.ApiName).join(',');
    console.log("Fetchin...",fieldsString);
    return new Promise((resolve,reject)=>{
        request({
            url: `https://api.pepperi.com/v1.0/transactions/${transactionId}?full_mode="true"&fields=${fieldsString}`,
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
let getTransactionData = (transactionId,token) => {
    // console.log(token);
    return new Promise((resolve,reject)=>{
        request({
            url: `https://api.pepperi.com/v1.0/transactions/${transactionId}?full_mode="true"`,
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
let getTransactionLines = (transactionId,token) => {
    return new Promise((resolve,reject)=>{
        request({
            url: `https://api.pepperi.com/v1.0/transaction_lines?where=TransactionInternalID=${transactionId}&full_mode=true&include_nested="true"`,
            json:true,
            headers:{
                'Authorization':`Basic ${token}`,
                'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'
            }
        },(error,response,body)=>{
           if(error)
            reject(error);
           resolve(body);
        });
    });
    
}
let getItemByInternalID = (InternalID,token) =>{
    return new Promise((resolve,reject)=>{
        request({
            url: `https://api.pepperi.com/v1.0/items/${InternalID}`,
            json:true,
            headers:{
                'Authorization':`Basic ${token}`,
                'X-Pepperi-ConsumerKey':'LkOCYs3cYPGqnA22TyfNO8qfotJkEL5c'
            }
        },(error,response,body)=>{
           if(error)
            reject(error);
           resolve(body);
        });
    });
}
let getItemsRelevantData = async lines => {
    let relevantData=[];
    for (let line of lines){
        let data = line.Item.Data;
        let itemRes = await getItemByInternalID(data.InternalID);
        relevantData.push({itemRes});
    }
    return relevantData;
}
let getUIControlFieldsV1 = (path) => {
    let ControlFields = [];
    let HeaderUIControlFields = JSON.parse(fs.readFileSync(path)).ControlFields;
    for (let ControlField of HeaderUIControlFields){
        ControlFields.push({
        Title:ControlField.Title,
        WrntyFieldName:ControlField.WrntyFieldName,
        CustomField:ControlField.CustomField,
        ApiName:ControlField.ApiName,
        FieldType:ControlField.FieldType,
        ColumnWidth:ControlField.ColumnWidth,
        Layout:{
            X:ControlField.Layout.X,
            Y:ControlField.Layout.Y,
            Width:ControlField.Layout.Width,
            Line_Number:ControlField.Layout.Line_Number
        }}
    );
    }
    return ControlFields;
}
let getPDFData = async (transactionId,token,UIControls) =>{
    let PDFObject = {};

    let transactionData = await getTransactionData(transactionId,token);
    let transactionDataByFields = await getTransactionDataByFields(transactionId,token,UIControls.header);
    console.log("transactionDataByFields:",transactionDataByFields);
    if (!transactionData)
        reject("bla bla");
    let lines = await getTransactionLines(transactionId,token);
    // let relevantItemData = await getItemsRelevantData(lines);
    
    fs.writeFileSync('transactionData.json',JSON.stringify(transactionData,undefined,2));
    fs.writeFileSync('lines.json',JSON.stringify(lines,undefined,3));
    // fs.writeFileSync('relevantItemData.json',JSON.stringify(relevantItemData,undefined,2));

    PDFObject.header =  [];
    PDFObject.cart = [];
    PDFObject.footer = [];
    PDFObject.fieldsNotFound =[];
    for (let UIControl of UIControls.header){ 
        if(UIControl.FieldType === 13){   //splitter
            UIControl.value = 'splitter';
        }   
        else {
            switch(UIControl.ApiName){
                case 'AccountName': {
                    UIControl.value = transactionData.Account.Data.Name;
                }
                break;
                case 'AccountExternalID':{
                    UIControl.value = transactionData.Account.Data.ExternalID;
                }
                break;
                case 'AgentName': {
                    UIControl.value = transactionData.Agent.Data.FirstName + ' ' +  transactionData.Agent.Data.LastName;
                }
                break;
                case 'BillToName':
                case 'ShipToName':
                case 'BillToPhone':
                case 'ShipToPhone':{
                    UIControl.value = transactionData[UIControl.ApiName];
                }
                break;
                case 'BillToAddress':
                case 'ShipToAddress':{
                    let pre = UIControl.ApiName === 'BillToAddress' ? 'Bill' : 'Ship';
                    UIControl.value = {};
                    UIControl.value= {
                        [pre+"ToStreet"]: transactionData[pre+"ToStreet"],
                        [pre+"ToCity"]:transactionData[pre+"ToCity"],
                        [pre+"ToZipCode"]:transactionData[pre+"ToZipCode"]
                    };
                    if (transactionData[pre+"ToState"] === '' && transactionData[pre+"ToCountry"] === ''){
                        UIControl.value[pre+"ToState"] = 'USA';
                        UIControl.value[pre+"ToCountry"] = '';
                    }
                    else{
                        UIControl.value[pre+"ToState"]=transactionData[pre+"ToState"],
                        UIControl.value[pre+"ToCountry"]=transactionData[pre+"ToCountry"]
                    }
                }
                break;
                case 'WrntyID':{
                    UIControl.value = transactionData.InternalID;
                }
                break;
                case 'Remark':{
                    UIControl.value = transactionData[UIControl.ApiName];
                }
                break;
                case 'ActionDateTime':{
                    UIControl.value = transactionData[UIControl.ApiName];
                }
                break;
                case 'Branch':{
                    UIControl.value = transactionData.AdditionalAccount.Data.Name;
                }
                break;
                default:{
                    PDFObject.fieldsNotFound.push(UIControl);
                    // console.log('Field not found:',UIControl);
                }
            }
        }
        if (UIControl.value || UIControl.value ===''){
            PDFObject.header.push(UIControl);
        }
    }
    for (let UIControl of UIControls.cart){
        UIControl.values=[];
        for(let line of lines){
            switch(UIControl.ApiName){
                case 'Image':{ 
                    UIControl.values.push({value:line.Item.Data.Image.URL, InternalID:line.InternalID});
                }        
                break;
                case 'ItemMainCategoryCode':{  
                    UIControl.values.push({value:line.Item.Data.ExternalID, InternalID:line.InternalID});
                }
                break;
                case 'ItemMainCategory':{
                    UIControl.values.push({value:line.Item.Data.MainCategoryID, InternalID:line.InternalID});
                }
                break;
                case 'ItemName':{
                    UIControl.values.push({value:line.Item.Data.Name, InternalID:line.InternalID});
                }
                break;
                case 'ItemPrice':{
                    UIControl.values.push({value:line.Item.Data.Price, InternalID:line.InternalID});
                }
                break;
                case 'UnitsQuantity':
                case 'UnitPriceAfterDiscount':
                case 'TotalUnitsPriceAfterDiscount':{
                    UIControl.values.push({value:line[UIControl.ApiName], InternalID:line.InternalID});
                }
                break;
                default: {
                    PDFObject.fieldsNotFound.push({ApiName:UIControl.ApiName, InternalID:line.InternalID});
                }
            }
        }
        PDFObject.cart.push(UIControl);
    }
    // TODO: FOOTER
    for (let UIControl of UIControls.footer){
        switch(UIControl.ApiName){
            case 'TotalsBox':{
                UIControl.value = {
                    SubTotal: transactionData.SubTotal,
                    DiscountPercentage: transactionData.DiscountPercentage,
                    GrandTotal: transactionData.GrandTotal
                }
            }
            break;
            case 'Signature':{
                UIControl.value = 'Signature';
            }
            break;
            default:{
                PDFObject.fieldsNotFound.push(UIControl);
            }
        }
        if (UIControl.value)
            PDFObject.footer.push(UIControl);
    }

    PDFObject.CurrencySymbol = transactionData.CurrencySymbol;

    return PDFObject;
};
//
let getPDFFile = async (path,newPDFFilePath) => {
    puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(async browser => {
        const page = await browser.newPage();
        page.setViewport({
            height:1024,
            width:768
        });
        await page.goto('file:///'+path, {waitUntil: 'networkidle0'});
        await page.screenshot({path: 'screenshot.png'});
        await page.pdf({
            path: newPDFFilePath, 
            printBackground: true,
            format: 'A4',
            height: 1080,
            width:1920 
        }).then();
        // await page.content().then(res=>{
        //   console.log(res);
        // });
        await browser.close();
      }).catch(e=>{
        console.log(e);
    });
}

// getRelevantData('',transactionId);
//  READ    // fs.readFileSync("./HeaderUIControl.json");
let transactionId = 48888301;
let headerPath ="./HeaderUIControl.json";
let cartPath ="./CartUIControl.json";
let footerPath = "./FooterUIControl.json";
let UIControls = {};
UIControls.header = getUIControlFieldsV1(headerPath);
UIControls.cart = getUIControlFieldsV1(cartPath);
UIControls.footer = getUIControlFieldsV1(footerPath);
// console.log(UIControls.cart);
// console.log(UIControls.header);
// console.log(UIControls.cart);
// console.log(UIControls.footer);
let getPDFObject = async (transactionId,token) =>  {
    let PDFObject = await getPDFData(transactionId,token,UIControls);
    await fs.writeFileSync(path.join(__dirname ,'..',transactionId+'.json'),JSON.stringify(PDFObject,undefined,2));

    let JSfile = path.join(__dirname ,'..','template.js');
    let HTMLfile = path.join(__dirname , '..', 'template.html');
    let JSdata = fs.readFileSync(JSfile); //read existing JS template into data
    let HTMLdata = fs.readFileSync(HTMLfile);
    let newJSData = 'const PDFObject = ' + JSON.stringify(PDFObject,undefined,2) +';\n'+ JSdata;
    let newHTMLData = HTMLdata + `\n <script src="template${transactionId}.js"></script>`;
    let newJSPath = path.join(__dirname ,'..','/template'+transactionId+'.js');
    let newHTMLPath = path.join(__dirname ,'..','/template'+transactionId+'.html');
    let newPDFFilePath = path.join(__dirname ,'..','/template'+transactionId+'.pdf');
    await fs.writeFileSync(newJSPath,newJSData);
    await fs.writeFileSync(newHTMLPath,newHTMLData);
    // or fs.appendFile(fd, data);
    await getPDFFile(newHTMLPath,newPDFFilePath);
    PDFObject.newPDFFilePath = newPDFFilePath;
    return PDFObject;    
}

module.exports.getPDFObject = getPDFObject;