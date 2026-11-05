'use strict';
// Production integration of the supplied UI: only the PHP service authorizes mutations.
let serverIdentity=null,csrf='',serverReady=false,placingKey=null,activePickupCode='',connectionError=null;
function applyState(result){connectionError=null;if(serverIdentity?.id!==(result.account?.id)){formDrafts.clear();hasSecretDraft=false;if(serverIdentity){checkout.name='';checkout.phone='+1';}}db=result.db;cart=cart.map((q,i)=>db.breads[i]?.active?Math.min(q,db.breads[i].max):0);serverIdentity=result.account;csrf=result.csrf;identity=serverIdentity?{id:serverIdentity.id,version:serverIdentity.version}:null;userId=serverIdentity?.userId||'';admin=['admin','staff'].includes(serverIdentity?.role);authReady=true;serverReady=true;window.needsSetup=result.needsSetup;}
const requestDisabled=new Map(),stateControllers=new Set();
const inflight=new Map();let writeQueue=Promise.resolve(),writePending=0,writeEpoch=0;
function uiMessage(message,status=0){
 if(lang!=='fa')return message;
 const messages={
 'Incorrect username or password.':'نام کاربری یا رمز عبور نادرست است.',
 'Insufficient wallet balance.':'موجودی کیف پول کافی نیست.',
 'This baking time is no longer available. Please choose another.':'ظرفیت این نوبت تغییر کرده است؛ زمان دیگری انتخاب کنید.',
 'Please wait before placing another order.':'پیش از ثبت سفارش بعدی چند لحظه صبر کنید.',
 'A top-up is already awaiting verification.':'یک درخواست شارژ در انتظار تأیید فروشگاه دارید.',
 'Minimum top-up is $10 CAD.':'حداقل مبلغ شارژ ۱۰ دلار کانادا است.',
 'Pickup code or status is invalid.':'کد تحویل یا وضعیت سفارش معتبر نیست.',
 'Phone already registered.':'این شماره تلفن قبلاً ثبت شده است.',
 'Phone is already registered.':'این شماره تلفن قبلاً ثبت شده است.',
 'Username exists.':'این نام کاربری قبلاً استفاده شده است.',
 'Username is already in use.':'این نام کاربری قبلاً استفاده شده است.',
 'Enter a Canadian phone number.':'شماره تلفن معتبر کانادایی وارد کنید.',
 'Enter a valid Canadian phone number.':'شماره تلفن معتبر کانادایی وارد کنید.',
 'Invalid setup token.':'کد راه‌اندازی معتبر نیست.',
 'Administrator already configured.':'حساب مدیر قبلاً راه‌اندازی شده است.',
 'Settings would invalidate an existing reservation.':'این تنظیمات با یک رزرو موجود تداخل دارد.',
 'Baking sessions overlap.':'بازه‌های پخت با یکدیگر تداخل دارند.',
 'Two staff accounts maximum.':'حداکثر دو حساب کارکنان مجاز است.',
 'Payment cannot be recorded twice.':'این پرداخت قابل ثبت دوباره نیست.',
 'Balance cannot be negative.':'موجودی کیف پول نمی‌تواند منفی شود.',
 'Use a password with at least 12 characters.':'رمز مدیر باید حداقل ۱۲ نویسه داشته باشد.',
 'Check current password; new password needs 10 characters.':'رمز فعلی را بررسی کنید؛ رمز جدید حداقل ۱۰ نویسه لازم دارد.',
 'Check username, email and password (10 characters minimum).':'نام کاربری، ایمیل و رمز با حداقل ۱۰ نویسه را بررسی کنید.',
 'Order changed. Please review.':'سفارش تغییر کرده است؛ آن را دوباره بررسی کنید.',
 'Payment method unavailable.':'این روش پرداخت در دسترس نیست.',
 'Service connection lost. Your details are kept; retry or call the store.':'ارتباط قطع شد؛ اطلاعات فرم حفظ شده است. دوباره تلاش کنید یا با فروشگاه تماس بگیرید.',
 'The service returned an unexpected response. Please try again.':'پاسخ سرویس معتبر نبود؛ دوباره تلاش کنید.',
 'Session expired. Refresh and try again.':'نشست شما منقضی شده است؛ صفحه را تازه‌سازی کنید.'
 };
 if(messages[message])return messages[message];
 if(/Too many/.test(message))return 'تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.';
 if(/password|characters/.test(message))return 'نام کاربری و رمز عبور با حداقل ۱۰ نویسه را بررسی کنید.';
 if(status===401)return 'برای ادامه وارد حساب شوید.';
 if(status===403)return 'اجازهٔ انجام این عملیات را ندارید.';
 if(/not found/.test(message))return 'مورد درخواستی پیدا نشد؛ اطلاعات را تازه‌سازی کنید.';
 if(/^(Invalid|Check|Choose|Use|Enable)/.test(message))return 'مقادیر واردشده را بررسی کنید؛ برخی اطلاعات معتبر نیستند.';
 return 'درخواست انجام نشد؛ دوباره تلاش کنید یا با فروشگاه تماس بگیرید.';
}
function requestFeedback(){
 document.documentElement.classList.toggle('request-pending',writePending>0);
 document.getElementById('request-status')?.replaceChildren(document.createTextNode(writePending?t('working'):''));
 for(const f of document.querySelectorAll('form')){f.setAttribute('aria-busy',String(writePending>0));if(writePending)for(const control of f.querySelectorAll('input,select,textarea,button')){if(!requestDisabled.has(control))requestDisabled.set(control,control.disabled);control.disabled=true;}}
 if(!writePending){for(const [control,wasDisabled]of requestDisabled)if(control.isConnected)control.disabled=wasDisabled;requestDisabled.clear();}
}
async function performRequest(action,data){
 const epoch=writeEpoch,readAllowed=writePending===0;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),action==='state'?20000:30000);if(action==='state')stateControllers.add(controller);
 try{
  const response=await fetch('api/shop.php',action==='state'?{cache:'no-store',signal:controller.signal}:{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({action,...data}),signal:controller.signal});
  let result;try{result=await response.json();}catch{throw Error('The service returned an unexpected response. Please try again.');}
  if(!response.ok){const error=Error(result.error||'Request failed.');error.status=response.status;throw error;}
  if(!result.db||typeof result.csrf!=='string')throw Error('The service returned an unexpected response. Please try again.');
  if(action!=='state'||(epoch===writeEpoch&&readAllowed))applyState(result);
  if(action!=='state')clearRequestDrafts(action,data);
  return result;
 }catch(error){
  const message=error.name==='AbortError'||error instanceof TypeError?'Service connection lost. Your details are kept; retry or call the store.':error.message;
  const translated=Error(uiMessage(message,error.status));translated.status=error.status;translated.sourceMessage=message;throw translated;
 }finally{clearTimeout(timer);stateControllers.delete(controller);}
}
function shopRequest(action,data={}){
 const key=action+'|'+JSON.stringify(data);if(inflight.has(key))return inflight.get(key);
 let promise;
 if(action==='state')promise=performRequest(action,data);
 else{
  writePending++;writeEpoch++;for(const controller of stateControllers)controller.abort();requestFeedback();
  promise=writeQueue.then(()=>performRequest(action,data));
  writeQueue=promise.catch(()=>{});
  promise=promise.finally(()=>{writePending--;requestFeedback();});
 }
 const tracked=promise.finally(()=>{if(inflight.get(key)===tracked)inflight.delete(key);});inflight.set(key,tracked);return tracked;
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
// Ephemeral drafts never persist passwords, tokens or customer details to browser storage.
const formDrafts=new Map();let hasSecretDraft=false,lastRenderContext='';
function draftKey(field){const f=field.form;return f?[view,tab,walkin,loginMode,f.id||f.getAttribute('onsubmit')||'',field.name||field.id].join('|'):'';}
function rememberField(event){const field=event.target;if(field.type==='password'||field.name==='token'){hasSecretDraft=[...document.querySelectorAll('form input[type=password],form input[name=token]')].some(f=>Boolean(f.value));return;}if(!field.matches('input,textarea,select')||field.type==='file')return;const key=draftKey(field);if(key)formDrafts.set(key,field.type==='checkbox'?field.checked:field.value);}
document.addEventListener('input',rememberField);document.addEventListener('change',rememberField);
document.addEventListener('input',event=>{if(event.target.matches('input:not([type=tel]),textarea,select'))event.target.setCustomValidity('');});
document.addEventListener('invalid',event=>{const f=event.target;if(f.type==='tel'||typeof f.setCustomValidity!=='function')return;if(f.validity.valueMissing)f.setCustomValidity(lang==='fa'?'این قسمت را تکمیل کنید.':'Please complete this field.');else if(f.validity.tooShort)f.setCustomValidity(lang==='fa'?`حداقل ${f.minLength} نویسه وارد کنید.`:`Use at least ${f.minLength} characters.`);else if(f.validity.typeMismatch)f.setCustomValidity(lang==='fa'?'یک ایمیل معتبر وارد کنید.':'Enter a valid email address.');},true);
function clearRequestDrafts(action,data){
 if(['login','register','logout','setup','order'].includes(action)){formDrafts.clear();hasSecretDraft=false;return;}
 const handlers={profile:'saveProfile(',password:'changeMyPassword(',topup:'topup(',walletAdjust:'adjustWallet(',staffCreate:'createStaff(',staffPassword:'setStaffPassword(',settings:'saveSettings(',verify:'verifyPickup('};
 const handler=handlers[action];if(!handler)return;
 for(const f of document.querySelectorAll('form')){
  const submit=f.getAttribute('onsubmit')||'';if(!submit.includes(handler)||(action==='staffPassword'&&!submit.includes(data.id)))continue;
  for(const field of f.querySelectorAll('input,select,textarea')){formDrafts.delete(draftKey(field));if(field.type==='password'||field.name==='token')field.value='';}
 }
 hasSecretDraft=[...document.querySelectorAll('form input[type=password],form input[name=token]')].some(f=>Boolean(f.value));
}
function restoreDrafts(){for(const field of document.querySelectorAll('form input,form select,form textarea')){const key=draftKey(field);if(!formDrafts.has(key))continue;if(field.type==='checkbox')field.checked=formDrafts.get(key);else field.value=formDrafts.get(key);if(field.type==='tel')field.dispatchEvent(new Event('input',{bubbles:true}));}}
Object.assign(dictionary,{
 skipContent:['Skip to content','رفتن به محتوای اصلی'],filterStatus:['Filter by order status','فیلتر وضعیت سفارش'],orderStatus:['Order status','وضعیت سفارش'],selectOption:['Choose an option','انتخاب گزینه'],working:['Saving…','در حال ذخیره…'],addOne:['Add one','افزودن یک عدد'],removeOne:['Remove one','کم‌کردن یک عدد'],orderProgress:['Order progress','مراحل سفارش'],
 setupTitle:['Initial administrator setup','راه‌اندازی اولیه مدیر'],setupHelp:['Read the one-time token in cPanel File Manager. Never share it in chat.','کد یک‌بارمصرف را در مدیریت فایل سی‌پنل بخوانید؛ آن را در گفتگو ارسال نکنید.'],setupToken:['Setup token','کد راه‌اندازی'],setupPassword:['New administrator password','رمز جدید مدیر'],setupSubmit:['Create Admin','ایجاد حساب مدیر'],
 welcomeBack:['Welcome back. Your favourites are a tap away.','خوش آمدید؛ نان‌های همیشگی‌تان را دوباره انتخاب کنید.'],repeatHelp:['Restore your previous selection, then choose a new baking time.','انتخاب قبلی را برگردانید و زمان پخت تازه‌ای انتخاب کنید.'],repeatOrder:['Order these breads again','سفارش دوباره این نان‌ها'],noRepeat:['These breads are not available right now.','این نان‌ها فعلاً در دسترس نیستند.'],repeatReady:['Selection restored. Review quantities and choose a baking time.','انتخاب قبلی برگشت؛ تعداد را بررسی و زمان پخت را انتخاب کنید.'],
 connectionTitle:['Let’s reconnect.','ارتباط را دوباره برقرار کنیم.'],retry:['Try again','تلاش دوباره'],callStore:['Call the store','تماس با فروشگاه']
});
const liveRender=render;
render=function(){
 const context=[view,tab,walkin,loginMode,serverIdentity?.id,serverIdentity?.version].join('|');
 const focused=document.activeElement,focusKey=focused?.form?draftKey(focused):'',focusLanguage=focused?.getAttribute('onclick')==='toggleLang()';
 const disclosureStates=context===lastRenderContext&&(view==='account'||view==='checkout'||view==='admin'&&['settings','security'].includes(tab))?[...document.querySelectorAll('#app details')].map(d=>d.open):null;
 const secrets=context===lastRenderContext&&hasSecretDraft?[...document.querySelectorAll('form input[type=password],form input[name=token]')].filter(f=>f.value).map(f=>[draftKey(f),f.value]):[];
 liveRender();restoreDrafts();
 if(disclosureStates){const details=[...document.querySelectorAll('#app details')];if(details.length===disclosureStates.length)details.forEach((d,i)=>d.open=disclosureStates[i]);}
 if(context===lastRenderContext){const target=focusKey?[...document.querySelectorAll('form input,form select,form textarea')].find(f=>draftKey(f)===focusKey):focusLanguage?document.querySelector('[onclick="toggleLang()"]'):null;if(target&&!target.disabled)target.focus({preventScroll:true});}
 for(const field of document.querySelectorAll('form input[type=password],form input[name=token]')){const saved=secrets.find(([key])=>key===draftKey(field));if(saved)field.value=saved[1];}
 hasSecretDraft=[...document.querySelectorAll('form input[type=password],form input[name=token]')].some(f=>Boolean(f.value));
 lastRenderContext=[view,tab,walkin,loginMode,serverIdentity?.id,serverIdentity?.version].join('|');
 document.title=db.settings.name+(lang==='fa'?' · سفارش نان':' · Bread orders');document.getElementById('skip-link').textContent=t('skipContent');
 for(const [index,image]of [...document.querySelectorAll('.art img')].entries()){image.loading=index===0?'eager':'lazy';image.decoding='async';image.width=800;image.height=533;}
 for(const e of document.querySelectorAll('input[type=password]'))if(e.autocomplete!=='current-password')e.minLength=Math.max(10,e.minLength);
 for(const f of document.querySelectorAll('footer'))if(!f.querySelector('.zenith-credit'))f.insertAdjacentHTML('beforeend','<p class="zenith-credit">Website Design &amp; Development by <a href="https://azenith.net/" target="_blank" rel="noopener noreferrer">A Zenith Web Solutions</a></p>');
 for(const button of document.querySelectorAll('.qty button')){const match=button.getAttribute('onclick')?.match(/qty\((\d+),(-?1)\)/);if(match)button.setAttribute('aria-label',t(Number(match[2])>0?'addOne':'removeOne')+' '+db.breads[Number(match[1])][lang]);}
 for(const button of document.querySelectorAll('.tabs button')){if(button.classList.contains('current')||button.classList.contains('primary'))button.setAttribute('aria-current','page');}
 for(const control of document.querySelectorAll('select,input[type=search]'))if(!control.labels?.length&&!control.getAttribute('aria-label')&&!control.getAttribute('aria-labelledby')){const action=control.getAttribute('onchange')||'';const order=action.match(/changeStatus\('([^']+)'/);control.setAttribute('aria-label',order?t('orderStatus')+' · '+order[1]:action.includes('statusFilter')?t('filterStatus'):control.placeholder||t('selectOption'));}
 for(const details of document.querySelectorAll('details'))if(!details.dataset.enhanced){details.dataset.enhanced='true';details.addEventListener('toggle',()=>{if(details.firstElementChild?.tagName==='SUMMARY')details.firstElementChild.setAttribute('aria-expanded',String(details.open));});}
 const languageButton=document.querySelector('.language-toggle');if(languageButton){languageButton.setAttribute('aria-label',lang==='fa'?'EN · English':'فا · فارسی');languageButton.lang=lang==='fa'?'en':'fa';}
 const bar=document.querySelector('#bar .primary');if(bar&&!serverReady){bar.disabled=true;bar.textContent=t('authLoading');}
 document.getElementById('app').setAttribute('aria-busy',String(!serverReady||writePending>0));if(!serverReady&&connectionError)renderConnectionError();document.getElementById('bar').setAttribute('aria-live','polite');requestFeedback();saveBasket();
};
const liveSignIn=signInPage;
signInPage=function(){let html=liveSignIn();if(window.needsSetup&&loginMode==='admin')html+=`<details id="setup-panel" class="card pad" open><summary>${t('setupTitle')}</summary><p class="small">${t('setupHelp')} <b dir="ltr">/home/isp85/.baanou-data/setup-token.txt</b></p><form onsubmit="event.preventDefault();setupAdmin(this)"><label>${t('setupToken')}</label><input name="token" required autocomplete="off"><label>${t('setupPassword')}</label><input name="password" type="password" minlength="12" required autocomplete="new-password"><button class="primary">${t('setupSubmit')}</button></form></details>`;return html;};
async function setupAdmin(f){try{await shopRequest('setup',{token:f.token.value.trim(),password:f.password.value});tab='security';go('admin');}catch(e){toast(e.message);}}
signIn=async function(f){if(authBusy)return;authBusy=true;try{await shopRequest('login',{username:f.loginUsername.value.trim(),password:f.loginPassword.value});checkout.name='';checkout.phone='+1';if(isOperator()){tab='dashboard';go('admin');}else go(chosen&&count()?'checkout':'account');}catch(e){toast(e.message);}finally{authBusy=false;render();}};
signOut=async function(guest=false){try{await shopRequest('logout');BAANOU_STORE.removeItem('bano-v2-owned');walkin=false;verified='';checkout={name:'',phone:'+1',method:'cash'};go(guest?'home':'account');}catch(e){toast(e.message);}};
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
 try{const result=await shopRequest('order',{...payload,requestKey:placingKey.key});orderId=result.orderId;placingKey=null;try{const saved=JSON.parse(BAANOU_STORE.getItem('bano-v2-owned')||'[]');const owned=Array.isArray(saved)?saved.filter(id=>typeof id==='string'):[];if(!wasWalkin&&!owned.includes(orderId))owned.push(orderId);BAANOU_STORE.setItem('bano-v2-owned',JSON.stringify(owned));}catch{}cart=[0,0,0];notes='';walkin=false;saveBasket();if(wasWalkin){tab='counterReceipt';go('admin');}else go('confirmation');if(result.notification==='failed')toast(lang==='fa'?'سفارش ذخیره شد؛ ایمیل ارسال نشد. با فروشگاه تماس بگیرید.':'Order saved. Email unavailable; please call the store.');}
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
let initialDraft=null;
try{initialDraft=JSON.parse(BAANOU_STORE.getItem('baanou-basket-v3')||'null');}catch{}
function saveBasket(){if(!serverReady||isOperator())return;try{BAANOU_STORE.setItem('baanou-basket-v3',JSON.stringify({cart,date:bookingDay,chosen,at:Date.now()}));}catch{}}
const originalQty=qty;
qty=function(index,delta){originalQty(index,delta);saveBasket();const buttons=[...document.querySelectorAll('.qty button')];const target=buttons.find(b=>b.getAttribute('onclick')===`qty(${index},${delta})`&&!b.disabled)||buttons.find(b=>b.getAttribute('onclick')===`qty(${index},1)`&&!b.disabled);target?.focus({preventScroll:true});};
const originalGo=go;
go=function(next){saveBasket();originalGo(next);const heading=document.querySelector('#app h1,#app h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}};
progress=function(step){return `<nav class="steps" aria-label="${E(t('orderProgress'))}">${['bread','schedule','checkout','confirmation'].map((k,i)=>`<span class="${i+1===step?'active':''}" ${i+1===step?'aria-current="step"':''}>${new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-CA').format(i+1)} · ${t(k)}</span>`).join('')}</nav>`;};
function repeatSelection(id){const order=db.orders.find(o=>o.id===id&&typeof o.name==='string');if(!order||isOperator())return;cart=db.breads.map((b,i)=>b.active?Math.min(b.max,Math.max(0,order.items[i]?.qty||0)):0);chosen='';bookingDay=addDays(now().date,1);if(!count())return toast(t('noRepeat'));go('home');saveBasket();toast(t('repeatReady'));}
const productionHome=home;
home=function(){let html=productionHome();if(!isOperator()){const order=db.orders.filter(o=>typeof o.name==='string'&&o.items.some(i=>i.qty)).slice().sort((a,b)=>b.created.localeCompare(a.created))[0];if(order)html=`<section class="returning-order row"><div><strong>${t('welcomeBack')}</strong><p class="small muted">${t('repeatHelp')}</p></div><button type="button" onclick="repeatSelection('${E(order.id)}')">${t('repeatOrder')} →</button></section>`+html;}return html;};
tracking=function(){const owned=db.orders.filter(order=>typeof order.name==='string'&&typeof order.code==='string');return `<h2>${t('myorders')}</h2>${owned.slice().reverse().map(orderCard).join('<br>')||`<section class="notice">${t('empty')}<p><button onclick="go('home')">${t('home')}</button></p></section>`}`;};
const productionOrderCard=orderCard;
orderCard=function(order){const html=productionOrderCard(order);return !isOperator()&&typeof order.name==='string'?html.replace(/<\/div>$/,`<button type="button" class="repeat-action" onclick="repeatSelection('${E(order.id)}')">${t('repeatOrder')} →</button></div>`):html;};
function renderConnectionError(){document.getElementById('app').setAttribute('aria-busy','false');document.getElementById('bar').innerHTML='';document.getElementById('app').innerHTML=`<section class="connection-error" role="alert"><h2>${t('connectionTitle')}</h2><p>${E(uiMessage(connectionError.message,connectionError.status))}</p><div class="actions"><button class="primary" onclick="connectShop()">${t('retry')}</button><a href="tel:+16045440046">${t('callStore')} · (604) 544-0046</a></div></section>`;}
async function connectShop(){
 connectionError=null;render();
 try{
  await shopRequest('state');
  if(initialDraft&&Date.now()-initialDraft.at<7*86400000&&Array.isArray(initialDraft.cart)&&!isOperator()){
   cart=db.breads.map((b,i)=>b.active&&Number.isInteger(initialDraft.cart[i])?Math.max(0,Math.min(b.max,initialDraft.cart[i])):0);
   if(/^\d{4}-\d{2}-\d{2}$/.test(initialDraft.date||'')&&dayAllowed(initialDraft.date)){bookingDay=initialDraft.date;chosen=String(initialDraft.chosen||'');if(!slots(bookingDay).some(s=>String(s.start)===chosen&&s.ok))chosen='';}
  }
  initialDraft=null;
  if(new URLSearchParams(location.search).get('setup')==='1'&&window.needsSetup){loginMode='admin';view='account';}
  render();if(window.needsSetup&&new URLSearchParams(location.search).get('setup')==='1')document.getElementById('setup-panel')?.scrollIntoView({block:'start'});
 }catch(error){connectionError={message:error.sourceMessage||error.message,status:error.status};render();}
}
document.getElementById('toast').setAttribute('role','status');document.getElementById('toast').setAttribute('aria-live','polite');
const requestStatus=document.createElement('div');requestStatus.id='request-status';requestStatus.className='sr-only';requestStatus.setAttribute('role','status');requestStatus.setAttribute('aria-live','polite');document.body.append(requestStatus);
render();connectShop();
window.addEventListener('online',()=>{if(!serverReady){connectShop();return;}if(!writePending)shopRequest('state').then(()=>render()).catch(()=>{});});
setInterval(()=>{if(serverReady&&!busy&&!authBusy&&!writePending&&!hasSecretDraft&&!formDrafts.size&&!document.hidden&&!document.querySelector('input:focus,textarea:focus,select:focus'))shopRequest('state').then(()=>render()).catch(()=>{});},30000);
