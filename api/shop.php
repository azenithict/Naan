<?php
declare(strict_types=1);
require_once __DIR__.'/shop-core.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
function shop_reply(int $status,array $data): void {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
function shop_write(string $path,array $data): void {$tmp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';$json=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);if(file_put_contents($tmp,$json)===false)throw new RuntimeException('Storage unavailable.');chmod($tmp,0600);if(!rename($tmp,$path)){unlink($tmp);throw new RuntimeException('Storage commit failed.');}}
try{
 $dir=getenv('BAANOU_DATA_DIR')?:dirname(__DIR__,2).'/.baanou-data';
 if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Private storage could not be created.');
 if(strpos(realpath($dir).'/',realpath(dirname(__DIR__)).'/')===0)throw new RuntimeException('Storage must be outside the public web root.');
 $path=$dir.'/shop.json';$lock=fopen($dir.'/shop.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Storage lock unavailable.');chmod($dir.'/shop.lock',0600);
 $d=is_file($path)?json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR):shop_seed();
 if(empty($d['auth'])&&!is_file($dir.'/setup-token.txt')){file_put_contents($dir.'/setup-token.txt',bin2hex(random_bytes(32)));chmod($dir.'/setup-token.txt',0600);}
 ini_set('session.use_strict_mode','1');session_set_cookie_params(['httponly'=>true,'secure'=>!getenv('BAANOU_TEST_HTTP'),'samesite'=>'Strict']);if(!session_start())throw new RuntimeException('Session unavailable.');
 $_SESSION['csrf']=$_SESSION['csrf']??bin2hex(random_bytes(32));$_SESSION['guest']=$_SESSION['guest']??bin2hex(random_bytes(16));$_SESSION['ip']=$_SERVER['REMOTE_ADDR']??'local';
 $action='state';$p=[];
 if($_SERVER['REQUEST_METHOD']==='POST'){
  if(isset($_SERVER['HTTP_ORIGIN'])&&$_SERVER['HTTP_ORIGIN']!=='https://naan.azenith.ca'&&!getenv('BAANOU_TEST_HTTP'))shop_fail('Origin not allowed.',403);
  if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))shop_fail('Session expired. Refresh and try again.',403);
  if((int)($_SERVER['CONTENT_LENGTH']??0)>5000000)shop_fail('Request too large.',413);
  $p=json_decode(file_get_contents('php://input',false,null,0,5000001),true,512,JSON_THROW_ON_ERROR);if(!is_array($p))shop_fail('Invalid request.');$action=shop_text($p,'action',30,true);
 }elseif($_SERVER['REQUEST_METHOD']!=='GET')shop_fail('Method not allowed.',405);
 $before=$d;$result=[];$error=null;
 try{$result=shop_action($d,$_SESSION,$action,$p,is_file($dir.'/setup-token.txt')?trim(file_get_contents($dir.'/setup-token.txt')):'');}
 catch(ShopError $e){$attempts=$d['attempts'];$d=$before;$d['attempts']=$attempts;$error=$e;}
 $d['revision']++;shop_write($path,$d);
 if($error){flock($lock,LOCK_UN);fclose($lock);shop_reply($error->getCode()?:422,['error'=>$error->getMessage()]);}
 if(in_array($action,['login','register','setup','logout','password'],true)){session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));}
 if(!empty($result['setupComplete'])&&is_file($dir.'/setup-token.txt'))unlink($dir.'/setup-token.txt');
 $reply=array_merge(shop_public($d,$_SESSION),$result);$reply['testMode']=(bool)getenv('BAANOU_TEST_HTTP');unset($reply['notify']);
 flock($lock,LOCK_UN);fclose($lock);session_write_close();
 if(!empty($result['notify'])){
  $order=null;foreach($d['orders'] as $o)if($o['id']===$result['orderId'])$order=$o;
  $items=[];foreach($order['items'] as $i)if($i['qty'])$items[]=['name'=>$i['en'],'quantity'=>$i['qty'],'unitPriceCents'=>shop_cents($i['price'])];
  $email=order_email(['id'=>$order['id'],'name'=>$order['name'],'phone'=>$order['phone'],'method'=>'pickup','address'=>'','postal'=>'','time'=>$order['date'].' · '.shop_clock($order['end']).' Vancouver time','note'=>'Pickup code: '.$order['code']."\nPayment: ".$order['method'].' / '.$order['payment']."\n".$order['notes'],'items'=>$items,'subtotalCents'=>shop_cents($order['total']),'store'=>$d['settings'],'paymentNotice'=>$order['method']==='wallet'?'Paid from approved wallet balance.':($order['method']==='transfer'?'Transfer awaiting store verification.':'Cash payment due at pickup.')]);
  $sent=getenv('BAANOU_TEST_HTTP')?true:mail('f.heravy@gmail.com',$email['subject'],$email['body'],$email['headers']);$reply['notification']=$sent?'accepted':'failed';
 }
 shop_reply(200,$reply);
}catch(ShopError $e){shop_reply($e->getCode()?:422,['error'=>$e->getMessage()]);}
catch(Throwable $e){error_log('Baanou shop: '.$e->getMessage());shop_reply(503,['error'=>'The order service is unavailable. Please call (604) 544-0046.']);}
