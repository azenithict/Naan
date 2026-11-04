<?php
declare(strict_types=1);

function request_fingerprint(array $fields, array $items): string
{
    $selection=[];
    foreach($items as $item){$selection[$item['id']]=$item['quantity'];}
    ksort($selection);
    return hash('sha256',json_encode([$fields,$selection],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
}

/** Reuse the receipt for an accepted retry in the same PHP session. */
function previous_receipt(array $receipts, string $token, string $fingerprint): ?array
{
    if($token===''||!isset($receipts[$token]))return null;
    if(!hash_equals($receipts[$token]['fingerprint'],$fingerprint)){
        throw new InvalidArgumentException('This request has changed. Please reload and review your order.');
    }
    return $receipts[$token]['response'];
}

function remember_receipt(array $receipts, string $token, string $fingerprint, array $response): array
{
    if($token==='')return $receipts;
    $receipts[$token]=['fingerprint'=>$fingerprint,'response'=>$response];
    return array_slice($receipts,-20,null,true);
}
