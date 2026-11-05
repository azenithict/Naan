<?php
declare(strict_types=1);

/** Human-readable prefix plus a random suffix for repeat requests. */
function order_reference(string $name, string $phone): string
{
    $parts = preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $letters = [];
    foreach ([$parts[0] ?? '', count($parts) > 1 ? $parts[count($parts) - 1] : ''] as $part) {
        preg_match('/\p{L}/u', $part, $match);
        $letters[] = $match[0] ?? 'X';
    }
    $initials = implode('', $letters);
    $initials = function_exists('mb_strtoupper') ? mb_strtoupper($initials, 'UTF-8') : strtoupper($initials);
    return $initials . '-' . substr(preg_replace('/\D/', '', $phone), -4) . '-' . strtoupper(bin2hex(random_bytes(4)));
}

function email_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function email_subject(string $subject): string
{
    $chunks = []; $chunk = '';
    foreach (preg_split('//u', $subject, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $character) {
        if (strlen($chunk . $character) > 42) { $chunks[] = $chunk; $chunk = ''; }
        $chunk .= $character;
    }
    if ($chunk !== '') { $chunks[] = $chunk; }
    return implode("\r\n ", array_map(static function (string $part): string { return '=?UTF-8?B?' . base64_encode($part) . '?='; }, $chunks));
}

/** All prices supplied here come from the server catalogue, never the client. */
function order_email(array $order): array
{
    $e = 'email_escape';
    $money = static function (int $cents): string { return '$' . number_format($cents / 100, 2) . ' CAD'; };
    $when = $order['createdAt'] ?? new DateTimeImmutable('now', new DateTimeZone('America/Vancouver'));
    $date = $when->setTimezone(new DateTimeZone('America/Vancouver'))->format('D, M j, Y · g:i a');
    $delivery = $order['method'] === 'delivery';
    $method = $delivery ? 'Delivery requested' : 'Store pickup';
    $store=$order['store']??[];$storeName=$store['name']??'Persian Baanou Supermarket';$storeAddress=$store['address']??'220 6th St, New Westminster, BC V3L 3A2';$storePhone=$store['phone']??'+16045440046';
    $location = $delivery ? $order['address'] . "\n" . $order['postal'] : $storeName."\n".$storeAddress;
    $paymentNotice=$order['paymentNotice']??'No payment taken.';$paymentHtml=$e($paymentNotice);$storeNameHtml=$e($storeName);$storePhoneHtml=$e($storePhone);$storeTel=$e(preg_replace('/[^+0-9]/','',$storePhone));
    $note = $order['note'] !== '' ? $order['note'] : 'No additional notes.';
    $rows = '';
    $textLines = [];
    foreach ($order['items'] as $item) {
        $rows .= '<tr><td style="padding:9px 8px 9px 0;border-bottom:1px solid #e4e3da;font-size:13px;line-height:1.5;color:#2d352b;">' . $e($item['name']) . '</td><td align="center" style="padding:9px 6px;border-bottom:1px solid #e4e3da;font-size:14px;">' . $item['quantity'] . '</td><td align="right" style="padding:9px 0 9px 6px;border-bottom:1px solid #e4e3da;font-size:14px;white-space:nowrap;">' . $money($item['unitPriceCents'] * $item['quantity']) . '<br><span style="font-size:11px;color:#74776b;">' . $money($item['unitPriceCents']) . ' each</span></td></tr>';
        $textLines[] = $item['name'] . ' x ' . $item['quantity'] . ' @ ' . $money($item['unitPriceCents']) . ' = ' . $money($item['unitPriceCents'] * $item['quantity']);
    }
    $id = $e($order['id']);
    $name = $e($order['name']);
    $phone = $e($order['phone']);
    $time = $e($order['time']);
    $dateHtml = $e($date);
    $locationHtml = nl2br($e($location));
    $noteHtml = nl2br($e($note));
    $subtotal = $money($order['subtotalCents']);
    $noteSection = $order['note'] !== '' ? '<tr><td style="padding:9px 16px;border-top:1px solid #ecdfcc;font-size:12px;line-height:1.6;"><strong>Note:</strong> <span dir="auto">' . $noteHtml . '</span></td></tr>' : '';

    $text = "PERSIAN BAANOU SUPERMARKET\nNEW BREAD REQUEST\nReference: {$order['id']}\nReceived: $date (Vancouver time)\n\nCUSTOMER\n{$order['name']}\n{$order['phone']}\n\nBREAD SELECTION\n" . implode("\n", $textLines) . "\nBread subtotal: $subtotal\n\nFULFILMENT\n$method\n$location\nPreferred time: {$order['time']} (not yet confirmed)\n\nNOTES\n$note\n\n$paymentNotice Confirm availability, timing, applicable taxes and delivery charges with the customer.\nCustomer consented to sharing details for this request.\nStore: (604) 544-0046 · Open daily 8:30 am–10 pm, Vancouver time.";
    $html = <<<HTML
<!doctype html><html lang="en-CA"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baanou order $id</title></head>
<body style="margin:0;padding:0;background:#fffaf2;font-family:Arial,Helvetica,sans-serif;color:#452b20;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 8px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #ebd7bc;border-radius:8px;overflow:hidden;">
<tr><td style="padding:13px 16px;background:#fff0d8;border-bottom:1px solid #ebd7bc;"><strong style="font-size:17px;">Baanou · New bread request</strong><div style="font-size:10px;color:#856e5f;margin-top:3px;">$dateHtml · Vancouver time</div></td></tr>
<tr><td style="padding:11px 16px 8px;font-size:12px;line-height:1.7;"><strong>Reference:</strong> <span style="font-family:monospace;font-size:14px;color:#a23e1f;" dir="auto">$id</span><br><strong dir="auto">$name</strong> &nbsp; · &nbsp; <a href="tel:$phone" style="color:#a23e1f;white-space:nowrap;">$phone</a></td></tr>
<tr><td style="padding:2px 16px 10px;"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><thead><tr style="background:#fff5e6;"><th align="left" style="padding:7px 6px;font-size:11px;font-weight:normal;">Bread</th><th align="center" style="padding:7px 6px;font-size:11px;font-weight:normal;">Qty</th><th align="right" style="padding:7px 6px;font-size:11px;font-weight:normal;">Amount</th></tr></thead><tbody>$rows</tbody><tfoot><tr><th colspan="2" align="left" style="padding:10px 0 0;font-size:13px;">Bread subtotal</th><td align="right" style="padding:10px 0 0;color:#a23e1f;font-size:17px;font-weight:bold;white-space:nowrap;">$subtotal</td></tr></tfoot></table></td></tr>
<tr><td style="padding:10px 16px;border-top:1px solid #ecdfcc;font-size:12px;line-height:1.6;"><strong>$method</strong><br><span dir="auto">$locationHtml</span><br><span style="color:#856e5f;">Preferred:</span> $time</td></tr>
$noteSection
<tr><td style="padding:10px 16px;background:#fff8ed;border-top:1px solid #ecdfcc;font-size:11px;line-height:1.7;"><strong>Contact the customer to confirm.</strong> $paymentHtml<br><span style="color:#856e5f;">Confirm availability, timing, any applicable taxes and delivery fee.</span></td></tr>
<tr><td style="padding:9px 16px;font-size:10px;line-height:1.7;color:#856e5f;">$storeNameHtml · <a href="tel:$storeTel" style="color:#856e5f;">$storePhoneHtml</a><br>Daily 8:30 am–10 pm · <a href="https://naan.azenith.ca/" style="color:#a23e1f;">naan.azenith.ca</a></td></tr>
</table></td></tr></table></body></html>
HTML;
    $boundary = 'baanou_' . bin2hex(random_bytes(16));
    $body = '--' . $boundary . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text), 76, "\r\n") . '--' . $boundary . "\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html), 76, "\r\n") . '--' . $boundary . "--\r\n";
    $subject = 'Persian Baanou | Bread request #' . $order['id'];
    return ['html'=>$html, 'text'=>$text, 'body'=>$body, 'subject'=>email_subject($subject), 'headers'=>['From'=>'Persian Baanou Supermarket <orders@naan.azenith.ca>', 'MIME-Version'=>'1.0', 'Content-Type'=>'multipart/alternative; boundary="' . $boundary . '"']];
}
