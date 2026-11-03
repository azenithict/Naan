<?php
declare(strict_types=1);
require __DIR__ . '/../api/order-email.php';
function check(bool $condition, string $message): void { if (!$condition) { throw new RuntimeException($message); } }
$id=order_reference('Aziz Rahman Heravy','+17789343434');
check((bool)preg_match('/^AH-3434-[A-F0-9]{8}$/D',$id),'First and last initials + phone suffix');
check(order_reference('Aziz Rahman Heravy','+17789343434')!==$id,'Repeat requests have distinct suffixes');
check((bool)preg_match('/^ÉO-0123-/',order_reference('Éva O’Neill','+16045550123')),'Unicode initials');
check((bool)preg_match('/^AX-0123-/',order_reference('Alex','+16045550123')),'Single-name fallback');
$o=['id'=>$id,'name'=>'Aziz <script>alert(1)</script> Heravy','phone'=>'+17789343434','method'=>'delivery','address'=>'123 Main St <b>unit</b>','postal'=>'V3L 3A2','time'=>'Morning: 8 am–11 am','note'=>"No sesame <img src=x onerror=alert(1)>\nPlease call",'items'=>[['name'=>'Homestyle White Bread','quantity'=>2,'unitPriceCents'=>425],['name'=>'Homestyle Bran Bread','quantity'=>1,'unitPriceCents'=>450]],'subtotalCents'=>1300,'createdAt'=>new DateTimeImmutable('2026-11-03 23:46:02',new DateTimeZone('UTC'))];
$email=order_email($o);
check(strpos($email['html'],'$13.00 CAD')!==false,'Accurate subtotal');
check(strpos($email['html'],'3:46 pm PST')!==false,'Vancouver timezone');
check(strpos($email['html'],'<script>')===false && strpos($email['html'],'<img src=x')===false,'HTML escapes customer input');
check(strpos($email['html'],'&lt;script&gt;')!==false,'Customer content preserved as text');
check(strpos($email['html'],'Delivery requested')!==false,'Delivery label');
check(strpos($email['text'],'123 Main St')!==false,'Plain-text address');
foreach(explode("\r\n ",$email['subject']) as $word){check(strlen($word)<=75,'RFC 2047 subject word length');}
check(strpos($email['headers']['Content-Type'],'multipart/alternative')===0,'Multipart email');
check(substr_count($email['body'],'Content-Transfer-Encoding: base64')===2,'Two safely encoded parts');
check(strpos($email['body'],base64_encode($email['html']))===false,'MIME base64 is line wrapped');
preg_match('/boundary="([^"]+)"/',$email['headers']['Content-Type'],$match);
$parts=explode('--'.$match[1],$email['body']);
check(count($parts)===4,'MIME boundaries');
foreach([1=>'text',2=>'html'] as $n=>$type){$part=explode("\r\n\r\n",$parts[$n],2);check(base64_decode(trim($part[1]),true)===$email[$type],'Round-trip '.$type);}
$o['method']='pickup';$o['note']='';$pickup=order_email($o);
check(strpos($pickup['html'],'220 6th St')!==false,'Pickup location');
check(strpos($pickup['html'],'No additional notes.')!==false,'Empty note fallback');
file_put_contents(sys_get_temp_dir().'/baanou-email-preview.html',$email['html']);
echo "PASS: readable references, repeat suffix, Unicode, HTML escaping, CAD totals, Vancouver time, delivery/pickup, multipart round-trip. No email sent.\n";
