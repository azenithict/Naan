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
    $location = $delivery ? $order['address'] . "\n" . $order['postal'] : "Persian Baanou Supermarket\n220 6th St, New Westminster, BC V3L 3A2";
    $note = $order['note'] !== '' ? $order['note'] : 'No additional notes.';
    $rows = '';
    $textLines = [];
    foreach ($order['items'] as $item) {
        $rows .= '<tr><td style="padding:16px 10px 16px 0;border-bottom:1px solid #e4e3da;font-size:14px;line-height:1.6;color:#2d352b;">' . $e($item['name']) . '</td><td align="center" style="padding:16px 8px;border-bottom:1px solid #e4e3da;font-size:14px;">' . $item['quantity'] . '</td><td align="right" style="padding:16px 0 16px 8px;border-bottom:1px solid #e4e3da;font-size:14px;white-space:nowrap;">' . $money($item['unitPriceCents'] * $item['quantity']) . '<br><span style="font-size:11px;color:#74776b;">' . $money($item['unitPriceCents']) . ' each</span></td></tr>';
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
    $text = "PERSIAN BAANOU SUPERMARKET\nNEW BREAD REQUEST\nReference: {$order['id']}\nReceived: $date (Vancouver time)\n\nCUSTOMER\n{$order['name']}\n{$order['phone']}\n\nBREAD SELECTION\n" . implode("\n", $textLines) . "\nBread subtotal: $subtotal\n\nFULFILMENT\n$method\n$location\nPreferred time: {$order['time']} (not yet confirmed)\n\nNOTES\n$note\n\nNo payment taken. Confirm availability, timing, applicable taxes and delivery charges with the customer.\nCustomer consented to sharing details for this request.\nStore: (604) 544-0046 · Open daily 8:30 am–10 pm, Vancouver time.";
    $html = <<<HTML
<!doctype html><html lang="en-CA"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baanou bread request $id</title></head>
<body style="margin:0;padding:0;background:#f3f0e9;font-family:Arial,Helvetica,sans-serif;color:#2d352b;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">New bread request from $name · $subtotal · $id</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e9;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fffdf8;border:1px solid #e1dfd4;border-radius:12px;overflow:hidden;">
<tr><td style="background:#384b39;padding:27px 28px;color:#fff9e9;"><div style="font-family:Georgia,serif;font-size:35px;letter-spacing:-1px;">baanou</div><div style="font-size:10px;letter-spacing:1.7px;margin-top:7px;">PERSIAN BAANOU SUPERMARKET</div></td></tr>
<tr><td style="padding:28px 28px 20px;"><div style="font-size:11px;letter-spacing:1.4px;color:#a0472e;font-weight:bold;">NEW BREAD REQUEST</div><h1 style="font-family:Georgia,serif;font-size:29px;line-height:1.2;font-weight:normal;margin:12px 0 17px;">A new order for your table.</h1><div style="background:#f2eee3;border:1px solid #e4dfd1;padding:15px 17px;border-radius:6px;"><div style="font-size:10px;letter-spacing:1px;color:#707365;">REFERENCE NUMBER</div><div style="font-size:20px;font-weight:bold;letter-spacing:1px;margin-top:6px;overflow-wrap:anywhere;" dir="auto">$id</div><div style="font-size:12px;color:#707365;margin-top:7px;">$dateHtml · Vancouver time</div></div></td></tr>
<tr><td style="padding:5px 28px 24px;"><div style="font-size:11px;letter-spacing:1px;color:#707365;margin-bottom:10px;">CUSTOMER</div><div style="font-size:19px;line-height:1.5;" dir="auto">$name</div><a href="tel:$phone" style="display:inline-block;color:#a0472e;font-size:17px;margin-top:6px;text-decoration:underline;">$phone</a></td></tr>
<tr><td style="padding:0 28px 25px;"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><caption style="text-align:left;font-size:11px;letter-spacing:1px;color:#707365;padding-bottom:13px;">BREAD SELECTION</caption><thead><tr style="background:#eef0e6;"><th align="left" style="font-size:11px;padding:10px 8px;font-weight:normal;">Bread</th><th align="center" style="font-size:11px;padding:10px 8px;font-weight:normal;">Qty</th><th align="right" style="font-size:11px;padding:10px 8px;font-weight:normal;">Amount</th></tr></thead><tbody>$rows</tbody><tfoot><tr><th colspan="2" align="left" style="padding:20px 0 4px;font-size:14px;">Bread subtotal</th><td align="right" style="padding:20px 0 4px;font-size:23px;font-weight:bold;color:#a0472e;white-space:nowrap;">$subtotal</td></tr></tfoot></table><p style="font-size:11px;color:#707365;line-height:1.7;margin:9px 0 0;">Any applicable taxes and delivery charges are confirmed separately.</p></td></tr>
<tr><td style="padding:0 28px 24px;"><div style="border-top:1px solid #e4e3da;padding-top:21px;"><div style="font-size:11px;letter-spacing:1px;color:#707365;">FULFILMENT</div><h2 style="font-size:17px;margin:11px 0;font-weight:bold;">$method</h2><p style="font-size:14px;line-height:1.8;margin:0;" dir="auto">$locationHtml</p><p style="font-size:12px;line-height:1.8;margin:12px 0 0;"><strong>Preferred time:</strong> $time<br><span style="color:#707365;">Please confirm this time with the customer.</span></p></div></td></tr>
<tr><td style="padding:0 28px 25px;"><div style="background:#f5f1e8;padding:16px 18px;border-radius:6px;"><div style="font-size:10px;letter-spacing:1px;color:#707365;margin-bottom:9px;">CUSTOMER NOTE</div><div style="font-size:14px;line-height:1.8;" dir="auto">$noteHtml</div></div></td></tr>
<tr><td style="padding:0 28px 28px;"><div style="background:#edf1e7;border-left:3px solid #71855d;padding:15px 17px;font-size:12px;line-height:1.9;"><strong>Next step: contact the customer.</strong><br>Confirm availability, pickup or delivery timing, and the final amount. No payment has been taken.<br><span style="font-size:11px;color:#707365;">The customer agreed to share these details for this request.</span></div></td></tr>
<tr><td style="padding:20px 28px;background:#f4f1e9;border-top:1px solid #e4e3da;font-size:11px;line-height:1.9;color:#707365;"><strong style="color:#384b39;">Persian Baanou Supermarket</strong><br>220 6th St, New Westminster, BC V3L 3A2<br><a href="tel:+16045440046" style="color:#384b39;">(604) 544-0046</a> · Daily 8:30 a.m.–10 p.m.<br><a href="https://naan.azenith.ca/" style="color:#a0472e;">naan.azenith.ca</a></td></tr>
</table></td></tr></table></body></html>
HTML;
    $boundary = 'baanou_' . bin2hex(random_bytes(16));
    $body = '--' . $boundary . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text), 76, "\r\n") . '--' . $boundary . "\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html), 76, "\r\n") . '--' . $boundary . "--\r\n";
    $subject = 'Persian Baanou | Bread request #' . $order['id'];
    return ['html'=>$html, 'text'=>$text, 'body'=>$body, 'subject'=>email_subject($subject), 'headers'=>['From'=>'Persian Baanou Supermarket <orders@naan.azenith.ca>', 'MIME-Version'=>'1.0', 'Content-Type'=>'multipart/alternative; boundary="' . $boundary . '"']];
}
