'use strict';
// Production integration of the supplied UI: only the PHP service authorizes mutations.
let serverIdentity=null,csrf='',serverReady=false,placingKey=null,activePickupCode='';
function applyState(result){db=result.db;cart=cart.map((q,i)=>db.breads[i]?.active?Math.min(q,db.breads[i].max):0);serverIdentity=result.account;csrf=result.csrf;identity=serverIdentity?{id:serverIdentity.id,version:serverIdentity.version}:null;userId=serverIdentity?.userId||'';admin=['admin','staff'].includes(serverIdentity?.role);authReady=true;serverReady=true;window.needsSetup=result.needsSetup;}
async function shopRequest(action,data={}){
 const response=action==='state'?await fetch('api/shop.php',{cache:'no-store'}):await fetch('api/shop.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({action,...data})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed.');applyState(result);return result;
}
sessionAccount=function(){return serverIdentity;};
read=function(){};
atomic=async function(){throw Error('This operation requires the order service.');};
Object.assign(dictionary,{
 demo:['Cash/transfer verified by the store. Wallet uses approved balance.','نقد و انتقال با تأیید فروشگاه؛ کیف پول از اعتبار تأییدشده استفاده می‌کند.'],
 local:['Your order is shared with the bakery. Times: Vancouver.','سفارش شما در اختیار نانوایی قرار می‌گیرد؛ زمان‌ها به وقت ونکوور هستند.'],
 warning:['Sign in with your store account.','با حساب فروشگاه وارد شوید.'],
 authDemo:['Passwords and account permissions are checked by the server.','رمزها و سطح دسترسی در سرور بررسی می‌شوند.'],
 credentials:['',''],customerDemo:['',''],authLoading:['Connecting…','در حال اتصال…'],
 sms:['Pickup notification','اطلاعات تحویل'],
 addDemoFunds:['Request wallet top-up','درخواست شارژ کیف پول'],
 topupNote:['Verified store top-up','شارژ تأییدشده فروشگاه'],
 minimumTopup:['Minimum $10 CAD. Funds are added only after the store verifies payment.','حداقل ۱۰ دلار؛ اعتبار تنها پس از تأیید پرداخت توسط فروشگاه اضافه می‌شود.'],
 adjustmentDemo:['Record an actual payment or adjustment with a reason.','تنها پرداخت یا اصلاح واقعی را همراه دلیل ثبت کنید.'],
 ledgerStart:['Server ledger. Wallet transfers are not counted twice as sales.','دفتر کل سرور؛ انتقال کیف پول دوباره به عنوان فروش محاسبه نمی‌شود.'],
 sale_refund:['Sale refund','بازپرداخت فروش'],badPassword:['Use at least 10 characters and repeat the password correctly.','حداقل ۱۰ نویسه وارد کنید و رمز را درست تکرار کنید.']
});
const liveRender=render;
render=function(){liveRender();document.title=db.settings.name+' · Bread orders';document.querySelectorAll('input[type=password]').forEach(e=>{if(e.autocomplete!=='current-password')e.minLength=10;});document.querySelectorAll('footer').forEach(f=>{if(!f.querySelector('.zenith-credit'))f.insertAdjacentHTML('beforeend','<p class="zenith-credit">Website Design &amp; Development by <a href="https://azenith.net/" target="_blank" rel="noopener noreferrer">A Zenith Web Solutions</a></p>');});};
const liveSignIn=signInPage;
signInPage=function(){let html=liveSignIn();if(window.needsSetup&&loginMode==='admin')html+=`<details id="setup-panel" class="card pad" open><summary>Initial administrator setup</summary><p class="small">Read the one-time token from <b>/home/isp85/.baanou-data/setup-token.txt</b> in cPanel File Manager. Never share it in chat.</p><form onsubmit="event.preventDefault();setupAdmin(this)"><label>Setup token</label><input name="token" required autocomplete="off"><label>New administrator password</label><input name="password" type="password" minlength="12" required autocomplete="new-password"><button class="primary">Create Admin</button></form></details>`;return html;};
async function setupAdmin(f){try{await shopRequest('setup',{token:f.token.value.trim(),password:f.password.value});tab='security';go('admin');}catch(e){toast(e.message);}}
signIn=async function(f){if(authBusy)return;authBusy=true;try{await shopRequest('login',{username:f.loginUsername.value.trim(),password:f.loginPassword.value});checkout.name='';checkout.phone='+1';if(isOperator()){tab='dashboard';go('admin');}else go(chosen&&count()?'checkout':'account');}catch(e){toast(e.message);}finally{authBusy=false;render();}};
signOut=async function(guest=false){try{await shopRequest('logout');localStorage.removeItem('bano-v2-owned');walkin=false;verified='';checkout={name:'',phone:'+1',method:'cash'};go(guest?'home':'account');}catch(e){toast(e.message);}};
registerUser=async function(f){if(authBusy)return;authBusy=true;try{await shopRequest('register',{name:f.fullName.value.trim(),phone:canadianPhone(f.phone.value),email:f.email.value,username:f.newUsername.value.trim(),password:f.newCustomerPassword.value});go(count()&&chosen?'checkout':'account');}catch(e){toast(e.message);}finally{authBusy=false;render();}};
saveProfile=async function(f){try{await shopRequest('profile',{name:f.fullName.value.trim(),phone:canadianPhone(f.phone.value),email:f.email.value});render();toast(t('saved'));}catch(e){toast(e.message);}};
changeMyPassword=async function(f){if(f.newPassword.value!==f.repeatPassword.value)return toast(t('badPassword'));try{await shopRequest('password',{current:f.currentPassword.value,password:f.newPassword.value});render();toast(t('passwordChanged'));}catch(e){toast(e.message);}};
createStaff=async function(f){try{await shopRequest('staffCreate',{username:f.staffUsername.value,password:f.staffPassword.value});render();toast(t('staffCreated'));}catch(e){toast(e.message);}};
setStaffPassword=async function(id,f){try{await shopRequest('staffPassword',{id,password:f.staffPassword.value});render();toast(t('passwordChanged'));}catch(e){toast(e.message);}};
removeStaff=async function(id){try{await shopRequest('staffRemove',{id});staffRemoval='';render();toast(t('staffRemoved'));}catch(e){toast(e.message);}};
topup=async function(value=topupDraft){try{await shopRequest('topup',{amount:digitsEN(value)});render();toast(lang==='fa'?'درخواست شارژ ثبت شد؛ فروشگاه باید پرداخت را تأیید کند.':'Top-up requested. The store must verify payment.');}catch(e){toast(e.message);}};
adjustWallet=async function(id,f){try{await shopRequest('walletAdjust',{userId:id,amount:digitsEN(f.amount.value),direction:f.direction.value,reason:f.reason.value.trim()});walletEditId='';render();toast(t('balanceSaved'));}catch(e){toast(e.message);}};
async function approveTopup(id){if(!confirm(lang==='fa'?'آیا پرداخت واقعی را دریافت کرده‌اید؟':'Have you actually received this payment?'))return;try{await shopRequest('topupApprove',{id});render();toast(t('balanceSaved'));}catch(e){toast(e.message);}}
const liveAccounting=accounting;
accounting=function(){return `<h3>${lang==='fa'?'شارژهای در انتظار پرداخت':'Top-ups awaiting verified payment'}</h3>${(db.topups||[]).filter(r=>r.status==='pending').map(r=>`<div class="card pad row"><span>${E(db.users.find(u=>u.id===r.userId)?.name||'')} · ${money(r.amountCents/100)}</span><button onclick="approveTopup('${r.id}')">${lang==='fa'?'پرداخت دریافت شد؛ تأیید شارژ':'Payment received — approve'}</button></div>`).join('')||'<p class="muted">—</p>'}${liveAccounting()}`;};
placeOrder=async function(){
 if(busy||!serverReady)return;const wasWalkin=walkin,name=document.getElementById('customerName').value.trim(),phone=canadianPhone(document.getElementById('customerPhone').value);checkout.name=name;checkout.phone=phone;if(name.length<2||!phone)return toast(t('required'));
 const payload={name,phone,date:bookingDay,start:Number(chosen),quantities:cart.slice(),method:checkout.method,notes,walkin:wasWalkin};const fingerprint=JSON.stringify(payload);if(!placingKey||placingKey.fingerprint!==fingerprint)placingKey={fingerprint,key:crypto.randomUUID()};busy=true;render();
 try{const result=await shopRequest('order',{...payload,requestKey:placingKey.key});orderId=result.orderId;placingKey=null;let owned=JSON.parse(localStorage.getItem('bano-v2-owned')||'[]');if(!wasWalkin&&!owned.includes(orderId))owned.push(orderId);try{localStorage.setItem('bano-v2-owned',JSON.stringify(owned));}catch{}cart=[0,0,0];notes='';walkin=false;if(wasWalkin){tab='counterReceipt';go('admin');}else go('confirmation');if(result.notification==='failed')toast(lang==='fa'?'سفارش ذخیره شد؛ ایمیل ارسال نشد. با فروشگاه تماس بگیرید.':'Order saved. Email unavailable; please call the store.');}
 catch(e){toast(e.message);}finally{busy=false;render();}
};
changeStatus=async function(id,status){const order=db.orders.find(o=>o.id===id);let refundConfirmed=false;if(status==='cancelled'&&order?.payment==='paid'&&order.method!=='wallet'){refundConfirmed=confirm(lang==='fa'?'آیا مبلغ این سفارش را واقعاً به مشتری پس داده‌اید؟':'Have you actually refunded this paid order?');if(!refundConfirmed)return;}try{await shopRequest('status',{id,status,refundConfirmed});render();}catch(e){toast(e.message);render();}};
payOrder=async function(id){if(!confirm(lang==='fa'?'پرداخت واقعاً دریافت شده است؟':'Confirm that payment was actually received?'))return;try{await shopRequest('pay',{id});render();}catch(e){toast(e.message);}};
delayOrder=async function(id){const order=db.orders.find(o=>o.id===id),value=prompt(t('pickup')+' · HH:MM (Vancouver)',clock(order.end));if(value===null)return;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return toast(t('invalidSettings'));try{await shopRequest('delay',{id,end:mins(value)});render();}catch(e){toast(e.message);}};
verifyPickup=async function(f){try{const result=await shopRequest('verify',{id:f.oid.value.trim().toUpperCase(),code:f.code.value});verified=result.verified;activePickupCode=f.code.value;render();}catch(e){verified='';render();toast(e.message);}};
confirmPickup=async function(){try{await shopRequest('handoff',{id:verified,code:activePickupCode});verified='';activePickupCode='';render();toast(t('deliveredOk'));}catch(e){verified='';render();toast(e.message);}};
saveSettings=async function(f){
 const val=k=>f.elements[k].value,num=k=>Number(val(k)),checked=k=>f.elements[k].checked;
 try{const s=structuredClone(db.settings),bs=structuredClone(db.breads);for(const [field,input]of [['name','bakeryName'],['phone','bakeryPhone'],['address','address'],['storeOpen','storeOpen'],['storeClose','storeClose']])s[field]=val(input);if(imageDraft.logo!==undefined)s.logo=imageDraft.logo;s.days=[0,1,2,3,4,5,6].filter(i=>checked('day'+i));s.holidays=val('holidays').split(/[,،\s]+/).filter(Boolean);s.sessions=val('sessions').trim().split('\n').map(line=>{const[start,end]=line.trim().split('-');return{start,end};}).sort((a,b)=>a.start.localeCompare(b.start));for(const k of ['interval','horizon','ovens','ovenCapacity','slotCapacity','maxOrders','packing'])s[k]=num(k);s.overrun=checked('overrun');for(const k of ['cash','transfer','wallet'])s.payments[k]=checked(k);s.overrides={};for(const line of val('overrides').split('\n').filter(l=>l.trim())){const[key,cap,off]=line.trim().split(',');s.overrides[key]={capacity:Number(cap),disabled:off==='1'};}bs.forEach((b,i)=>{b.en=val('en'+i);b.fa=val('fa'+i);b.price=num('price'+i);b.bake=num('bake'+i);b.max=num('max'+i);b.active=checked('active'+i);b.descriptionEn=val('descriptionEn'+i);b.descriptionFa=val('descriptionFa'+i);if(imageDraft[i]!==undefined)b.image=imageDraft[i];});await shopRequest('settings',{settings:s,breads:bs});imageDraft={};cart=cart.map((q,i)=>db.breads[i].active?Math.min(q,db.breads[i].max):0);chosen='';render();toast(t('saved'));}catch(e){toast(e.message);}
};
resetDemo=function(){toast(lang==='fa'?'پاک‌کردن داده‌های واقعی از این صفحه مجاز نیست.':'Live records cannot be reset from this page.');};
const liveSettings=settingsPage;
settingsPage=function(){return liveSettings().replace(/<button type="button" onclick="resetDemo\(\)">[\s\S]*?<\/button>/,'');};
const liveHome=home;
home=function(){let i=0;return liveHome().replace(/<article class="card">[\s\S]*?<\/article>/g,card=>db.breads[i++].active?card:'');};
const liveConfirmation=confirmation;
confirmation=function(){return liveConfirmation().replace(`<b>${t('sms')}</b>`,`<b>${t('sms')}</b><p class="small muted">${lang==='fa'?'پیامک خودکار فعال نیست؛ کد تحویل را نگه دارید.':'Automatic SMS is not configured. Keep your pickup code.'}</p>`);};
shopRequest('state').then(()=>{if(new URLSearchParams(location.search).get('setup')==='1'&&window.needsSetup){loginMode='admin';view='account';}render();if(window.needsSetup&&new URLSearchParams(location.search).get('setup')==='1')document.getElementById('setup-panel')?.scrollIntoView({block:'start'});}).catch(e=>{document.getElementById('app').innerHTML='<div class="notice">'+E(e.message)+' <a href="tel:+16045440046">(604) 544-0046</a></div>';});
setInterval(()=>{if(serverReady&&!busy&&!authBusy&&!document.hidden&&!document.querySelector('input:focus,textarea:focus,select:focus'))shopRequest('state').then(()=>{if(new URLSearchParams(location.search).get('setup')==='1'&&window.needsSetup){loginMode='admin';view='account';}render();if(window.needsSetup&&new URLSearchParams(location.search).get('setup')==='1')document.getElementById('setup-panel')?.scrollIntoView({block:'start'});}).catch(()=>{});},30000);
