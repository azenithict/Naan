<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function respond(int $status, array $body): void { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error'=>'روش درخواست مجاز نیست.']);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 12000) respond(413, ['error'=>'درخواست بیش از اندازه بزرگ است.']);
if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== 'https://naan.azenith.ca') respond(403, ['error'=>'مبدأ درخواست مجاز نیست.']);
$d = json_decode(file_get_contents('php://input', false, null, 0, 12001), true);
if (!is_array($d)) respond(400, ['error'=>'اطلاعات سفارش نامعتبر است.']);
function field(array $d, string $name, int $max): string { $v = $d[$name] ?? ''; if (!is_string($v) || strlen($v)>$max) respond(422,['error'=>'اطلاعات واردشده نامعتبر است.']); return trim($v); }
$name=field($d,'name',240); $phone=field($d,'phone',20); $address=field($d,'address',1200); $note=field($d,'note',1200); $method=field($d,'method',20); $time=field($d,'time',120);
$times=['اولین نوبت پخت آماده','صبح · ۷ تا ۹','ظهر · ۱۱ تا ۱۳','عصر · ۱۶ تا ۱۸'];
if(strlen($name)<3 || !preg_match('/^09[0-9]{9}$/D',$phone) || !in_array($method,['pickup','delivery'],true) || !in_array($time,$times,true) || ($method==='delivery' && strlen($address)<10)) respond(422,['error'=>'نام، شماره موبایل، آدرس و زمان دریافت را بررسی کنید.']);
$catalog=['sangak'=>['سنگک',15000], 'barbari'=>['بربری',12000], 'taftoon'=>['تافتون',8000]];
$items=$d['items']??null;
if(!is_array($items) || count($items)<1 || count($items)>3) respond(422,['error'=>'سبد خرید نامعتبر است.']);
$total=0; $lines=[]; $seen=[];
foreach($items as $item) {
 if(!is_array($item)) respond(422,['error'=>'نان نامعتبر است.']);
 $id=$item['id']??''; $q=$item['quantity']??0;
 if(!is_string($id) || !isset($catalog[$id]) || isset($seen[$id]) || !is_int($q) || $q<1 || $q>99) respond(422,['error'=>'تعداد نان نامعتبر است.']);
 $seen[$id]=true; [$label,$price]=$catalog[$id]; $total+=$price*$q; $lines[]="$label × $q = ".number_format($price*$q).' تومان';
}
$shipping=$method==='delivery'?30000:0; $total+=$shipping;
// Session rate limiting avoids persistent customer records in the public web root.
ini_set('session.use_strict_mode','1');
session_set_cookie_params(['httponly'=>true,'secure'=>true,'samesite'=>'Strict']);
session_start();
if(time()-(int)($_SESSION['last_order']??0)<60) respond(429,['error'=>'برای سفارش بعدی یک دقیقه صبر کنید.']);
$_SESSION['last_order']=time();
$id=strtoupper(bin2hex(random_bytes(5)));
$body="سفارش جدید نانوایی بانو\nشماره سفارش: $id\nزمان UTC: ".gmdate('Y-m-d H:i:s')."\n\nنام: $name\nموبایل: $phone\nروش دریافت: ".($method==='delivery'?'ارسال':'حضوری')."\nآدرس: $address\nزمان دریافت: $time\nیادداشت: $note\n\n".implode("\n",$lines)."\nهزینه ارسال: ".number_format($shipping)." تومان\nجمع کل: ".number_format($total).' تومان';
$headers=['From'=>'Bano Bakery <orders@naan.azenith.ca>','MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8'];
$sent=mail('f.heravy@gmail.com','Bano bakery order #'.$id,$body,$headers);
if(!$sent) { unset($_SESSION['last_order']); respond(503,['error'=>'سرور ایمیل سفارش را نپذیرفت. لطفاً بعداً دوباره تلاش کنید.']); }
respond(200,['id'=>$id,'total'=>$total,'status'=>'accepted']);
