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
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>serverReady);
  assert.equal(await page.locator('#app .grid article').count(),2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#app .grid article').first().locator('button').last().click();await page.locator('#bar button').click();
  await page.waitForFunction(()=>view==='schedule');const slot=page.locator('button.slot:not([disabled])').first();assert.equal(await slot.count(),1);await slot.click();await page.locator('#app .actions .primary').click();await page.waitForFunction(()=>view==='checkout');
  await page.locator('#customerName').fill('Browser Customer');await page.locator('#customerPhone').fill('+16045550124');await page.locator('#app form button.primary').click();await page.waitForFunction(()=>view==='confirmation');assert.match(await page.locator('.code').textContent(),/^\d{6}$/);
  assert.match(await page.locator('#app').textContent(),/Automatic SMS is not configured/);
  await page.screenshot({path:`/tmp/baanou-full-confirm-${width}.png`,fullPage:true});
  await page.evaluate(()=>go('home'));await page.evaluate(()=>toggleLang());assert.equal(await page.locator('html').getAttribute('dir'),'rtl');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>toggleLang());await page.evaluate(()=>go('account'));await page.waitForSelector('#loginUsername');await page.locator('#loginUsername').fill('Admin');await page.locator('#loginPassword').fill('Fixture-Admin-Password-2026!');await page.locator('#loginPassword').press('Enter');await page.waitForFunction(()=>view==='admin'&&isManager());
  await page.evaluate(()=>{tab='accounting';render();});assert.match(await page.locator('#app').textContent(),/Accounting|Ledger|Sales/);await page.screenshot({path:`/tmp/baanou-full-admin-${width}.png`,fullPage:true});
  await page.evaluate(()=>{tab='settings';render();});await page.waitForSelector('#settingsForm');assert.equal(await page.locator('#settingsForm').count(),1);
  for(const section of ['dashboard','orders','production','handoff','customers','security'])await page.evaluate(section=>{tab=section;render();},section);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: supplied design, real booking, confirmation code, bilingual UI, manager login, accounting and settings.`);await page.close();
 }
 await browser.close();for(const ctx of contexts)await ctx.dispose();
})();
