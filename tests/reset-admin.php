<?php
declare(strict_types=1);
require __DIR__ . '/../api/shop-core.php';
require __DIR__ . '/../api/reset-admin.php';

$directory = sys_get_temp_dir() . '/baanou-admin-test-' . bin2hex(random_bytes(8));
mkdir($directory, 0700);
try {
    $data = shop_seed();
    $admin = ['csrf' => 'test', 'ip' => 'fixture'];
    shop_action($data, $admin, 'setup', ['token' => 'fixture-token', 'password' => 'Fixture-Old-Password!'], 'fixture-token');
    shop_action($data, $admin, 'staffCreate', ['username' => 'fixturestaff', 'password' => 'Fixture-Staff-Password!']);
    $before = $data;
    file_put_contents($directory . '/shop.json', json_encode($data));
    baanou_reset_admin($directory, 'admin', '2468');
    $after = json_decode(file_get_contents($directory . '/shop.json'), true);
    if ($after['auth'][0]['id'] !== $before['auth'][0]['id'] || $after['auth'][0]['version'] !== $before['auth'][0]['version'] + 1 || $after['auth'][1] !== $before['auth'][1]) throw new RuntimeException('Account identity/staff changed.');
    if (shop_actor($after, $admin) !== null) throw new RuntimeException('Old admin session still authorized.');
    $login = ['csrf' => 'test', 'ip' => 'fixture'];
    shop_action($after, $login, 'login', ['username' => 'admin', 'password' => '2468']);
    if (shop_actor($after, $login)['role'] !== 'admin') throw new RuntimeException('New password did not authorize admin.');
    unset($after['auth'], $before['auth'], $after['revision'], $before['revision'], $after['attempts'], $before['attempts']);
    if ($after !== $before) throw new RuntimeException('Other shop records changed.');
    $saved = file_get_contents($directory . '/shop.json');
    foreach ([['fixturestaff', '2468'], ['admin', ' 2468 ']] as $invalid) {
        $rejected = false;
        try { baanou_reset_admin($directory, $invalid[0], $invalid[1]); }
        catch (RuntimeException $error) { $rejected = true; }
        if (!$rejected) throw new RuntimeException('Expected invalid reset to be rejected.');
    }
    if (file_get_contents($directory . '/shop.json') !== $saved) throw new RuntimeException('Rejected reset changed data.');
    if ((fileperms($directory . '/shop.json') & 0777) !== 0600) throw new RuntimeException('Private store permissions changed.');
    echo "PASS: CLI-only admin reset, hashed login, session revocation, username conflict and preserved shop records.\n";
} finally {
    foreach (glob($directory . '/*') as $path) unlink($path);
    rmdir($directory);
}
