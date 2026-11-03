'use strict';
const breads = [
  {id:'sangak',name:'سنگک',price:15000,description:'برشته و خوش‌عطر، با دانه‌های کنجد',badge:'محبوب سفره‌ها',art:'sangak'},
  {id:'barbari',name:'بربری',price:12000,description:'پوسته ترد و دل نرم، همراه صبحانه',badge:'تازه از تنور',art:'barbari'},
  {id:'taftoon',name:'تافتون',price:8000,description:'نازک و سبک، برای هر وعده',badge:'سبک و لطیف',art:'taftoon'}
];
const fa = n => new Intl.NumberFormat('fa-IR').format(n);
const money = n => `${fa(n)} تومان`;
const $ = s => document.querySelector(s);
const key = 'bano-orders-v1';
let orders = [];
let storageAvailable = true;
try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); orders = Array.isArray(saved) ? saved.filter(o => o && typeof o.id === 'string' && Array.isArray(o.items) && Number.isFinite(o.total)) : []; } catch { storageAvailable = false; }
const cart = Object.fromEntries(breads.map(b => [b.id,0]));
const form = $('#order-form');
function quantity(b) { return `<div class="quantity"><button type="button" data-id="${b.id}" data-change="1" aria-label="افزودن ${b.name}" ${cart[b.id] >= 99 ? 'disabled' : ''}>+</button><span>${fa(cart[b.id])}</span><button type="button" data-id="${b.id}" data-change="-1" aria-label="کم کردن ${b.name}" ${cart[b.id] === 0 ? 'disabled' : ''}>−</button></div>`; }
function subtotal() { return breads.reduce((sum,b) => sum + b.price*cart[b.id],0); }
function shipping() { return form.elements.method.value === 'delivery' && subtotal() > 0 ? 30000 : 0; }
function render() {
 const focused = document.activeElement;
 const focusId = focused?.dataset.id, focusChange = focused?.dataset.change;
 const focusInCart = focused?.closest('#cart-items');
 $('#products').innerHTML = breads.map(b => `<article class="product"><div class="product-art ${b.art}" aria-hidden="true"><div class="bread"><i></i></div><span class="badge">${b.badge}</span></div><div class="product-body"><div class="product-title"><h3>نان ${b.name}</h3></div><p>${b.description}</p><div class="product-bottom"><span class="price">${fa(b.price)} <small>تومان</small></span>${quantity(b)}</div></div></article>`).join('');
 const selected = breads.filter(b => cart[b.id]);
 $('#cart-items').innerHTML = selected.length ? selected.map(b => `<div class="cart-item"><div><strong>نان ${b.name}</strong><small>${money(b.price*cart[b.id])}</small></div>${quantity(b)}</div>`).join('') : '<p class="empty">سبدت هنوز خالی است.<br>از نان‌های بالا انتخاب کن.</p>';
 $('#cart-count').textContent = `${fa(Object.values(cart).reduce((a,b)=>a+b,0))} عدد`;
 $('#subtotal').textContent = money(subtotal());
 $('#shipping').textContent = shipping() ? money(shipping()) : 'رایگان';
 $('#total').textContent = money(subtotal()+shipping());
 $('#history-count').textContent = fa(orders.length);
 if(focusId) (document.querySelector(`${focusInCart ? '#cart-items' : '#products'} button[data-id="${focusId}"][data-change="${focusChange}"]:not(:disabled)`) || document.querySelector(`#products button[data-id="${focusId}"][data-change="1"]`))?.focus({preventScroll:true});
}
document.addEventListener('click',e => {
 const button = e.target.closest('button[data-change]');
 if(!button) return;
 const id = button.dataset.id;
 if(!(id in cart)) return;
 cart[id] = Math.max(0,Math.min(99,cart[id]+Number(button.dataset.change)));
 $('#form-error').textContent = '';
 render();
});
form.addEventListener('change',e => { if(e.target.name === 'method') { const delivery = form.elements.method.value === 'delivery'; $('#address-field').hidden = !delivery; form.elements.address.required = delivery; render(); } });
function digits(value) { return value.replace(/[۰-۹]/g,c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showDialog(html) { $('#dialog-content').innerHTML = html; if(!$('#result-dialog').open) $('#result-dialog').showModal(); }
form.addEventListener('submit',e => {
 e.preventDefault();
 const data = new FormData(form);
 const name = data.get('name').trim();
 const phone = digits(data.get('phone')).replace(/[\s-]/g,'');
 const address = data.get('address').trim();
 const error = !subtotal() ? 'لطفاً حداقل یک نان انتخاب کن.' : name.length < 2 ? 'لطفاً نام خود را وارد کن.' : !/^09\d{9}$/.test(phone) ? 'شماره موبایل معتبر با ۰۹ و ۱۱ رقم وارد کن.' : data.get('method') === 'delivery' && address.length < 10 ? 'لطفاً آدرس کامل تحویل را بنویس.' : '';
 if(error) { $('#form-error').textContent = error; return; }
 const order = {id:crypto.randomUUID(),date:new Date().toISOString(),name,phone,method:data.get('method'),address:data.get('method') === 'delivery' ? address : '',time:data.get('time'),note:data.get('note').trim(),items:breads.filter(b=>cart[b.id]).map(b=>({name:b.name,quantity:cart[b.id],price:b.price})),total:subtotal()+shipping()};
 try { if(!storageAvailable) throw new Error('storage unavailable'); localStorage.setItem(key,JSON.stringify([...orders,order])); } catch { $('#form-error').textContent = 'ذخیره سفارش در مرورگر ممکن نیست. فضای ذخیره‌سازی یا تنظیمات مرورگر را بررسی کن؛ سفارش ثبت نشد.'; return; }
 orders.push(order);
 for(const id of Object.keys(cart)) cart[id] = 0;
 form.reset(); $('#address-field').hidden = true; form.elements.address.required = false; $('#form-error').textContent = ''; render();
 showDialog(`<div class="success-icon">✓</div><h2>سفارشت ذخیره شد!</h2><p>${escapeHtml(name)} عزیز، سفارش نمایشی شما با شماره <b dir="ltr">${order.id.slice(0,8).toUpperCase()}</b> در این مرورگر ثبت شد.</p><ul>${order.items.map(i=>`<li>${escapeHtml(i.name)} × ${fa(i.quantity)}</li>`).join('')}</ul><p>مبلغ کل: <strong>${money(order.total)}</strong><br>روش دریافت: ${order.method === 'delivery' ? 'ارسال به آدرس' : 'تحویل حضوری'}<br>زمان: ${escapeHtml(order.time)}</p><p class="local-note">سفارش به نانوایی ارسال نشده و مبلغی پرداخت نشده است.</p><button class="primary" id="continue-shopping">بازگشت به نان‌ها ←</button>`);
});
$('#history-button').addEventListener('click',()=>showDialog(`<h2>سفارش‌های من</h2>${orders.length ? [...orders].reverse().map(o=>`<article><h3>سفارش <span dir="ltr">${escapeHtml(o.id.slice(0,8).toUpperCase())}</span></h3><p>${escapeHtml(new Date(o.date).toLocaleString('fa-IR'))}</p><ul>${o.items.map(i=>`<li>${escapeHtml(i.name)} × ${fa(i.quantity)}</li>`).join('')}</ul><p>${money(o.total)} · ${o.method === 'delivery' ? 'ارسال' : 'تحویل حضوری'}<br>${escapeHtml(o.time)}</p></article>`).join('') : '<p class="empty">هنوز سفارشی در این مرورگر ثبت نکرده‌ای.</p>'}<p class="local-note">این فهرست فقط شامل سفارش‌های نمایشی همین مرورگر است.</p>`));
$('#result-dialog').addEventListener('click',e=>{ if(e.target.closest('.close') || e.target.closest('#continue-shopping')) $('#result-dialog').close(); });
render();
