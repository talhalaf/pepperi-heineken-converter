const puppeteer = require('puppeteer');

puppeteer.launch().then(async browser => {
  const page = await browser.newPage();
  await page.goto('https://www.amazon.com/s/ref=nb_sb_noss_2?url=search-alias%3Daps&field-keywords=usb+device');
  await page.screenshot({path: 'screenshot.png'});
  await page.pdf({path: 'screenshot.pdf'});
  await page.content().then(res=>{
    console.log(res);
  });
  await browser.close();
}).catch(e=>{
  console.log(e);
});