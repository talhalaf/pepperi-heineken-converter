

const FIRSTPLACE = 0;
const NEXTPLACE = 1;
const BLANKSPOT = 1;

// Creating a Layout Matrix (position of headers and values)
function makeLayoutMatrix(UIControls){
  var matrix = new Array(UIControls.length);
  for (var i = 0; i < matrix.length; i++){
    matrix[i] = new Array(2);
  }
  var maxLine = 0;
  for (var i = 0; i < UIControls.length; i++) {
    var field = UIControls[i];
    if (field.Layout.Line_Number > maxLine){
      maxLine = field.Layout.Line_Number;
    }
    matrix[field.Layout.Y][field.Layout.X] = field;
    if (field.Layout.X === 1 && matrix[field.Layout.Y][0]===undefined){
      matrix[field.Layout.Y][FIRSTPLACE] = BLANKSPOT;
    }
    if(field.Layout.Width===2)    //full row
    matrix[field.Layout.Y][NEXTPLACE] = BLANKSPOT;
  }
  matrix.splice(maxLine+1);
  return matrix;
}
function getFieldValue(field){
  var pre = (field.ApiName === 'ShipToAddress' || field.ApiName === 'BillToAddress') ?
            ((field.ApiName === 'ShipToAddress') ? 'Ship' : 'Bill') : undefined;
  var res;
  if (pre){
    res = ` 
    ${field.value[pre+'ToStreet']} <br/>
    ${field.value[pre+'ToCity']}<br/>
    ${field.value[pre+'ToZipCode']}<br/>
    ${field.value[pre+'ToState']}<br/>
    ${field.value[pre+'ToCountry']}`;
  }
  return res ? res : field.value;
}
function createHeaderColumn(field){
  // console.log(field);
  if (!field){
    field = {Title:'',value:''};
  }
  var res = 
  `<div class="col">
    ${field.Title}
  </div>
  <div class="col">
    ${getFieldValue(field)}
  </div>
  `;
  return res;
}
function createLine(lineArray){
  var res ='\n<div class="row">';   //create new line
  var field,secondField;
  if (lineArray[FIRSTPLACE] !== BLANKSPOT)
    field = lineArray[FIRSTPLACE];
  if (lineArray[NEXTPLACE] !== BLANKSPOT)
    secondField = lineArray[NEXTPLACE];
  // console.log('field',field,'secondField',secondField);
  if (field && field.FieldType === 13){    //splitter
    res = res + 
      `<div class="col splitter">
        <strong>${field.Title}</strong> 
      </div>
    </div>`;
  } else {                        //field with value
    if (!field || field.ApiName === 'TotalsBox'){      //first place is BLANKSPOT -- create two empty columns

      res = res + 
      ` ${createHeaderColumn()}
        ${createHeaderColumn(secondField)}`;
    } else {
      res = res + 
      ` ${createHeaderColumn(field)}`;
      if (lineArray[NEXTPLACE] !== BLANKSPOT){
        secondField = lineArray[NEXTPLACE];
        res = res + 
        `${createHeaderColumn(secondField)}`;
      }
    }   
  }
  res = res + '\n</div>'; 
  return res;
}
function createCartHeader(){
  var res = `<thead>
  <tr>`;
  for(var i = 0 ; i < PDFObject.cart.length ; i++){
    res = res + 
    `<th class="cart-header">
    <div class="header-text">
      <h7>
       ${PDFObject.cart[i].Title}
      </h7>
    </div>
    </th>
    `
  }
res = res +`</tr>
</thead>`
return res;
}
function getCartFieldValue(cartField,i){
  var res = '';
  // console.log("cartField",cartField,"I",i);
  if (cartField.FieldType===20)   //IMAGE
    res = `<img style="max-height:150px; max-width:150px; height:auto; width:auto;" src="${cartField.values[i].value}">`;
  else {                           //Regular value
    if (typeof cartField.values[i].value === "number"){
      res = parseFloat(Math.round(cartField.values[i].value * 100) / 100).toFixed(2);
    }
    else
      res = cartField.values[i].value;
  }
  return res;
}
function createCartRows(orderby){             //TODO: Order BY
  var res = '';

  for (var i = 0 ; i < PDFObject.cart[0].values.length; i++){       //for every line in cart
    res = res + '<tr>';
    for (var j = 0 ; j <  PDFObject.cart.length ; j++){             //for every field in line
      res = res + 
      `
      <td class="cart-line"> 
      ${getCartFieldValue(PDFObject.cart[j],i)}
      </td class="cart-line">
      `;
    }
    res = res + '</tr>';
  }
  res = res + createFinalRowSums();                   // create row for UnitsQuantity and TotalUnitsPriceAfterDiscount
  return res;
}
var totalQuantities;
var TotalUnitsPriceAfterDiscount;
function createFinalRowSums(){
  var res = '<tr class="final-row">';
  var colspan = 0;
  totalQuantities = PDFObject.cart.find(field => field.ApiName === 'UnitsQuantity').values.reduce((a,b) => a + b.value,0);
  TotalUnitsPriceAfterDiscount= PDFObject.cart.find(field => field.ApiName === 'TotalUnitsPriceAfterDiscount').values.reduce((a,b) => a + b.value,0);
  for (var i = 0 ; i <  PDFObject.cart.length ; i++){             //for every field in line
    if (PDFObject.cart[i].ApiName === 'UnitsQuantity' || PDFObject.cart[i].ApiName === 'TotalUnitsPriceAfterDiscount'){
      break;
    }
    colspan++;
  }
  res = res + `<td colspan=${colspan}></td>`;
  for(var i = colspan ; i < PDFObject.cart.length ; i++){
    if (PDFObject.cart[i].ApiName === 'UnitsQuantity'){
      res = res + `<td> ${parseFloat(Math.round(totalQuantities * 100) / 100).toFixed(2)} </td>`;
    }
    else if (PDFObject.cart[i].ApiName === 'TotalUnitsPriceAfterDiscount') {
      res = res + `<td> ${parseFloat(Math.round(TotalUnitsPriceAfterDiscount * 100) / 100).toFixed(2)} </td>`;
    }
    else {
      res = res + `<td> </td>`;
    }
  }
  res = res + '</tr>';
  return res;
}
function footerTemplate(){
  var res = '';
  var matrix = makeLayoutMatrix(PDFObject.footer);
  for(var i = 0 ; i < matrix.length ; i ++){
     res = res + createLine(matrix[i]);
  }
  return res;
}
function totalBoxTemplate(){
  var res = '';
  var TotalsBox = PDFObject.footer.find(field => field.ApiName === 'TotalsBox');
  if (TotalsBox){
    res = res + 
    `
    <div class="row">
      <div class="col" style="text-align: right;">
          SubTotal 
      </div>
      <div class="col" style="text-align: left;">
          ${PDFObject.CurrencySymbol === 'USD' ? '$' : ''}${parseFloat(Math.round(TotalUnitsPriceAfterDiscount * 100) / 100).toFixed(2)}
      </div>
    </div>
    <div class="row">
    <div class="col" style="text-align: right;">
        Discount (${TotalsBox.value.DiscountPercentage}%)
    </div>
    <div class="col" style="text-align: left;">
          ${PDFObject.CurrencySymbol === 'USD' ? '$' : ''} ${parseFloat(Math.round((TotalUnitsPriceAfterDiscount * TotalsBox.value.DiscountPercentage / 100) * 100) / 100).toFixed(2)}
    </div>
    </div>
      <div class="row" style="background-color:lightgray;">
        <div class="col" style="text-align: right;">
          Totals
        </div>
        <div class="col" style="text-align: left;">
          <strong>${TotalsBox.value.GrandTotal}</strong>
        </div>
    </div>
    <br/>
    <br/>
    `
  }
  return res;
}
function cartTemplate(){
  var res = createCartHeader();
  res = res + createCartRows();
  return res;
}

function headerTemplate(){
    var matrix = makeLayoutMatrix(PDFObject.header);
    var template ='';
    // console.log(matrix);
    for (var i = 0; i < matrix.length; i++){
      template = template + createLine(matrix[i],i);
    }
    // console.log(template);
    return template;
 }
document.getElementById("header").innerHTML =`
${headerTemplate()}
<br/>
<br/>`;
document.getElementById("table-cart").innerHTML=`
${cartTemplate()}
`;
document.getElementById("total-box").innerHTML=`
<br/>
${totalBoxTemplate()}
`
document.getElementById("footer").innerHTML=`
${footerTemplate()}
`
// ${totalBoxTemplate()}
// ${footerTemplate()}
