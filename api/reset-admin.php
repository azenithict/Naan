<?php
declare(strict_types=1);

// Hosting-account recovery only. This script has no HTTP interface.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function baanou_reset_admin(string $directory, string $username, string $password): void
{
    if (!preg_match('/^[a-zA-Z0-9_.-]{3,32}$/D', $username) || strlen($password) < 4 || strlen($password) > 200 || trim($password) !== $password) {
        throw new RuntimeException('Use a valid username and a password of 4–200 characters.');
    }
    $directory = realpath($directory) ?: '';
    $webRoot = realpath(dirname(__DIR__));
    if ($directory === '' || strpos($directory . '/', $webRoot . '/') === 0 || !is_file($directory . '/shop.json')) {
        throw new RuntimeException('An existing private shop store outside the website is required.');
    }
    $lock = fopen($directory . '/shop.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Could not lock the shop store.');
    }
    chmod($directory . '/shop.lock', 0600);
    $temporary = '';
    try {
        $path = $directory . '/shop.json';
        $data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $admins = array_keys(array_filter($data['auth'] ?? [], static function ($account) { return $account['role'] === 'admin'; }));
        if (count($admins) !== 1) {
            throw new RuntimeException('Expected exactly one existing administrator. No account was created.');
        }
        $index = $admins[0];
        foreach ($data['auth'] as $i => $account) {
            if ($i !== $index && strcasecmp($account['username'], $username) === 0) {
                throw new RuntimeException('That username belongs to another account.');
            }
        }
        $data['auth'][$index]['username'] = $username;
        $data['auth'][$index]['password'] = password_hash($password, PASSWORD_DEFAULT);
        $data['auth'][$index]['version']++;
        $data['revision']++;
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $temporary = tempnam($directory, '.admin-reset-');
        if ($temporary === false || !chmod($temporary, 0600) || file_put_contents($temporary, $json) !== strlen($json) || !rename($temporary, $path)) {
            throw new RuntimeException('Could not commit the reset.');
        }
        $temporary = '';
    } finally {
        if ($temporary && is_file($temporary)) unlink($temporary);
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        $options = getopt('', ['username:']);
        $username = $options['username'] ?? '';
        if ($username === '') throw new RuntimeException('Usage: php api/reset-admin.php --username=admin < private-password-file');
        $password = rtrim(stream_get_contents(STDIN), "\r\n");
        baanou_reset_admin(getenv('BAANOU_DATA_DIR') ?: dirname(__DIR__, 2) . '/.baanou-data', $username, $password);
        echo "Administrator updated. Previous admin sessions are revoked.\n";
    } catch (Throwable $error) {
        fwrite(STDERR, $error->getMessage() . "\n");
        exit(1);
    }
}
