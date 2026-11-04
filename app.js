'use strict';
const breads = [
  {id:'white',name:'White bread',price:425,tag:'No added bran',description:'Soft, golden homestyle flatbread. An everyday favourite.'},
  {id:'bran',name:'Bran bread',price:450,tag:'Brown · With bran',description:'Our brown homestyle flatbread, made with bran.'}
];
const $ = selector => document.querySelector(selector);
const form = $('#order-form');
const cart = {white:0,bran:0};
const cartKey = 'baanou-bread-bag-v1', historyKey = 'bano-canada-requests-v1';
const money = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count = () => cart.white+cart.bran;
const subtotal = () => breads.reduce((sum,b)=>sum+cart[b.id]*b.price,0);
let orders=[],submitting=false,feedbackTimer,pendingSubmission=null,currentReference='';
try {
  const saved=JSON.parse(localStorage.getItem(cartKey)||'{}');
  for(const id of Object.keys(cart)) if(Number.isInteger(saved?.[id])&&saved[id]>=0&&saved[id]<=99) cart[id]=saved[id];
} catch {}
try {
  const saved=JSON.parse(localStorage.getItem(historyKey)||'[]');
  if(Array.isArray(saved)) orders=saved.filter(o=>o&&typeof o.id==='string'&&Array.isArray(o.items)&&typeof o.date==='string');
} catch {}
function saveCart(){try{localStorage.setItem(cartKey,JSON.stringify(cart));}catch{}}
function feedback(message){$('#cart-feedback').textContent=message;$('#cart-feedback').classList.add('visible');clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>$('#cart-feedback').classList.remove('visible'),2400);}
function quantity(b){return `<div class="quantity"><button type="button" data-id="${b.id}" data-change="-1" aria-label="Remove one ${b.name}" ${!cart[b.id]||submitting?'disabled':''}>−</button><input type="number" inputmode="numeric" min="0" max="99" step="1" value="${cart[b.id]}" data-quantity="${b.id}" aria-label="${b.name} quantity" ${submitting?'disabled':''}><button type="button" data-id="${b.id}" data-change="1" aria-label="Add one ${b.name}" ${cart[b.id]>=99||submitting?'disabled':''}>+</button></div>`;}
const breadIcon='<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M12 43c-5-2-5-16-3-25S17 6 25 6s16 5 17 14-2 21-7 23-18 2-23 0Z"/><path d="m17 15 1 2m9-3 1 2m8 3 1 2m-23 4 1 2m10-4 1 2m10 4 1 2m-22 4 1 2m10-3 1 2"/></svg>';
function reorderItems(order){
  if(!order||!Array.isArray(order.items)) return [];
  return order.items.filter(i=>i&&breads.some(b=>b.id===i.id)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=99);
}
function setStep(step,scroll=true){
  if(step===2&&!count()){feedback('Choose at least one bread to continue.');return;}
  $('#order-page').dataset.step=String(step);
  document.body.classList.toggle('details-active',step===2);
  $('#checkout').hidden=step!==2;$('#bag-stage').hidden=step===2;
  $('#page-title').textContent=step===2?'You’re one step away.':'What’s in your bread bag?';
  for(const [selector,num] of [['#bread-step',1],['#details-step',2]]){
    if(step===num) $(selector).setAttribute('aria-current','step');else $(selector).removeAttribute('aria-current');
  }
  if(scroll){
    const mobile=window.matchMedia('(max-width:700px)').matches;
    (mobile?$('.order-toolbar'):step===2?$('.order-panel'):$('#breads')).scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  }
}
function render(){
  const active=document.activeElement;
  const area=active?.closest('#cart-items')?'#cart-items':'#products';
  const focusId=active?.dataset.id,focusChange=active?.dataset.change,focusQuantity=active?.dataset.quantity;
  $('#products').innerHTML=breads.map(b=>`<article class="product ${b.id} ${cart[b.id]?'selected':''}"><div class="product-visual"><div class="bread-symbol">${breadIcon}</div><span class="product-tag">${b.tag}</span></div><h3>${b.name}</h3><p class="product-description">${b.description}</p><strong class="product-price">${money(b.price)}<small>CAD / bread</small></strong><div class="product-controls"><span>${cart[b.id]?cart[b.id]+' in your order':'Choose quantity'}</span>${quantity(b)}</div></article>`).join('');
  $('#cart-items').innerHTML=count()?breads.filter(b=>cart[b.id]).map(b=>`<div class="cart-item"><div class="cart-item-top"><strong>${b.name}<small>× ${cart[b.id]}</small></strong><strong>${money(b.price*cart[b.id])}</strong></div><div class="cart-item-bottom"><span>${money(b.price)} each</span>${quantity(b)}</div></div>`).join(''):'<div class="empty-bag"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 16h28l2 27H8l2-27Zm7 0v-5a7 7 0 0 1 14 0v5"/></svg><strong>Your bread bag is waiting.</strong><p>Add white, bran, or a little of both.</p></div>';
  $('#total').textContent=money(subtotal());$('#checkout-total').textContent=money(subtotal())+' CAD';
  $('#cart-count').textContent=`${count()} ${count()===1?'bread':'breads'}`;
  $('#selection-summary').textContent=breads.filter(b=>cart[b.id]).map(b=>`${cart[b.id]} ${b.name.toLowerCase()}`).join(' + ')+` · ${money(subtotal())} CAD`;
  $('#history-count').textContent=orders.length;
  $('#mobile-count').textContent=`${count()} ${count()===1?'bread':'breads'} · subtotal`;
  $('#mobile-total').innerHTML=`${money(subtotal())} <small>CAD</small>`;
  for(const selector of ['#continue-button','#mobile-continue']){
    $(selector).disabled=!count()||submitting;
    $(selector).innerHTML=count()?'Continue to details <span aria-hidden="true">→</span>':(selector==='#mobile-continue'?'Choose your bread':'Add bread to get started')+' <span aria-hidden="true">→</span>';
  }
  $('#details-step').disabled=!count()||submitting;$('#bread-step').disabled=submitting;$('#edit-bread').disabled=submitting;
  $('#add-both').disabled=submitting||breads.some(b=>cart[b.id]>=99);
  $('#submit-button').disabled=submitting||!count();
  $('#submit-button').innerHTML=submitting?'Sending your request…':`Send order request · ${money(subtotal())} <span aria-hidden="true">→</span>`;
  const lastIndex=orders.findLastIndex(o=>reorderItems(o).length);
  $('#repeat-last').hidden=lastIndex<0;$('#repeat-last').disabled=submitting;
  $('#repeat-last').dataset.order=String(lastIndex);
  if(!count()&&$('#order-page').dataset.step==='2') setStep(1,false);
  if(focusQuantity) document.querySelector(`${area} input[data-quantity="${focusQuantity}"]`)?.focus({preventScroll:true});
  else if(focusId) (document.querySelector(`${area} button[data-id="${focusId}"][data-change="${focusChange}"]:not(:disabled)`)||document.querySelector(`${area} button[data-id="${focusId}"][data-change="1"]:not(:disabled)`))?.focus({preventScroll:true});
}
function updateQuantity(id,value){cart[id]=value;$('#form-error').textContent='';saveCart();render();}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-change]');
  if(!button||submitting||!(button.dataset.id in cart)) return;
  updateQuantity(button.dataset.id,Math.max(0,Math.min(99,cart[button.dataset.id]+Number(button.dataset.change))));
});
document.addEventListener('change',event=>{
  const input=event.target.closest('[data-quantity]');if(!input||submitting)return;
  const value=input.value===''?0:Number(input.value);
  if(!Number.isInteger(value)||value<0||value>99){input.value=cart[input.dataset.quantity];feedback('Choose a whole number from 0 to 99.');return;}
  updateQuantity(input.dataset.quantity,value);
});
document.addEventListener('keydown',event=>{if(event.target.matches('[data-quantity]')&&event.key==='Enter'){event.preventDefault();event.target.blur();}});
$('#add-both').addEventListener('click',()=>{if(submitting||breads.some(b=>cart[b.id]>=99))return;breads.forEach(b=>cart[b.id]++);saveCart();render();feedback('One white + one bran added · $8.75 CAD');});
for(const selector of ['#continue-button','#mobile-continue','#details-step']) $(selector).addEventListener('click',()=>setStep(2));
for(const selector of ['#bread-step','#edit-bread']) $(selector).addEventListener('click',()=>setStep(1));
function restoreOrder(index){
  const items=reorderItems(orders[index]);if(!items.length||submitting)return;
  cart.white=0;cart.bran=0;for(const item of items)cart[item.id]=Math.min(99,cart[item.id]+item.quantity);
  saveCart();render();$('#result-dialog').close();setStep(1);feedback('Previous selection added. Review it before sending.');
}
$('#repeat-last').addEventListener('click',()=>restoreOrder(Number($('#repeat-last').dataset.order)));
function clearErrors(){for(const field of ['name','phone','address','postal','consent']){$('#'+field+'-error').textContent='';form.elements[field].removeAttribute('aria-invalid');form.elements[field].removeAttribute('aria-describedby');}$('#form-error').textContent='';}
form.addEventListener('input',event=>{const name=event.target.name;if(['name','phone','address','postal','consent'].includes(name)){$('#'+name+'-error').textContent='';event.target.removeAttribute('aria-invalid');event.target.removeAttribute('aria-describedby');}});
form.addEventListener('change',event=>{
  if(event.target.name==='method'){
    const delivery=form.elements.method.value==='delivery';$('#address-field').hidden=!delivery;
    form.elements.address.required=delivery;form.elements.postal.required=delivery;
    for(const name of ['address','postal']){$('#'+name+'-error').textContent='';form.elements[name].removeAttribute('aria-invalid');form.elements[name].removeAttribute('aria-describedby');}
  }
});
function normalizePhone(value){const digits=value.replace(/\D/g,'');return /^1?[2-9]\d{2}[2-9]\d{6}$/.test(digits)?'+1'+digits.slice(-10):null;}
const postalPattern=/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
function dialog(html,photo=false){$('#result-dialog').className=photo?'photo-dialog':'';$('#dialog-content').innerHTML=html;if(!$('#result-dialog').open)$('#result-dialog').showModal();}
$('#photo-button').addEventListener('click',()=>dialog('<img src="assets/bread-reference.webp" alt="Traditional rectangular homestyle flatbreads on bakery racks"><p>Reference photo edited to remove its text overlay. Bread appearance may vary.</p>',true));
form.addEventListener('submit',async event=>{
  event.preventDefault();if(submitting)return;clearErrors();
  if(!count()){setStep(1);feedback('Choose your bread first.');return;}
  const data=new FormData(form),name=data.get('name').trim(),phone=normalizePhone(data.get('phone')),delivery=data.get('method')==='delivery',address=data.get('address').trim(),postal=data.get('postal').trim().toUpperCase();
  const errors={};
  if(name.length<2)errors.name='Enter your first and last name.';
  if(!phone)errors.phone='Enter a Canadian or US phone number, with optional +1.';
  if(delivery&&address.length<10)errors.address='Enter your complete delivery address.';
  if(delivery&&!postalPattern.test(postal))errors.postal='Enter a Canadian postal code, such as V3L 3A2.';
  if(!data.get('consent'))errors.consent='Please agree so we can handle your request.';
  if(Object.keys(errors).length){for(const [field,message]of Object.entries(errors)){$('#'+field+'-error').textContent=message;form.elements[field].setAttribute('aria-invalid','true');form.elements[field].setAttribute('aria-describedby',field+'-error');}form.elements[Object.keys(errors)[0]].focus();return;}
  const order={name,phone,method:data.get('method'),address:delivery?address:'',postal:delivery?postal:'',time:data.get('time'),note:data.get('note').trim(),consent:true,items:breads.filter(b=>cart[b.id]).map(b=>({id:b.id,name:b.name,quantity:cart[b.id],unitPriceCents:b.price}))};
  const fingerprint=JSON.stringify(order);
  if(!pendingSubmission||pendingSubmission.fingerprint!==fingerprint)pendingSubmission={fingerprint,token:crypto.randomUUID()};
  const requestToken=pendingSubmission.token;
  submitting=true;render();let result;
  try{
    const response=await fetch('api/order.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...order,requestToken}),signal:AbortSignal.timeout(30000)});
    result=await response.json();
    if(!response.ok)throw Error(result.error||'We couldn’t send your request. Please try again.');
    if(typeof result.id!=='string'||!Number.isInteger(result.subtotalCents))throw Error('Unexpected response. Please call Baanou before retrying.');
  }catch(error){$('#form-error').textContent=error.name==='TimeoutError'||error instanceof TypeError?'We couldn’t confirm the response. You can retry this same request, or call (604) 544-0046.':error.message;return;}
  finally{submitting=false;render();}
  order.id=result.id;order.date=new Date().toISOString();order.subtotalCents=result.subtotalCents;
  if(!orders.some(o=>o.id===order.id))orders.push(order);
  let saved=true;try{localStorage.setItem(historyKey,JSON.stringify(orders));}catch{saved=false;}
  pendingSubmission=null;currentReference=order.id;cart.white=0;cart.bran=0;saveCart();form.reset();form.querySelector('.optional').open=false;
  $('#address-field').hidden=true;form.elements.address.required=false;form.elements.postal.required=false;clearErrors();setStep(1,false);render();
  dialog(`<div class="success-icon">✓</div><h2>You’re all set, ${esc(name.split(/\s+/)[0])}.</h2><p>Your request has been sent to Baanou. We’ll call to confirm availability, timing and the final amount.</p><div class="mini-summary"><strong>${esc(order.id)}</strong><button type="button" id="copy-reference">Copy</button></div><ul>${order.items.map(i=>`<li>${i.quantity} × ${esc(i.name)}</li>`).join('')}</ul><p><strong>${money(order.subtotalCents)} CAD</strong> bread subtotal. No payment taken.${saved?'':' Please keep your reference; your browser could not save history.'}</p><button type="button" class="primary" id="continue-shopping">Done <span aria-hidden="true">✓</span></button>`);
});
$('#history-button').addEventListener('click',()=>dialog(`<h2>My orders</h2><p>Your requests saved on this device.</p>${orders.length?[...orders].map((order,index)=>({order,index})).reverse().map(({order:o,index})=>`<article><h3>${esc(o.id)}</h3><p>${esc(new Date(o.date).toLocaleString('en-CA'))}<br>${o.items.map(i=>`${esc(i.quantity)} × ${esc(i.name)}`).join(' · ')}<br>${Number.isInteger(o.subtotalCents)?money(o.subtotalCents)+' CAD':''}</p>${reorderItems(o).length?`<button type="button" class="reorder" data-reorder="${index}">Order these breads again →</button>`:''}</article>`).join(''):'<p>No requests yet. Your next good meal starts with bread.</p>'}<p>For confirmation or changes, call <a href="tel:+16045440046">(604) 544-0046</a>.</p>`));
$('#result-dialog').addEventListener('click',async event=>{
  if(event.target.closest('.close,#continue-shopping'))$('#result-dialog').close();
  const reorder=event.target.closest('[data-reorder]');if(reorder)restoreOrder(Number(reorder.dataset.reorder));
  const copy=event.target.closest('#copy-reference');if(copy){try{await navigator.clipboard.writeText(currentReference);copy.textContent='Copied';}catch{copy.textContent='Select & copy code';}}
});
$('#year').textContent=new Date().getFullYear();render();
