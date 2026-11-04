<?php
declare(strict_types=1);
require __DIR__.'/../api/order-state.php';
function expect_state(bool $value,string $message): void {if(!$value)throw new RuntimeException($message);}
$token='ab123456-1234-1234-1234-123456789abc';
$fields=['Alex Smith','+16045550123','pickup','','','next',''];
$items=[['id'=>'white','quantity'=>2],['id'=>'bran','quantity'=>1]];
$fingerprint=request_fingerprint($fields,$items);
expect_state($fingerprint===request_fingerprint($fields,array_reverse($items)),'Item ordering does not change request identity');
expect_state(previous_receipt([],$token,$fingerprint)===null,'New request has no receipt');
$response=['id'=>'AS-0123-12345678','subtotalCents'=>1300,'currency'=>'CAD','status'=>'accepted'];
$cache=remember_receipt([],$token,$fingerprint,$response);
expect_state(previous_receipt($cache,$token,$fingerprint)===$response,'Retry reuses accepted reference and amount');
$items[0]['quantity']=3;$changed=request_fingerprint($fields,$items);
try{previous_receipt($cache,$token,$changed);throw new RuntimeException('Changed payload must be rejected');}catch(InvalidArgumentException $expected){}
expect_state(remember_receipt([],'',$fingerprint,$response)===[],'Legacy requests do not share blank tokens');
for($i=0;$i<30;$i++)$cache=remember_receipt($cache,'token-'.$i,$fingerprint,$response);
expect_state(count($cache)===20,'Cache bounded to twenty recent requests');
expect_state(!isset($cache[$token]),'Old receipts evicted');
expect_state(strpos(json_encode($cache),'Alex Smith')===false,'Session receipt cache contains no raw customer details');
echo "PASS: request identity, same-session retry receipt, payload conflicts, legacy requests, bounded cache. No email sent.\n";
