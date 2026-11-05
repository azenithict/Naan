<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if($_SERVER['REQUEST_METHOD']==='GET'){http_response_code(405);echo json_encode(['error'=>'Method not allowed.']);exit;}
http_response_code(410);
echo json_encode(['error'=>'The ordering page has been updated. Please reload to choose a baking time.']);
