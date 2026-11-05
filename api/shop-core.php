<?php
declare(strict_types=1);
require_once __DIR__.'/order-email.php';
function shop_fail(string $message,int $status=422): void {throw new ShopError($message,$status);}
class ShopError extends RuntimeException {}
function shop_now(): DateTimeImmutable {return new DateTimeImmutable('now',new DateTimeZone('America/Vancouver'));}
function shop_cents($n): int {if(!is_numeric($n)||!is_finite((float)$n))shop_fail('Invalid amount.');return (int)round((float)$n*100);}
function shop_phone(string $s): string {$s=strtr($s,array_combine(preg_split('//u','۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',-1,PREG_SPLIT_NO_EMPTY),str_split('01234567890123456789')));$s=preg_replace('/\D/','',$s);if(!preg_match('/^1?[2-9][0-9]{2}[2-9][0-9]{6}$/D',$s))shop_fail('Enter a valid Canadian phone number.');if(!in_array(substr($s,-10,3),['204','226','236','249','250','257','263','273','289','306','343','354','365','367','368','382','403','416','418','428','431','437','438','450','468','474','506','514','519','548','579','581','584','587','600','604','613','622','633','639','647','672','683','705','709','742','753','778','780','782','807','819','825','867','873','879','902','905','942'],true))shop_fail('Enter a Canadian phone number.');return '+1'.substr($s,-10);}
function shop_text(array $p,string $key,int $max=240,bool $required=false): string {$v=$p[$key]??'';if(!is_string($v)||strlen($v)>$max||($required&&strlen(trim($v))<2))shop_fail('Check '.$key.'.');return trim($v);}
function shop_minutes(string $s): int {if(!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$s))shop_fail('Invalid time.');return (int)substr($s,0,2)*60+(int)substr($s,3,2);}
function shop_clock(int $m): string {return sprintf('%02d:%02d',intdiv($m,60),$m%60);}
function shop_seed(): array {$d=json_decode(file_get_contents(__DIR__.'/seed.json'),true,512,JSON_THROW_ON_ERROR);$d['topups']=[];$d['requests']=[];$d['attempts']=[];$d['financeStartedAt']=gmdate('c');return $d;}
function shop_actor(array $d,array &$session): ?array {foreach($d['auth'] as $a)if($a['id']===($session['account']??'')&&$a['version']===($session['version']??0))return $a;unset($session['account'],$session['version']);return null;}
function shop_require(array $d,array &$session,bool $manager=false): array {$a=shop_actor($d,$session);if(!$a||!in_array($a['role'],$manager?['admin']:['admin','staff'],true))shop_fail('Not authorized.',403);return $a;}
function shop_user_index(array $d,string $id): int {foreach($d['users'] as $i=>$u)if($u['id']===$id)return $i;shop_fail('Customer not found.',404);}
function shop_event(array &$d,string $kind,int $amount,array $extra,array $actor): void {$d['finance'][]=array_merge(['id'=>bin2hex(random_bytes(16)),'kind'=>$kind,'amountCents'=>$amount,'at'=>gmdate('c'),'date'=>shop_now()->format('Y-m-d'),'actor'=>$actor['username']],$extra);}
function shop_slot(array $d,string $date,int $start,array $q,bool $validate=true): array {
 $s=$d['settings'];$now=shop_now();$day=DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone('America/Vancouver'));
 if(!$day||$day->format('Y-m-d')!==$date)shop_fail('Invalid date.');
 $qty=array_sum($q);$duration=0;foreach($q as $i=>$n)if($n)$duration=max($duration,$d['breads'][$i]['bake']);
 $session=null;foreach($s['sessions'] as $se)if($start>=shop_minutes($se['start'])&&$start<shop_minutes($se['end'])&&($start-shop_minutes($se['start']))%$s['interval']===0)$session=$se;
 $ov=$s['overrides'][$date.'@'.shop_clock($start)]??[];$same=0;$used=0;$events=[];$stop=$start+max(1,$duration);
 foreach($d['orders'] as $o){if($o['date']!==$date||$o['status']==='cancelled')continue;$oq=array_sum(array_column($o['items'],'qty'));if($o['start']===$start){$same++;$used+=$oq;}$dur=0;foreach($o['items'] as $item)if($item['qty'])$dur=max($dur,$item['bake']);$end=$o['start']+$dur;if($o['start']<$stop&&$end>$start){$events[]=[max($start,$o['start']),$oq];$events[]=[min($stop,$end),-$oq];}}
 usort($events,static function($a,$b){return $a[0]<=>$b[0]?:$a[1]<=>$b[1];});$load=0;$peak=0;foreach($events as $e){$load+=$e[1];$peak=max($peak,$load);}
 $left=max(0,min(($ov['capacity']??$s['slotCapacity'])-$used,$s['ovens']*$s['ovenCapacity']-$peak));$end=max($start+$duration+$s['packing'],shop_minutes($s['storeOpen']));
 $valid=$session&&$date>=$now->format('Y-m-d')&&$date<=$now->modify('+'.$s['horizon'].' days')->format('Y-m-d')&&in_array((int)$day->format('w'),$s['days'],true)&&!in_array($date,$s['holidays'],true)&&!($ov['disabled']??false)&&!($date===$now->format('Y-m-d')&&$start<=(int)$now->format('H')*60+(int)$now->format('i'))&&($s['overrun']||$start+$duration+$s['packing']<=shop_minutes($session['end']))&&$end<=shop_minutes($s['storeClose'])&&$same<$s['maxOrders']&&$qty>0&&$qty<=$left;
 if($validate&&!$valid)shop_fail('This baking time is no longer available. Please choose another.',409);
 return ['ok'=>(bool)$valid,'left'=>$left,'end'=>$end];
}
function shop_public(array $d,array &$session): array {
 $a=shop_actor($d,$session);$operator=$a&&in_array($a['role'],['admin','staff'],true);$manager=$a&&$a['role']==='admin';$out=$d;
 unset($out['attempts'],$out['requests'],$out['used']);$out['used']=[];
 $out['auth']=array_values(array_map(static function($x){unset($x['password']);return $x;},array_filter($d['auth'],static function($x)use($manager,$a){return $manager||($a&&$x['id']===$a['id']);})));
 $out['users']=$manager?$d['users']:array_values(array_filter($d['users'],static function($u)use($a){return $a&&($a['userId']??'')===$u['id'];}));
 $owned=$session['owned']??[];
 $out['orders']=array_map(static function($o)use($operator,$a,$owned){if($operator||in_array($o['id'],$owned,true)||($a&&($a['userId']??'')===$o['userId']))return $o;return ['id'=>'reserved-'.substr(hash('sha256',$o['id']),0,12),'date'=>$o['date'],'start'=>$o['start'],'end'=>$o['end'],'items'=>array_map(static function($i){return ['qty'=>$i['qty'],'bake'=>$i['bake']];},$o['items']),'status'=>$o['status']];},$d['orders']);
 $out['finance']=$manager?$d['finance']:[];$out['topups']=array_values(array_filter($d['topups'],static function($x)use($manager,$a){return $manager||($a&&($a['userId']??'')===$x['userId']);}));
 return ['db'=>$out,'account'=>$a?array_diff_key($a,['password'=>true]):null,'csrf'=>$session['csrf'],'needsSetup'=>count($d['auth'])===0];
}
function shop_validate_settings(array $s,array $b,array $orders): void {
 if(count($b)!==3||empty($s['days'])||empty($s['sessions'])||count($s['sessions'])>8)shop_fail('Invalid settings.');
 foreach(['interval'=>[5,240],'horizon'=>[1,365],'ovens'=>[1,20],'ovenCapacity'=>[1,500],'slotCapacity'=>[1,500],'maxOrders'=>[1,500],'packing'=>[0,500]] as $k=>$range)if(!isset($s[$k])||!is_int($s[$k])||$s[$k]<$range[0]||$s[$k]>$range[1])shop_fail('Invalid '.$k.'.');
 if(shop_minutes($s['storeOpen'])>=shop_minutes($s['storeClose']))shop_fail('Invalid store hours.');
 $last=-1;foreach($s['sessions'] as $se){$start=shop_minutes($se['start']);$end=shop_minutes($se['end']);if($start<$last||$end<=$start)shop_fail('Baking sessions overlap.');$last=$end;}
 foreach($b as $bread)if(empty($bread['en'])||empty($bread['fa'])||shop_cents($bread['price'])<1||shop_cents($bread['price'])>99900||!is_int($bread['bake'])||$bread['bake']<1||$bread['bake']>240||!is_int($bread['max'])||$bread['max']<0||$bread['max']>20)shop_fail('Invalid bread settings.');
 foreach($s['days'] as $day)if(!is_int($day)||$day<0||$day>6)shop_fail('Invalid operating day.');
 foreach($s['holidays'] as $day)if(!is_string($day)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$day))shop_fail('Invalid holiday.');
 foreach($s['overrides'] as $key=>$ov)if(!preg_match('/^\d{4}-\d{2}-\d{2}@(?:[01]\d|2[0-3]):[0-5]\d$/D',$key)||!is_int($ov['capacity'])||$ov['capacity']<0||$ov['capacity']>500||!is_bool($ov['disabled']))shop_fail('Invalid slot override.');
 if(!array_filter($s['payments']))shop_fail('Enable at least one payment method.');
 foreach(array_merge([$s['logo']??''],array_column($b,'image')) as $image){if($image!==''&&!preg_match('~^(?:assets/[a-zA-Z0-9/_\-.]+|data:image/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+)$~D',$image))shop_fail('Use an uploaded PNG, JPEG or WebP image.');if(strlen($image)>1000000)shop_fail('Image too large.');}
 $test=['settings'=>$s,'breads'=>$b,'orders'=>[]];foreach($orders as $o){if(in_array($o['status'],['cancelled','delivered'],true)||$o['date']<shop_now()->format('Y-m-d')||($o['date']===shop_now()->format('Y-m-d')&&$o['start']<=(int)shop_now()->format('H')*60+(int)shop_now()->format('i')))continue;$q=array_column($o['items'],'qty');$slot=shop_slot($test,$o['date'],$o['start'],$q,false);if(!$slot['ok']||$o['end']>shop_minutes($s['storeClose']))shop_fail('Settings would invalidate an existing reservation.');$test['orders'][]=$o;}
}
function shop_action(array &$d,array &$session,string $action,array $p,string $setupToken=''): array {
 $actor=shop_actor($d,$session);$now=time();
 if($action==='state')return [];
 if($action==='setup'){
  if(count($d['auth']))shop_fail('Administrator already configured.',409);
  $bucket='setup-'.hash('sha256',$session['ip']??'local');$attempt=$d['attempts'][$bucket]??['count'=>0,'since'=>$now];if($now-$attempt['since']>900)$attempt=['count'=>0,'since'=>$now];$attempt['count']++;$d['attempts'][$bucket]=$attempt;if($attempt['count']>5)shop_fail('Too many attempts. Try later.',429);
  if($setupToken===''||!hash_equals($setupToken,(string)($p['token']??'')))shop_fail('Invalid setup token.',403);
  $password=shop_text($p,'password',200,true);if(strlen($password)<12)shop_fail('Use a password with at least 12 characters.');
  $a=['id'=>bin2hex(random_bytes(16)),'username'=>'Admin','role'=>'admin','version'=>1,'password'=>password_hash($password,PASSWORD_DEFAULT)];$d['auth'][]=$a;$session['account']=$a['id'];$session['version']=1;return ['setupComplete'=>true];
 }
 if($action==='login'){
  $username=strtolower(shop_text($p,'username',32,true));$password=shop_text($p,'password',200,true);$bucket=hash('sha256',($session['ip']??'local').'|'.$username);$attempt=$d['attempts'][$bucket]??['count'=>0,'since'=>$now];if($now-$attempt['since']>900)$attempt=['count'=>0,'since'=>$now];if($attempt['count']>=5)shop_fail('Too many attempts. Try again in 15 minutes.',429);$attempt['count']++;$d['attempts'][$bucket]=$attempt;
  foreach($d['auth'] as $a)if(strtolower($a['username'])===$username&&password_verify($password,$a['password'])){$session['account']=$a['id'];$session['version']=$a['version'];unset($d['attempts'][$bucket]);return [];}
  shop_fail('Incorrect username or password.',401);
 }
 if($action==='logout'){unset($session['account'],$session['version']);$session['owned']=[];$session['guest']=bin2hex(random_bytes(16));return [];}
 if($action==='register'){
  $name=shop_text($p,'name',240,true);$phone=shop_phone(shop_text($p,'phone',24,true));$username=shop_text($p,'username',32,true);$password=shop_text($p,'password',200,true);$email=shop_text($p,'email',254);
  if(!preg_match('/^[a-zA-Z0-9_.-]{3,32}$/D',$username)||strlen($password)<10||($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL)))shop_fail('Check username, email and password (10 characters minimum).');
  $bucket='signup-'.hash('sha256',$session['ip']??'local');$attempt=$d['attempts'][$bucket]??['count'=>0,'since'=>$now];if($now-$attempt['since']>3600)$attempt=['count'=>0,'since'=>$now];if($attempt['count']>=10)shop_fail('Too many registrations. Try later.',429);$attempt['count']++;$d['attempts'][$bucket]=$attempt;
  foreach($d['auth'] as $a)if(strtolower($a['username'])===strtolower($username))shop_fail('Username is already in use.');foreach($d['users'] as $u)if($u['phone']===$phone)shop_fail('Phone is already registered.');
  $uid=bin2hex(random_bytes(16));$d['users'][]=['id'=>$uid,'name'=>$name,'phone'=>$phone,'email'=>$email,'balance'=>0,'transactions'=>[]];$a=['id'=>bin2hex(random_bytes(16)),'username'=>$username,'role'=>'customer','userId'=>$uid,'version'=>1,'password'=>password_hash($password,PASSWORD_DEFAULT)];$d['auth'][]=$a;$session['account']=$a['id'];$session['version']=1;return [];
 }
 if($action==='order'){
  $key=shop_text($p,'requestKey',80,true);if(!preg_match('/^[a-zA-Z0-9-]{16,80}$/D',$key))shop_fail('Invalid request key.');$scope=hash('sha256',($actor['id']??$session['guest']).'|'.$key);
  $fingerprint=hash('sha256',json_encode($p));if(isset($d['requests'][$scope])){if(!hash_equals($d['requests'][$scope]['hash'],$fingerprint))shop_fail('Order changed. Please review.',409);return ['orderId'=>$d['requests'][$scope]['id'],'replayed'=>true];}
  if($now-($session['lastBooking']??0)<5)shop_fail('Please wait before placing another order.',429);
  $walkin=($p['walkin']??false)===true;if($walkin)shop_require($d,$session);
  $q=$p['quantities']??null;if(!is_array($q)||count($q)!==3||array_sum($q)<1)shop_fail('Choose your bread.');$items=[];$amount=0;
  foreach($d['breads'] as $i=>$b){$n=$q[$i]??null;if(!is_int($n)||$n<0||$n>$b['max']||($n&&!$b['active']))shop_fail('Invalid bread quantity.');$items[]=array_merge($b,['qty'=>$n]);unset($items[$i]['image']);$amount+=shop_cents($b['price'])*$n;}
  $date=shop_text($p,'date',10,true);$start=$p['start']??null;if(!is_int($start)||$start<0||$start>1439)shop_fail('Choose a valid baking time.');$slot=shop_slot($d,$date,$start,$q);
  $name=shop_text($p,'name',240,true);$phone=shop_phone(shop_text($p,'phone',24,true));$method=shop_text($p,'method',20,true);if(!isset($d['settings']['payments'][$method])||!$d['settings']['payments'][$method]||($walkin&&$method==='wallet'))shop_fail('Payment method unavailable.');
  $uid=$actor&&$actor['role']==='customer'&&!$walkin?$actor['userId']:'';$id=order_reference($name,$phone);$code='';$used=array_column(array_filter($d['orders'],static function($o)use($date){return $o['date']===$date;}),'code');do{$code=(string)random_int(100000,999999);}while(in_array($code,$used,true));
  $order=['id'=>$id,'date'=>$date,'start'=>$start,'end'=>$slot['end'],'items'=>$items,'total'=>$amount/100,'name'=>$name,'phone'=>$phone,'userId'=>$uid,'method'=>$method,'payment'=>$method==='wallet'?'paid':($method==='cash'?'due':'awaiting'),'status'=>'pending','code'=>$code,'notes'=>shop_text($p,'notes',600),'source'=>$walkin?'walkin':'online','created'=>gmdate('c')];
  if($method==='wallet'){if(!$uid)shop_fail('Sign in to use your wallet.',403);$i=shop_user_index($d,$uid);if(shop_cents($d['users'][$i]['balance'])<$amount)shop_fail('Insufficient wallet balance.');$d['users'][$i]['balance']=(shop_cents($d['users'][$i]['balance'])-$amount)/100;$d['users'][$i]['transactions'][]=['kind'=>'wallet_purchase','at'=>gmdate('c'),'amount'=>-$amount/100,'note'=>$id];shop_event($d,'wallet_purchase',-$amount,['orderId'=>$id,'userId'=>$uid,'method'=>'wallet'],$actor);}
  $d['orders'][]=$order;$d['requests'][$scope]=['id'=>$id,'hash'=>$fingerprint];$session['owned'][]=$id;$session['lastBooking']=$now;return ['orderId'=>$id,'notify'=>true];
 }
 if(!$actor)shop_fail('Sign in first.',401);
 if($action==='profile'){$i=shop_user_index($d,$actor['userId']??'');$phone=shop_phone(shop_text($p,'phone',24,true));foreach($d['users'] as $j=>$u)if($j!==$i&&$u['phone']===$phone)shop_fail('Phone already registered.');$email=shop_text($p,'email',254);if($email&&!filter_var($email,FILTER_VALIDATE_EMAIL))shop_fail('Invalid email.');$d['users'][$i]['name']=shop_text($p,'name',240,true);$d['users'][$i]['phone']=$phone;$d['users'][$i]['email']=$email;return [];}
 if($action==='password'){$old=shop_text($p,'current',200,true);$next=shop_text($p,'password',200,true);if(strlen($next)<10||!password_verify($old,$actor['password']))shop_fail('Check current password; new password needs 10 characters.');foreach($d['auth'] as &$a)if($a['id']===$actor['id']){$a['password']=password_hash($next,PASSWORD_DEFAULT);$a['version']++;$session['version']=$a['version'];}unset($a);return [];}
 if($action==='topup'){
  if($actor['role']!=='customer')shop_fail('Customer account required.',403);$amount=shop_cents($p['amount']??0);if($amount<1000||$amount>100000000)shop_fail('Minimum top-up is $10 CAD.');foreach($d['topups'] as $r)if($r['userId']===$actor['userId']&&$r['status']==='pending')shop_fail('A top-up is already awaiting verification.');$d['topups'][]=['id'=>bin2hex(random_bytes(16)),'userId'=>$actor['userId'],'amountCents'=>$amount,'status'=>'pending','at'=>gmdate('c')];return [];
 }
 shop_require($d,$session);
 if(in_array($action,['staffCreate','staffPassword','staffRemove','settings','walletAdjust','topupApprove'],true))shop_require($d,$session,true);
 if($action==='staffCreate'){$username=shop_text($p,'username',32,true);$password=shop_text($p,'password',200,true);if(!preg_match('/^[a-zA-Z0-9_.-]{3,32}$/D',$username)||strlen($password)<10)shop_fail('Use a valid username and a password of 10 characters.');$n=0;foreach($d['auth'] as $a){if($a['role']==='staff')$n++;if(strtolower($a['username'])===strtolower($username))shop_fail('Username exists.');}if($n>=2)shop_fail('Two staff accounts maximum.');$d['auth'][]=['id'=>bin2hex(random_bytes(16)),'username'=>$username,'role'=>'staff','version'=>1,'password'=>password_hash($password,PASSWORD_DEFAULT)];return [];}
 if($action==='staffPassword'||$action==='staffRemove'){$id=shop_text($p,'id',40,true);foreach($d['auth'] as $i=>$a)if($a['id']===$id&&$a['role']==='staff'){if($action==='staffRemove')array_splice($d['auth'],$i,1);else{$password=shop_text($p,'password',200,true);if(strlen($password)<10)shop_fail('Use at least 10 characters.');$d['auth'][$i]['password']=password_hash($password,PASSWORD_DEFAULT);$d['auth'][$i]['version']++;}return [];}shop_fail('Staff account not found.');}
 if($action==='walletAdjust'||$action==='topupApprove'){
  if($action==='topupApprove'){$ri=null;foreach($d['topups'] as $i=>$r)if($r['id']===($p['id']??'')&&$r['status']==='pending')$ri=$i;if($ri===null)shop_fail('Pending top-up not found.');$uid=$d['topups'][$ri]['userId'];$delta=$d['topups'][$ri]['amountCents'];$reason='Verified wallet top-up';$d['topups'][$ri]['status']='approved';}
  else{$uid=shop_text($p,'userId',40,true);$amount=shop_cents($p['amount']??0);if($amount<1||$amount>100000000||!in_array($p['direction']??'',['credit','debit'],true))shop_fail('Invalid adjustment.');$delta=($p['direction']==='debit'?-1:1)*$amount;$reason=shop_text($p,'reason',480,true);}
  $i=shop_user_index($d,$uid);if(shop_cents($d['users'][$i]['balance'])+$delta<0)shop_fail('Balance cannot be negative.');$d['users'][$i]['balance']=(shop_cents($d['users'][$i]['balance'])+$delta)/100;$kind=$action==='topupApprove'?'wallet_topup':($delta>0?'admin_credit':'admin_debit');$d['users'][$i]['transactions'][]=['kind'=>$kind,'at'=>gmdate('c'),'amount'=>$delta/100,'note'=>$reason,'actor'=>$actor['username']];shop_event($d,$kind,$delta,['userId'=>$uid,'note'=>$reason],$actor);return [];
 }
 if($action==='settings'){
  $s=$p['settings']??null;$b=$p['breads']??null;if(!is_array($s)||!is_array($b))shop_fail('Invalid settings.');
  foreach(['name','address','phone'] as $field)$s[$field]=shop_text($s,$field,400,true);$s['phone']=shop_phone($s['phone']);
  foreach($b as &$bread){foreach(['en','fa','descriptionEn','descriptionFa'] as $field)$bread[$field]=shop_text($bread,$field,800,in_array($field,['en','fa'],true));$bread['active']=(bool)$bread['active'];}unset($bread);
  shop_validate_settings($s,$b,$d['orders']);$d['settings']=$s;$d['breads']=$b;return [];
 }
 $id=shop_text($p,'id',80,true);$oi=null;foreach($d['orders'] as $i=>$o)if($o['id']===$id)$oi=$i;if($oi===null)shop_fail('Order not found.',404);$o=&$d['orders'][$oi];
 if($action==='status'){$status=shop_text($p,'status',20,true);$allowed=['pending'=>['confirmed','cancelled'],'confirmed'=>['baking','cancelled'],'baking'=>['ready','cancelled'],'ready'=>['cancelled']];if(!in_array($status,$allowed[$o['status']]??[],true))shop_fail('Invalid order transition.');if($status==='cancelled'&&$o['payment']==='paid'&&$o['method']!=='wallet'){if(($p['refundConfirmed']??false)!==true)shop_fail('Confirm the actual store refund before cancelling this paid order.');$o['payment']='refunded';$o['refunded']=true;shop_event($d,'sale_refund',-shop_cents($o['total']),['orderId'=>$id,'method'=>$o['method'],'userId'=>$o['userId'],'note'=>$o['name']],$actor);}$o['status']=$status;if($status==='cancelled'&&$o['method']==='wallet'&&$o['payment']==='paid'&&empty($o['refunded'])){$i=shop_user_index($d,$o['userId']);$amount=shop_cents($o['total']);$d['users'][$i]['balance']=(shop_cents($d['users'][$i]['balance'])+$amount)/100;$d['users'][$i]['transactions'][]=['kind'=>'wallet_refund','at'=>gmdate('c'),'amount'=>$amount/100,'note'=>$id];shop_event($d,'wallet_refund',$amount,['orderId'=>$id,'userId'=>$o['userId'],'method'=>'wallet'],$actor);$o['refunded']=true;$o['payment']='refunded';}return [];}
 if($action==='pay'){if($o['status']==='cancelled'||$o['payment']==='paid')shop_fail('Payment cannot be recorded twice.');$o['payment']='paid';$o['paidAt']=gmdate('c');shop_event($d,'sale_payment',shop_cents($o['total']),['orderId'=>$id,'method'=>$o['method'],'userId'=>$o['userId'],'note'=>$o['name']],$actor);return [];}
 if($action==='delay'){$end=$p['end']??null;if(!is_int($end)||$end<$o['start']||$end>shop_minutes($d['settings']['storeClose'])||in_array($o['status'],['cancelled','delivered'],true))shop_fail('Invalid pickup time.');$o['end']=$end;return [];}
 if($action==='verify'||$action==='handoff'){if($o['status']!=='ready'||!hash_equals($o['code'],(string)($p['code']??''))||!empty($o['deliveredAt']))shop_fail('Pickup code or status is invalid.');if($action==='handoff'){$o['status']='delivered';$o['deliveredAt']=gmdate('c');}return ['verified'=>$id];}
 shop_fail('Unknown operation.',404);
}
