<?php
declare(strict_types=1);
require __DIR__.'/../api/shop-core.php';
function check_shop(bool $ok,string $why): void {if(!$ok)throw new RuntimeException($why);}
function rejected(callable $fn,int $status=422): void {try{$fn();throw new RuntimeException('Expected rejection');}catch(ShopError $e){check_shop($e->getCode()===$status,$e->getMessage());}}
$d=shop_seed();$admin=['csrf'=>'fixture','guest'=>'admin-fixture','ip'=>'test'];$customer=['csrf'=>'fixture','guest'=>'customer-fixture','ip'=>'customer'];$guest=['csrf'=>'fixture','guest'=>'guest-fixture','ip'=>'guest'];
check_shop(count($d['users'])===0&&count($d['orders'])===0,'No invented customers/orders');
rejected(function()use(&$d,&$guest){shop_action($d,$guest,'staffCreate',['username'=>'evil','password'=>'longpassword123']);},401);
shop_action($d,$admin,'setup',['token'=>'test-token','password'=>'TestAdmin-Password!'],'test-token');
rejected(function()use(&$d,&$guest){shop_action($d,$guest,'setup',['token'=>'test-token','password'=>'TestAdmin-Password!'],'test-token');},409);
shop_action($d,$customer,'register',['name'=>'Test Customer','phone'=>'+16045550123','username'=>'testcustomer','password'=>'TestCustomer-Password!','email'=>'test@example.test']);
$uid=shop_actor($d,$customer)['userId'];
shop_action($d,$customer,'topup',['amount'=>25]);check_shop($d['users'][0]['balance']===0,'Top-up request must not mint money');
shop_action($d,$admin,'topupApprove',['id'=>$d['topups'][0]['id']]);check_shop($d['users'][0]['balance']===25,'Verified top-up credited');
rejected(function()use(&$d,&$admin){shop_action($d,$admin,'topupApprove',['id'=>$d['topups'][0]['id']]);});
$date=shop_now()->modify('+1 day')->format('Y-m-d');$p=['name'=>'Test Customer','phone'=>'+16045550123','date'=>$date,'start'=>420,'quantities'=>[1,1,0],'method'=>'wallet','notes'=>'test','requestKey'=>'fixture-order-request-123','walkin'=>false];
$r=shop_action($d,$customer,'order',$p);check_shop($d['users'][0]['balance']===16.25,'Wallet purchase exact cents');
$again=shop_action($d,$customer,'order',$p);check_shop($again['orderId']===$r['orderId']&&count($d['orders'])===1,'Idempotent booking');
shop_action($d,$admin,'status',['id'=>$r['orderId'],'status'=>'cancelled']);check_shop($d['users'][0]['balance']===25,'Wallet refund once');
rejected(function()use(&$d,&$admin,$r){shop_action($d,$admin,'status',['id'=>$r['orderId'],'status'=>'cancelled']);});
$p['method']='cash';$p['requestKey']='guest-request-key-1234';$p['name']='Private Guest';$p['phone']='+16045550124';$r=shop_action($d,$guest,'order',$p);
$anonymous=['csrf'=>'anon','guest'=>'anon','ip'=>'anon'];$visible=shop_public($d,$anonymous);check_shop(strpos(json_encode($visible),'Private Guest')===false,'Anonymous state hides customer details');check_shop(strpos(json_encode($visible),'$2y$')===false,'No password hashes exported');
foreach(['confirmed','baking','ready'] as $status)shop_action($d,$admin,'status',['id'=>$r['orderId'],'status'=>$status]);
$code=$d['orders'][1]['code'];rejected(function()use(&$d,&$admin,$r){shop_action($d,$admin,'handoff',['id'=>$r['orderId'],'code'=>'000000']);});
shop_action($d,$admin,'handoff',['id'=>$r['orderId'],'code'=>$code]);rejected(function()use(&$d,&$admin,$r,$code){shop_action($d,$admin,'handoff',['id'=>$r['orderId'],'code'=>$code]);});
shop_action($d,$admin,'staffCreate',['username'=>'staff1','password'=>'TestStaff-Password!']);$staff=['csrf'=>'staff','guest'=>'staff','ip'=>'staff'];shop_action($d,$staff,'login',['username'=>'staff1','password'=>'TestStaff-Password!']);
rejected(function()use(&$d,&$staff){shop_action($d,$staff,'walletAdjust',['userId'=>$d['users'][0]['id'],'amount'=>10,'direction'=>'credit','reason'=>'bad']);},403);
$settings=$d['settings'];$settings['overrides'][$date.'@17:00']=['capacity'=>2,'disabled'=>false];shop_action($d,$admin,'settings',['settings'=>$settings,'breads'=>$d['breads']]);
$g1=['csrf'=>'g1','guest'=>'g1','ip'=>'g1'];$g2=['csrf'=>'g2','guest'=>'g2','ip'=>'g2'];$p['start']=1020;$p['quantities']=[2,0,0];$p['requestKey']='capacity-first-1234';shop_action($d,$g1,'order',$p);$p['requestKey']='capacity-second-1234';rejected(function()use(&$d,&$g2,$p){shop_action($d,$g2,'order',$p);},409);
rejected(function(){shop_phone('+12125550123');});
echo "PASS: production seed, roles, setup, registration, verified top-up, wallet debit/refund, idempotency, privacy, pickup verification, shared capacity and Canadian phones. No email sent.\n";
