const {chromium,request}=require('playwright-core');
const fs=require('fs'),assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3001/';
const dir=process.env.BAANOU_TEST_DATA_DIR;
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(base)||!dir)throw Error('Use a loopback test server and BAANOU_TEST_DATA_DIR. Never run against production.');
(async()=>{
 const contexts=[];
 async function client(){const api=await request.newContext({baseURL:base});contexts.push(api);let state;async function call(action,data={},expected=200){let response;if(action==='state')response=await api.get('api/shop.php');else response=await api.post('api/shop.php',{headers:{'X-CSRF-Token':state.csrf},data:{action,...data}});const result=await response.json();assert.equal(response.status(),expected,JSON.stringify(result));if(expected===200){assert.equal(result.testMode,true,'Real email must be disabled');state=result;}return result;}await call('state');return {api,call,get state(){return state}};}
 const admin=await client();const token=fs.readFileSync(dir+'/setup-token.txt','utf8').trim();
 await admin.call('setup',{token,password:'Fixture-Admin-Password-2026!'});assert.equal(admin.state.account.role,'admin');assert.equal(fs.existsSync(dir+'/setup-token.txt'),false);
 const stranger=await client();await stranger.call('staffCreate',{username:'bad',password:'Fixture-Staff-Password!'},401);
 const customer=await client();await customer.call('register',{name:'Fixture Customer',phone:'+16045550123',email:'test@example.test',username:'fixturecustomer',password:'Fixture-Customer-Password!'});assert.equal(customer.state.db.users[0].balance,0);
 await customer.call('topup',{amount:25});assert.equal(customer.state.db.users[0].balance,0);await admin.call('state');await admin.call('topupApprove',{id:admin.state.db.topups[0].id});await customer.call('state');assert.equal(customer.state.db.users[0].balance,25);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);
 const order={name:'Fixture Customer',phone:'+16045550123',date:date.toISOString().slice(0,10),start:420,quantities:[1,1,0],method:'wallet',notes:'Fixture request',requestKey:'fixture-order-123456',walkin:false};
 const placed=await customer.call('order',order);assert.equal(customer.state.db.users[0].balance,16.25);const replay=await customer.call('order',order);assert.equal(replay.orderId,placed.orderId);assert.equal(replay.replayed,true);
 await stranger.call('state');assert.equal(JSON.stringify(stranger.state.db).includes('Fixture Customer'),false);assert.equal(JSON.stringify(admin.state).includes('$2y$'),false);
 for(const status of ['confirmed','baking','ready'])await admin.call('status',{id:placed.orderId,status});
 const pickup=admin.state.db.orders.find(o=>o.id===placed.orderId).code;await admin.call('handoff',{id:placed.orderId,code:'000000'},422);await admin.call('handoff',{id:placed.orderId,code:pickup});await admin.call('handoff',{id:placed.orderId,code:pickup},422);
 await admin.call('staffCreate',{username:'fixturestaff',password:'Fixture-Staff-Password!'});const staff=await client();await staff.call('login',{username:'fixturestaff',password:'Fixture-Staff-Password!'});await staff.call('settings',{settings:staff.state.db.settings,breads:staff.state.db.breads},403);
 console.log('PASS server: private accounts, setup, role isolation, shared reservations, verified wallet credit, exact debit, replay, privacy and one-time pickup.');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [390,600,1440]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>serverReady);
  assert.equal(await page.locator('#app .grid article').count(),2);assert.equal(await page.locator('.qty button,#nav>button,#bar button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return !r.width||r.width>=43.9&&r.height>=43.9;})),true,'Primary touch targets are at least 44px');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#app .grid article').first().locator('button').last().click();await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>serverReady);assert.equal(await page.evaluate(()=>count()),1,'Basket survives reload');await page.locator('#bar button').click();
  await page.waitForFunction(()=>view==='schedule');const slot=page.locator('button.slot:not([disabled])').first();assert.equal(await slot.count(),1);await slot.click();await page.locator('#app .actions .primary').click();await page.waitForFunction(()=>view==='checkout');
  await page.locator('#customerName').fill('Browser Customer');await page.locator('#customerPhone').fill('+16045550124');
  await page.evaluate(()=>toggleLang());assert.equal(await page.locator('#customerName').inputValue(),'Browser Customer');
  if(width===390)await page.evaluate(()=>BAANOU_STORE.setItem('bano-v2-owned','malformed cache'));
  let requests=0;
  await page.route('**/api/shop.php',route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().action==='order'){requests++;return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'This baking time is no longer available. Please choose another.'})});}return route.continue();});
  await page.locator('#app form button.primary').click();await page.waitForFunction(()=>!busy);assert.match(await page.locator('#toast').textContent(),/ظرفیت/);assert.equal(await page.locator('#customerName').inputValue(),'Browser Customer');
  await page.unroute('**/api/shop.php');await page.evaluate(()=>toggleLang());
  await page.route('**/api/shop.php',route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().action==='order')requests++;return route.continue();});
  await page.evaluate(()=>Promise.all([placeOrder(),placeOrder()]));await page.waitForFunction(()=>view==='confirmation');assert.equal(requests,2,'Duplicate submit sends one booking');await page.unroute('**/api/shop.php');assert.match(await page.locator('.code').textContent(),/^\d{6}$/);
  assert.match(await page.locator('#app').textContent(),/Automatic SMS is not configured/);
  await page.screenshot({path:`/tmp/baanou-full-confirm-${width}.png`,fullPage:true});
  await page.evaluate(()=>go('home'));assert.equal(await page.locator('.returning-order').count(),1);await page.locator('.returning-order button').click();assert.equal(await page.evaluate(()=>count()),1);assert.equal(await page.evaluate(()=>chosen),'');await page.evaluate(()=>toggleLang());assert.equal(await page.locator('html').getAttribute('dir'),'rtl');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>toggleLang());await page.evaluate(()=>go('account'));await page.waitForSelector('#loginUsername');await page.locator('#loginUsername').fill('Admin');await page.locator('#loginPassword').fill('Fixture-Admin-Password-2026!');await page.evaluate(()=>toggleLang());assert.equal(await page.locator('#loginPassword').inputValue(),'Fixture-Admin-Password-2026!');await page.evaluate(()=>toggleLang());await page.locator('#loginPassword').press('Enter');await page.waitForFunction(()=>view==='admin'&&isManager());
  await page.evaluate(()=>{tab='accounting';render();});assert.match(await page.locator('#app').textContent(),/Accounting|Ledger|Sales/);await page.screenshot({path:`/tmp/baanou-full-admin-${width}.png`,fullPage:true});
  await page.evaluate(()=>{tab='settings';render();});await page.waitForSelector('#settingsForm');assert.equal(await page.locator('#settingsForm').count(),1);
  for(const section of ['dashboard','orders','production','handoff','customers','security'])await page.evaluate(section=>{tab=section;render();},section);
  for(const narrow of [320,800]){await page.setViewportSize({width:narrow,height:950});for(const language of ['en','fa'])for(const section of ['dashboard','accounting','settings','security']){await page.evaluate(({language,section})=>{lang=language;tab=section;go('admin');},{language,section});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No admin overflow ${narrow}px ${language} ${section}`);}}
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: bilingual drafts, saved basket/reorder, translated errors, duplicate submit, real booking, manager/accounting/settings.`);await page.close();
 }
 const offlineContext=await browser.newContext(),offlinePage=await offlineContext.newPage();
 await offlinePage.route('**/api/shop.php',route=>route.abort());await offlinePage.goto(base,{waitUntil:'networkidle'});await offlinePage.waitForSelector('.connection-error');
 await offlinePage.evaluate(()=>toggleLang());assert.match(await offlinePage.locator('.connection-error h2').textContent(),/ارتباط/);
 await offlinePage.unroute('**/api/shop.php');await offlinePage.locator('.connection-error .primary').click();await offlinePage.waitForFunction(()=>serverReady);assert.equal(await offlinePage.locator('.connection-error').count(),0);await offlineContext.close();
 const privateContext=await browser.newContext();await privateContext.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage unavailable','SecurityError');}}));const privatePage=await privateContext.newPage();
 await privatePage.goto(base,{waitUntil:'networkidle'});await privatePage.waitForFunction(()=>serverReady);await privatePage.evaluate(()=>{qty(0,1);toggleLang();});assert.equal(await privatePage.evaluate(()=>count()),1);assert.equal(await privatePage.locator('html').getAttribute('dir'),'rtl');await privateContext.close();
 const customerPage=await browser.newPage();await customerPage.goto(base,{waitUntil:'networkidle'});await customerPage.waitForFunction(()=>serverReady);await customerPage.evaluate(async()=>{await shopRequest('login',{username:'fixturecustomer',password:'Fixture-Customer-Password!'});go('account');});
 await customerPage.locator('input[name=fullName]').fill('Unsaved profile edit');await customerPage.evaluate(async()=>{await topup('10');});assert.equal(await customerPage.locator('input[name=fullName]').inputValue(),'Unsaved profile edit','Unrelated wallet request keeps profile draft');await customerPage.close();
 console.log('PASS recovery: bilingual initial error/retry, blocked browser storage, unrelated-request form preservation.');
 await browser.close();for(const ctx of contexts)await ctx.dispose();
})();
