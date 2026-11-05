'use strict';
// Customer-facing presentation; pricing, permissions and bookings remain in shop.php.
Object.assign(dictionary,{
 shopTitle:['Good bread. A little closer to home.','طعم خانه، با نان بانو.'],
 shopIntro:['Choose your homestyle bread. Pick a baking time. We’ll see you at Baanou.','نان خانگی دلخواهتان را انتخاب کنید، زمان پخت را مشخص کنید و از بانو تحویل بگیرید.'],
 shopKicker:['YOUR NEIGHBOURHOOD PERSIAN SUPERMARKET','فروشگاه ایرانی محلهٔ شما'],
 shopLocation:['New Westminster, BC','نیو وست‌مینستر، بریتیش کلمبیا'],
 shopGuest:['No account needed','بدون نیاز به ساخت حساب'],
 shopPickup:['Pickup at Baanou','تحویل از فروشگاه بانو'],
 shopChoose:['What’s coming to your table?','کدام نان مهمان سفرهٔ شماست؟'],
 shopChooseHelp:['Pick your loaves below. All prices in Canadian dollars.','تعداد نان‌ها را انتخاب کنید. قیمت‌ها به دلار کانادا هستند.'],
 shopEach:['CAD / loaf','دلار / هر نان'],
 shopSelected:['Your bread selection','نان‌های انتخابی شما'],
 shopStart:['Add your bread to get started','برای شروع، نان انتخاب کنید'],
 shopNext:['Choose pickup time','انتخاب زمان تحویل'],
 shopPhotoNote:['Product photos illustrate the bread style. Every loaf is a little different.','تصاویر محصول نمایانگر نوع نان هستند؛ ظاهر هر نان کمی متفاوت است.'],
 shopPhoto:['Traditional bread · shared by Baanou','نان محلی · تصویر ارسالی بانو'],
 shopWhite:['Without added bran','بدون سبوس اضافه'],shopBran:['With bran','سبوس‌دار'],
 shopTimeTitle:['Your bread, on your schedule.','نان شما، در زمان دلخواه شما.'],
 shopTimeHelp:['Choose an available baking time. Your estimated pickup time appears below.','زمان پخت را انتخاب کنید؛ زمان تخمینی تحویل در ادامه نمایش داده می‌شود.'],
 shopToday:['Today','امروز'],shopTomorrow:['Tomorrow','فردا'],
 shopDetails:['One last thing. Your details.','فقط مشخصات شما مانده است.'],
 shopDetailsHelp:['No sign-up required. We’ll use your phone number for this order.','نیازی به ثبت‌نام نیست؛ شماره تلفن شما برای همین سفارش استفاده می‌شود.'],
 shopBack:['Back to bread','بازگشت به انتخاب نان'],
 shopCheck:['Review & place order','بررسی و ثبت سفارش'],
 shopPaymentNote:['No online charge. Pay using the method selected below.','پرداخت آنلاین انجام نمی‌شود؛ روش پرداخت را در ادامه انتخاب کنید.'],
 shopEmpty:['Bread is not available to order right now. Please call the store.','در حال حاضر امکان سفارش نان نیست؛ با فروشگاه تماس بگیرید.'],
 shopNotice:['Order online · Pick up at Persian Baanou Supermarket','سفارش آنلاین · تحویل از فروشگاه ایرانی بانو']
});
function shopNumber(value){return new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-CA').format(value);}
function usesReferencePhoto(bread,index){return index<2&&bread.image===DEFAULT_PHOTOS[index];}
function shopPhoto(bread,index){return usesReferencePhoto(bread,index)?`assets/prototype/${index?'bran':'white'}-homestyle-v13.webp`:bread.image;}
function shopRepeat(){
 if(isOperator())return '';
 const order=db.orders.filter(o=>typeof o.name==='string'&&o.items.some(i=>i.qty)).slice().sort((a,b)=>b.created.localeCompare(a.created))[0];
 return order?`<section class="returning-order row"><div><strong>${t('welcomeBack')}</strong><p class="small muted">${t('repeatHelp')}</p></div><button type="button" onclick="repeatSelection('${E(order.id)}')">${t('repeatOrder')} <span aria-hidden="true">↗</span></button></section>`:'';
}
home=function(){
 if(walkin)return productionHome();
 document.getElementById('bar').innerHTML=`<div class="bar shop-order-bar"><div class="shop-bar-inner"><div class="bar-copy"><span>${count()?shopNumber(count())+' '+t('loaves'):t('shopStart')}</span><strong>${money(total())} <small>CAD</small></strong></div><button class="primary bar-next" ${count()?'':'disabled'} onclick="go('schedule')">${t('shopNext')} <span aria-hidden="true">${lang==='fa'?'←':'→'}</span></button></div></div>`;
 const active=db.breads.map((b,i)=>({b,i})).filter(({b})=>b.active);
 return `<section class="shop-hero"><div class="hero-copy"><p class="shop-kicker">${t('shopKicker')}</p><h1>${t('shopTitle')}</h1><p class="hero-description">${t('shopIntro')}</p><div class="shop-facts"><span>${t('shopLocation')}</span><span>${t('shopGuest')}</span></div></div><div class="hero-photo"><img src="assets/prototype/bakery-bread.webp" alt="${lang==='fa'?'نان‌های محلی فروشگاه بانو':'Traditional bread shared by Baanou'}" width="700" height="500" fetchpriority="high" decoding="async"><div class="hero-note">${t('shopPhoto')}</div></div></section>${shopRepeat()}<section aria-labelledby="bread-heading"><div class="shop-products-head"><div><p class="shop-kicker">${t('bread')} / BAANOU</p><h2 id="bread-heading">${t('shopChoose')}</h2></div><p>${t('shopChooseHelp')}</p></div><div class="grid bread-grid">${active.map(({b,i})=>`<article class="card bread-card ${cart[i]?'has-quantity':''}"><div class="art bread-image ${usesReferencePhoto(b,i)?'reference-product-photo':''}"><img src="${E(shopPhoto(b,i))}" alt="${E(b[lang])}" width="400" height="400" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div hidden class="image-fallback">${t('bread')}</div></div><div class="bread-info"><span class="bread-tag">${i===0?t('shopWhite'):i===1?t('shopBran'):t('bread')}</span><h3>${E(b[lang])}</h3><p>${E(b[lang==='fa'?'descriptionFa':'descriptionEn'])}</p><div class="bread-buy-row"><div class="bread-price"><strong>${money(b.price)}</strong><small>${t('shopEach')}</small></div><div class="qty bread-picker"><button type="button" ${cart[i]?'':'disabled'} onclick="qty(${i},-1)">−</button><b aria-label="${E(t('loaves'))}">${shopNumber(cart[i])}</b><button type="button" ${cart[i]<b.max?'':'disabled'} onclick="qty(${i},1)">+</button></div></div></div></article>`).join('')}</div>${!active.length?`<div class="shop-empty"><p>${t('shopEmpty')}</p><a href="tel:${E(db.settings.phone.replace(/[^+0-9]/g,''))}">${E(db.settings.phone)}</a></div>`:''}${active.some(({b,i})=>b.image===DEFAULT_PHOTOS[i]&&i<2)?`<p class="shop-photo-caption">${t('shopPhotoNote')}</p>`:''}</section>`;
};
function shopDay(date){return new Intl.DateTimeFormat(lang==='fa'?'fa-IR':'en-CA',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
function selectShopDay(date){bookingDay=date;chosen='';render();}
schedule=function(){
 const list=slots(bookingDay),pick=list.find(s=>String(s.start)===chosen),today=now().date;
 return `${progress(2)}<div class="shop-step-heading"><p class="shop-kicker">${t('shopPickup')}</p><h1>${t('shopTimeTitle')}</h1><p>${t('shopTimeHelp')}</p></div><div class="split shop-schedule-layout"><section class="card pad shop-time-card"><div class="shop-date-choices">${[0,1,2].map(n=>{const date=addDays(today,n);return `<button class="${bookingDay===date?'selected':''}" aria-pressed="${bookingDay===date}" ${dayAllowed(date)?'':'disabled'} onclick="selectShopDay('${date}')">${n<2?t(n?'shopTomorrow':'shopToday'):shopDay(date)}</button>`;}).join('')}</div><label for="shop-date">${t('date')}</label><input id="shop-date" type="date" value="${bookingDay}" min="${today}" max="${addDays(today,db.settings.horizon)}" onchange="selectShopDay(this.value)">${!dayAllowed(bookingDay)?`<p class="error">${t('closed')}</p>`:''}${db.settings.sessions.map((session,i)=>`<h3>${i===0?t('morning'):i===1?t('evening'):i+1} <small><bdi>${session.start}–${session.end}</bdi></small></h3><div class="slots">${list.filter(s=>s.session===i).map(s=>`<button class="slot ${chosen===String(s.start)?'selected':''}" aria-pressed="${chosen===String(s.start)}" ${s.ok?'':'disabled'} onclick="chosen='${s.start}';render()"><b>${clock(s.start)}</b><small>${t(s.state)} · ${shopNumber(s.left)} ${t('remaining')}</small></button>`).join('')}</div>`).join('')}${!list.some(s=>s.ok)?`<p class="error" role="status">${t('noSlots')}</p>`:''}<details class="shop-notes"><summary>${t('notes')}</summary><label class="sr-only" for="shop-notes">${t('notes')}</label><textarea id="shop-notes" maxlength="200" oninput="notes=this.value">${E(notes)}</textarea></details></section><aside class="card pad shop-basket"><p class="shop-kicker">${t('purchaseSummary')}</p><h2>${shopNumber(count())} ${t('loaves')}</h2>${summary()}<div class="notice" role="status">${pick?.ok?`${t('pickup')}<br><strong>${shopDay(bookingDay)} · <bdi>${clock(pick.end)}</bdi></strong>`:t('shopTimeHelp')}</div><p class="small muted">${E(db.settings.address)}</p></aside></div><div class="actions shop-schedule-actions"><button onclick="go('home')">${t('shopBack')}</button><button class="primary" ${pick?.ok?'':'disabled'} onclick="go('checkout')">${t('shopCheck')} <span aria-hidden="true">${lang==='fa'?'←':'→'}</span></button></div>`;
};
const shopOriginalCheckout=checkoutPage;
checkoutPage=function(){return shopOriginalCheckout().replace(`<h2>${t('checkout')}</h2>`,`<div class="shop-step-heading"><p class="shop-kicker">${t('checkout')}</p><h1>${t('shopDetails')}</h1><p>${t('shopDetailsHelp')}</p></div>`);};
const shopOriginalRender=render;
render=function(){
 const publicView=!(view==='admin'&&isOperator());
 document.body.classList.toggle('storefront',publicView);document.body.dataset.view=view;
 shopOriginalRender();
 if(!publicView)return;
 const name=lang==='fa'?'بانو':'baanou';
 const account=sessionAccount();
 document.getElementById('brand').innerHTML=`<span class="brandmark"><img src="${E(brandImage(db.settings.logo||BRAND_LOGO))}" alt="" width="44" height="44"></span><span><b class="shop-wordmark">${name}<span aria-hidden="true">.</span></b><small class="${account?'identity-name':''}">${account?'● '+E(account.username):E(db.settings.name)}</small></span>`;
 document.getElementById('demo').textContent=t('shopNotice');
 for(const button of document.querySelectorAll('.bread-picker button')){const match=button.getAttribute('onclick')?.match(/qty\((\d+),(-?1)\)/);if(match)button.setAttribute('aria-label',t(Number(match[2])>0?'addOne':'removeOne')+' '+db.breads[Number(match[1])][lang]);}
 for(const img of document.querySelectorAll('.bread-image img')){const reference=img.parentElement.classList.contains('reference-product-photo');img.width=reference?640:400;img.height=reference?960:400;img.loading='eager';}
};
render();
