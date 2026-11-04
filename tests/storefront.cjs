const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [360,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_BASE_URL||'http://localhost:3000/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.product').count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#photo-button img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  const mobile=width<=700;
  if(mobile){assert.equal(await page.locator('#checkout').isVisible(),false);assert.equal(await page.locator('#continue-button').isDisabled(),true);}
  await page.screenshot({path:`/tmp/baanou-order-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Add one White bread',exact:true}).click();
  assert.match(await page.locator('#total').textContent(),/\$4.25/);
  await page.getByRole('button',{name:'Add one Bran bread',exact:true}).click();
  assert.match(await page.locator('#total').textContent(),/\$8.75/);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#total').textContent(),/\$8.75/);
  await page.locator('#add-both').click();assert.match(await page.locator('#total').textContent(),/\$17.50/);
  await page.locator('#photo-button').click();assert.equal(await page.locator('.photo-dialog img').isVisible(),true);await page.getByRole('button',{name:'Close dialog'}).click();
  if(mobile){await page.locator('#continue-button').click();assert.equal(await page.locator('#breads').isVisible(),false);await page.locator('#edit-bread').click();assert.equal(await page.locator('#breads').isVisible(),true);await page.locator('#continue-button').click();}
  await page.locator('[name=name]').fill('Alex Smith');await page.locator('[name=phone]').fill('(604) 555-0123');
  await page.screenshot({path:`/tmp/baanou-details-${width}.png`,fullPage:true});
  await page.locator('input[value=delivery]').check();assert.equal(await page.locator('[name=postal]').isVisible(),true);
  await page.locator('[name=address]').fill('123 Example Street, Vancouver, BC');await page.locator('[name=postal]').fill('V6B 1A1');await page.locator('[name=consent]').check();
  await page.route('**/api/order.php',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Email service unavailable'})}));
  await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#form-error').textContent==='Email service unavailable');
  assert.match(await page.locator('#selection-summary').textContent(),/\$17.50/);
  await page.unroute('**/api/order.php');
  await page.route('**/api/order.php',r=>{const data=r.request().postDataJSON();assert.equal(data.phone,'+16045550123');assert.equal(data.items.length,2);assert.equal(data.time,'next');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'AS-0123-1234ABCD',subtotalCents:1750,currency:'CAD'})});});
  await page.locator('[type=submit]').click();await page.waitForSelector('dialog[open]');assert.match(await page.locator('#dialog-content').textContent(),/AS-0123-1234ABCD/);assert.equal(await page.locator('#cart-count').textContent(),'0 breads');
  await page.getByRole('button',{name:'Close dialog'}).click();await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#cart-count').textContent(),'0 breads');
  await page.locator('#history-button').click();assert.match(await page.locator('#dialog-content').textContent(),/AS-0123-1234ABCD/);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: compact layout, bread reference, quantities, prices, saved bag, mobile steps, edit, delivery, failed/successful submission, history.`);
  await page.close();
 }
 await browser.close();
})();
