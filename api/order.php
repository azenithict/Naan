<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function respond(int $status, array $body): void { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error'=>'Method not allowed.']);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>12000) respond(413,['error'=>'Request too large.']);
if(isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN']!=='https://naan.azenith.ca') respond(403,['error'=>'Origin not allowed.']);
$d=json_decode(file_get_contents('php://input',false,null,0,12001),true);
if(!is_array($d)) respond(400,['error'=>'Invalid request. Please refresh the page.']);
function field(array $d,string $name,int $max): string { $v=$d[$name]??'';if(!is_string($v)||strlen($v)>$max) respond(422,['error'=>'Please check your details.']);return trim($v); }
$name=field($d,'name',240);$phone=field($d,'phone',24);$address=field($d,'address',1200);$postal=strtoupper(field($d,'postal',10));$note=field($d,'note',1200);$method=field($d,'method',20);$time=field($d,'time',20);
$times=['next'=>'Next available — please contact me','morning'=>'Morning: 8 am–11 am','afternoon'=>'Afternoon: 12 pm–3 pm','evening'=>'Evening: 4 pm–7 pm'];
$phone=preg_replace('/\D/','',$phone);
if(strlen($name)<2 || !preg_match('/^1?[2-9][0-9]{2}[2-9][0-9]{6}$/D',$phone) || !in_array($method,['pickup','delivery'],true) || !isset($times[$time]) || ($d['consent']??false)!==true) respond(422,['error'=>'Please check your name, North American phone number, time preference and consent.']);
$phone='+1'.substr($phone,-10);
if($method==='delivery' && (strlen($address)<10 || !preg_match('/^[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z][ -]?[0-9][ABCEGHJ-NPRSTV-Z][0-9]$/D',$postal))) respond(422,['error'=>'Please enter your delivery address and a valid Canadian postal code.']);
$catalog=['white'=>['Homestyle White Bread',425],'bran'=>['Homestyle Bran Bread',450]];$items=$d['items']??null;
if(!is_array($items)||count($items)<1||count($items)>2) respond(422,['error'=>'Please choose at least one bread.']);
$lines=[];$seen=[];$subtotalCents=0;
foreach($items as $item){if(!is_array($item))respond(422,['error'=>'Invalid bread selection.']);$id=$item['id']??'';$q=$item['quantity']??0;if(!is_string($id)||!isset($catalog[$id])||isset($seen[$id])||!is_int($q)||$q<1||$q>99)respond(422,['error'=>'Please check your bread quantities.']);$seen[$id]=true;[$label,$unitPrice]=$catalog[$id];$subtotalCents+=$unitPrice*$q;$lines[]=$label.' × '.$q.' @ CAD $'.number_format($unitPrice/100,2).' = CAD $'.number_format($unitPrice*$q/100,2);}
ini_set('session.use_strict_mode','1');session_set_cookie_params(['httponly'=>true,'secure'=>true,'samesite'=>'Strict']);session_start();
if(time()-(int)($_SESSION['last_order']??0)<60)respond(429,['error'=>'Please wait one minute before sending another request.']);
$_SESSION['last_order']=time();$id=strtoupper(bin2hex(random_bytes(5)));
$body="PERSIAN BAANOU SUPERMARKET — NEW BREAD REQUEST\nReference: $id\nUTC: ".gmdate('Y-m-d H:i:s')."\n\nCustomer: $name\nPhone: $phone\nFulfilment requested: $method\nAddress: ".($method==='delivery'?$address:'Not applicable')."\nPostal code: ".($method==='delivery'?$postal:'Not applicable')."\nPreferred time: ".$times[$time]."\nNotes: $note\n\nBREAD SELECTION\n".implode("\n",$lines)."\n\nCurrency: CAD\nBread subtotal: CAD $".number_format($subtotalCents/100,2)."\nApplicable taxes, delivery fee, availability and schedule: to be confirmed with customer.\nNo payment taken. This is an order request, not a confirmed order.\nCustomer consented to sharing details to handle this request.";
$sent=mail('f.heravy@gmail.com','Persian Baanou Supermarket bread request #'.$id,$body,['From'=>'Persian Baanou Supermarket <orders@naan.azenith.ca>','MIME-Version'=>'1.0','Content-Type'=>'text/plain; charset=UTF-8']);
if(!$sent){unset($_SESSION['last_order']);respond(503,['error'=>'Our email service could not accept this request. Please contact Baanou or try again later.']);}
respond(200,['id'=>$id,'currency'=>'CAD','subtotalCents'=>$subtotalCents,'status'=>'accepted']);
