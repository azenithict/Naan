'use strict';
const breads=[{id:'white',name:'White bread',price:425,detail:'Without added bran'},{id:'bran',name:'Bran bread',price:450,detail:'Brown · With bran'}];
const $=s=>document.querySelector(s),form=$('#order-form');
const money=cents=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cart={white:0,bran:0},cartKey='baanou-bread-bag-v1',historyKey='bano-canada-requests-v1';
let orders=[],submitting=false,feedbackTimer;
try{const saved=JSON.parse(localStorage.getItem(cartKey)||'{}');for(const id of Object.keys(cart))if(Number.isInteger(saved?.[id])&&saved[id]>=0&&saved[id]<=99)cart[id]=saved[id];}catch{}
try{const saved=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(saved))orders=saved.filter(o=>o&&typeof o.id==='string'&&Array.isArray(o.items)&&typeof o.date==='string');}catch{}
const count=()=>cart.white+cart.bran,subtotal=()=>breads.reduce((sum,b)=>sum+cart[b.id]*b.price,0);
function saveCart(){try{localStorage.setItem(cartKey,JSON.stringify(cart));}catch{}}
function feedback(message){$('#cart-feedback').textContent=message;$('#cart-feedback').classList.add('visible');clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>$('#cart-feedback').classList.remove('visible'),2200);}
function render(){
 const active=document.activeElement,id=active?.dataset.id,change=active?.dataset.change;
 $('#products').innerHTML=breads.map(b=>`<article class="product ${b.id} ${cart[b.id]?'selected':''}"><div class="product-top"><div class="product-name"><span class="bread-dot" aria-hidden="true"></span><div><h3>${b.name}</h3><small>${b.detail}</small></div></div><strong class="product-price">${money(b.price)}</strong></div><div class="product-controls"><small>${cart[b.id]?cart[b.id]+' × '+money(b.price)+' = '+money(cart[b.id]*b.price):'Choose your quantity'}</small><div class="quantity"><button type="button" data-id="${b.id}" data-change="-1" aria-label="Remove one ${b.name}" ${!cart[b.id]||submitting?'disabled':''}>−</button><span aria-label="${b.name} quantity">${cart[b.id]}</span><button type="button" data-id="${b.id}" data-change="1" aria-label="Add one ${b.name}" ${cart[b.id]>=99||submitting?'disabled':''}>+</button></div></div></article>`).join('');
 $('#total').innerHTML=`${money(subtotal())} <small>CAD</small>`;
 $('#cart-count').textContent=`${count()} ${count()===1?'bread':'breads'}`;
 $('#selection-summary').textContent=count()?breads.filter(b=>cart[b.id]).map(b=>`${cart[b.id]} ${b.name.toLowerCase()}`).join(' + ')+` · ${money(subtotal())} CAD`:'Choose your bread to get started.';
 $('#history-count').textContent=orders.length;
 $('#continue-button').disabled=!count()||submitting;
 $('#continue-button').innerHTML=count()?`Continue · ${money(subtotal())} CAD <span aria-hidden="true">→</span>`:'Choose bread to continue <span aria-hidden="true">→</span>';
 $('#details-step').disabled=!count()||submitting;
 $('#bread-step').disabled=submitting;$('#edit-bread').disabled=submitting;
 $('#add-both').disabled=submitting||breads.some(b=>cart[b.id]>=99);
 $('#submit-button').disabled=submitting||!count();
 $('#submit-button').innerHTML=submitting?'Sending your request…':`Send order request${count()?' · '+money(subtotal()):''} <span aria-hidden="true">→</span>`;
 if(id)document.querySelector(`button[data-id="${id}"][data-change="${change}"]:not(:disabled)`)?.focus({preventScroll:true});
}
function showStep(step){if(step===2&&!count()){feedback('Please choose at least one bread.');return;}$('#order-page').dataset.step=String(step);for(const [selector,num]of [['#bread-step',1],['#details-step',2]]){if(step===num)$(selector).setAttribute('aria-current','step');else $(selector).removeAttribute('aria-current');}if(window.matchMedia('(max-width:700px)').matches)$('#order-page').scrollIntoView({block:'start',behavior:'smooth'});else if(step===1)$('#breads').scrollIntoView({block:'center',behavior:'smooth'});}
$('#continue-button').addEventListener('click',()=>showStep(2));$('#details-step').addEventListener('click',()=>showStep(2));$('#bread-step').addEventListener('click',()=>showStep(1));$('#edit-bread').addEventListener('click',()=>showStep(1));
document.addEventListener('click',e=>{const button=e.target.closest('[data-change]');if(!button||submitting||!(button.dataset.id in cart))return;cart[button.dataset.id]=Math.max(0,Math.min(99,cart[button.dataset.id]+Number(button.dataset.change)));$('#form-error').textContent='';saveCart();render();});
$('#add-both').addEventListener('click',()=>{if(submitting||breads.some(b=>cart[b.id]>=99))return;breads.forEach(b=>cart[b.id]++);saveCart();render();feedback('Added one white + one bran bread.');});
form.addEventListener('change',e=>{if(e.target.name!=='method')return;const delivery=form.elements.method.value==='delivery';$('#address-field').hidden=!delivery;form.elements.address.required=delivery;form.elements.postal.required=delivery;});
function normalizePhone(value){const digits=value.replace(/\D/g,'');return /^1?[2-9]\d{2}[2-9]\d{6}$/.test(digits)?'+1'+digits.slice(-10):null;}
const postalPattern=/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
function dialog(html,photo=false){$('#result-dialog').className=photo?'photo-dialog':'';$('#dialog-content').innerHTML=html;if(!$('#result-dialog').open)$('#result-dialog').showModal();}
$('#photo-button').addEventListener('click',()=>dialog('<img src="assets/bread-reference.webp" alt="Traditional golden flatbreads displayed on bakery racks"><p>Bread reference photo, edited to remove the text overlay. Appearance may vary.</p>',true));
form.addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;
 const data=new FormData(form),name=data.get('name').trim(),phone=normalizePhone(data.get('phone')),delivery=data.get('method')==='delivery',address=data.get('address').trim(),postal=data.get('postal').trim().toUpperCase();
 const error=!count()?'Please choose at least one bread.':name.length<2?'Please enter your full name.':!phone?'Enter a valid Canadian or US phone number, with optional +1.':delivery&&address.length<10?'Please enter your complete delivery address.':delivery&&!postalPattern.test(postal)?'Enter a valid Canadian postal code, such as V3L 3A2.':!data.get('consent')?'Please agree to share your details for this order.':'';
 if(error){$('#form-error').textContent=error;if(!count())showStep(1);return;}
 const order={date:new Date().toISOString(),name,phone,method:data.get('method'),address:delivery?address:'',postal:delivery?postal:'',time:data.get('time'),note:data.get('note').trim(),consent:true,items:breads.filter(b=>cart[b.id]).map(b=>({id:b.id,name:b.name,quantity:cart[b.id],unitPriceCents:b.price}))};
 submitting=true;render();let result;
 try{const response=await fetch('api/order.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(order),signal:AbortSignal.timeout(30000)});result=await response.json();if(!response.ok)throw Error(result.error||'Your request could not be sent. Please try again.');if(typeof result.id!=='string'||!Number.isInteger(result.subtotalCents))throw Error('Unexpected response. Please call Baanou before retrying.');}
 catch(error){$('#form-error').textContent=error.name==='TimeoutError'||error instanceof TypeError?'We could not confirm the response. Your request may have been sent. Please call (604) 544-0046 before retrying.':error.message;return;}
 finally{submitting=false;render();}
 order.id=result.id;order.subtotalCents=result.subtotalCents;orders.push(order);let saved=true;try{localStorage.setItem(historyKey,JSON.stringify(orders));}catch{saved=false;}
 Object.keys(cart).forEach(id=>cart[id]=0);saveCart();form.reset();form.querySelector('.optional').open=false;$('#address-field').hidden=true;form.elements.address.required=false;form.elements.postal.required=false;$('#form-error').textContent='';$('#order-page').dataset.step='1';$('#bread-step').setAttribute('aria-current','step');$('#details-step').removeAttribute('aria-current');render();
 dialog(`<div class="success-icon">✓</div><h2>Thanks, ${esc(name.split(/\s+/)[0])}!</h2><p>Your bread request has been sent for confirmation.</p><p><strong>${esc(order.id)}</strong></p><ul>${order.items.map(i=>`<li>${i.quantity} × ${esc(i.name)}</li>`).join('')}</ul><p><strong>${money(order.subtotalCents)} CAD</strong> bread subtotal.</p><p>We’ll confirm availability, timing and any extra charges by phone. No payment taken.${saved?'':' Keep your reference; browser history could not be saved.'}</p><button type="button" class="primary" id="continue-shopping">Done <span aria-hidden="true">✓</span></button>`);
});
$('#history-button').addEventListener('click',()=>dialog(`<h2>My requests</h2>${orders.length?[...orders].reverse().map(o=>`<article><h3>${esc(o.id)}</h3><p>${esc(new Date(o.date).toLocaleString('en-CA'))}<br>${o.items.map(i=>`${esc(i.quantity)} × ${esc(i.name)}`).join(' · ')}<br>${Number.isInteger(o.subtotalCents)?money(o.subtotalCents)+' CAD':''}</p></article>`).join(''):'<p>No requests saved on this device yet.</p>'}<p>Saved on this device only. For order updates, call <a href="tel:+16045440046">(604) 544-0046</a>.</p>`));
$('#result-dialog').addEventListener('click',e=>{if(e.target.closest('.close,#continue-shopping'))$('#result-dialog').close();});$('#year').textContent=new Date().getFullYear();render();
