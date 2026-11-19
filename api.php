<?php
/**
 * ═══════════════════════════════════════════════════════════════
 *  api.php — بک‌اند سایت رزومه (PHP ≥ 7.4) — هاست لینوکس / سی‌پنل
 * ═══════════════════════════════════════════════════════════════
 *  امنیت:
 *    • رمز مدیر هیچ‌جای کد وجود ندارد. بار اول که پنل را باز کنی،
 *      فرم «تعیین رمز» می‌آید و hash رمز با password_hash در
 *      data/config.json ذخیره می‌شود (پوشه‌ی data با .htaccess
 *      از دسترسی مستقیم وب مسدود است).
 *    • نشست PHP با کوکی HttpOnly/SameSite=Lax و session_regenerate_id
 *    • محافظت CSRF: درخواست‌های POST باید هدر X-Requested-With بفرستند
 *      (فرانت خودش این کار را می‌کند)
 *    • قفل تلاش: بعد از ۵ رمز اشتباه، ۱۰ دقیقه قفل (سمت سرور)
 *
 *  اکشن‌ها:
 *    GET  api.php?action=ping    → چک سلامت + وضعیت (فرانت با این می‌فهمد بک‌اند هست)
 *    GET  api.php?action=auth    → وضعیت نشست ادمین + needsSetup
 *    POST api.php?action=setup   → ساخت رمز مدیر (فقط بار اول) {pass}
 *    POST api.php?action=login   → ورود {pass}
 *    POST api.php?action=logout  → خروج
 *    GET  api.php?action=load    → محتوای عمومی سایت
 *    POST api.php?action=track   → ثبت یک بازدید (عمومی)
 *    GET  api.php?action=stats   → آمار بازدید (فقط ادمین)
 *    POST api.php?action=save    → ذخیره محتوا (فقط ادمین)
 *
 *  نصب: همه‌ی فایل‌ها را در public_html بگذار؛ پوشه‌ی data باید
 *  قابل نوشتن باشد (پیش‌فرض سی‌پنل معمولاً کافی است؛ وگرنه ۷۵۵).
 * ═══════════════════════════════════════════════════════════════
 */

declare(strict_types=1);

const DATA_DIR    = __DIR__ . '/data';
const DATA_FILE   = DATA_DIR . '/data.json';
const CONFIG_FILE = DATA_DIR . '/config.json';
const MAX_BODY    = 2000000; // 2MB
const MAX_TRIES   = 5;       // حداکثر تلاش ناموفق قبل از قفل
const LOCK_SEC    = 600;     // مدت قفل (ثانیه)

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $d, int $code = 200): void {
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input');
    if ($raw !== false && strlen($raw) > MAX_BODY) out(['ok' => false, 'error' => 'payload_too_large'], 413);
    $j = json_decode((string)$raw, true);
    return is_array($j) ? $j : [];
}

/** محافظت CSRF — همه‌ی POSTها باید هدر X-Requested-With داشته باشند */
function require_xhr(): void {
    $h = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if (!hash_equals('fetch', (string)$h)) out(['ok' => false, 'error' => 'bad_request'], 403);
}

/** ساخت پوشه‌ی data + .htaccess مسدودکننده (اگر نبود) */
function ensure_data_dir(): void {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
    $ht = DATA_DIR . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
    }
}

/* ── config.json: hash رمز + شمارنده‌ی تلاش‌های ناموفق ── */
function loadConfig(): array {
    if (!is_file(CONFIG_FILE)) return [];
    $j = json_decode((string)file_get_contents(CONFIG_FILE), true);
    return is_array($j) ? $j : [];
}
function saveConfig(array $c): bool {
    ensure_data_dir();
    $tmp = CONFIG_FILE . '.tmp';
    if (file_put_contents($tmp, json_encode($c, JSON_UNESCAPED_UNICODE), LOCK_EX) === false) return false;
    return rename($tmp, CONFIG_FILE);
}
function lockRemaining(array $c): int {
    $fails = (int)($c['fails'] ?? 0);
    $last  = (int)($c['lastFail'] ?? 0);
    if ($fails < MAX_TRIES) return 0;
    $left = ($last + LOCK_SEC) - time();
    return $left > 0 ? $left : 0;
}
function is_admin(): bool {
    return ($_SESSION['admin'] ?? false) === true;
}

/* ── data.json: محتوای عمومی سایت ── */
function loadDb(): array {
    if (!is_file(DATA_FILE)) {
        return ['_v' => 2, 'projects' => null, 'skills' => null, 'timeline' => null,
                'texts' => [], 'avail' => 'open', 'accent' => 0,
                'siteName' => 'mahdi dev', 'visits' => []];
    }
    $j = json_decode((string)file_get_contents(DATA_FILE), true);
    return is_array($j) ? $j : [];
}
function saveDb(array $db): bool {
    ensure_data_dir();
    $tmp = DATA_FILE . '.tmp';
    if (file_put_contents($tmp, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) return false;
    return rename($tmp, DATA_FILE);
}

/* ── مسیریابی ── */
$action  = $_GET['action'] ?? 'ping';
$method  = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$needsSetup = !isset(loadConfig()['hash']);
$isPost  = $method === 'POST';
if ($isPost) require_xhr();

switch ($action) {

    case 'ping':
        out(['ok' => true, 'api' => true, 'v' => 3, 'auth' => is_admin(),
             'needsSetup' => $needsSetup, 'time' => date('c')]);

    case 'auth':
        $c = loadConfig();
        out(['ok' => true, 'auth' => is_admin(), 'needsSetup' => $needsSetup,
             'lock' => is_admin() ? 0 : lockRemaining($c)]);

    case 'setup': { /* ساخت رمز مدیر — فقط قبل از اولین ساخت */
        if (!$needsSetup) out(['ok' => false, 'error' => 'already_setup'], 409);
        $pass = (string)(body()['pass'] ?? '');
        if (strlen($pass) < 8) out(['ok' => false, 'error' => 'weak_password'], 400);
        $c = ['hash' => password_hash($pass, PASSWORD_DEFAULT), 'fails' => 0, 'lastFail' => 0];
        if (!saveConfig($c)) out(['ok' => false, 'error' => 'write_failed — پوشه‌ی data قابل نوشتن نیست؟'], 500);
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        out(['ok' => true, 'auth' => true]);
    }

    case 'login': {
        $c = loadConfig();
        $lock = lockRemaining($c);
        if ($lock > 0) out(['ok' => false, 'error' => 'locked', 'lock' => $lock], 429);
        if (!isset($c['hash'])) out(['ok' => false, 'error' => 'needs_setup'], 409);
        $pass = (string)(body()['pass'] ?? '');
        if ($pass !== '' && password_verify($pass, $c['hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            $c['fails'] = 0; $c['lastFail'] = 0;
            saveConfig($c);
            out(['ok' => true, 'auth' => true]);
        }
        usleep(400000); // کند کردن brute-force
        $c['fails']    = (int)($c['fails'] ?? 0) + 1;
        $c['lastFail'] = time();
        saveConfig($c);
        $left = max(0, MAX_TRIES - (int)$c['fails']);
        out(['ok' => false, 'error' => 'bad_credentials', 'left' => $left], 401);
    }

    case 'logout':
        $_SESSION = [];
        if (session_id() !== '') session_destroy();
        out(['ok' => true]);

    case 'load':
        $db = loadDb();
        unset($db['visits']); // آمار فقط برای ادمین
        out(['ok' => true, 'data' => $db]);

    case 'track':
        $db = loadDb();
        $t = date('Y-m-d');
        $db['visits'][$t] = (int)($db['visits'][$t] ?? 0) + 1;
        saveDb($db);
        out(['ok' => true]);

    case 'stats':
        if (!is_admin()) out(['ok' => false, 'error' => 'unauthorized'], 401);
        $db = loadDb();
        out(['ok' => true, 'visits' => is_array($db['visits'] ?? null) ? $db['visits'] : []]);

    case 'save': {
        if (!is_admin()) out(['ok' => false, 'error' => 'unauthorized'], 401);
        $b  = body();
        $db = loadDb();
        foreach (['projects', 'skills', 'timeline'] as $k) {
            if (array_key_exists($k, $b) && ($b[$k] === null || is_array($b[$k]))) {
                $db[$k] = $b[$k];
            }
        }
        if (isset($b['texts']) && is_array($b['texts'])) $db['texts'] = $b['texts'];
        foreach (['avail', 'siteName'] as $k) {
            if (isset($b[$k]) && is_string($b[$k]) && $b[$k] !== '') $db[$k] = $b[$k];
        }
        if (isset($b['accent']) && is_numeric($b['accent'])) $db['accent'] = (int)$b['accent'];
        if (!saveDb($db)) out(['ok' => false, 'error' => 'write_failed — پوشه‌ی data قابل نوشتن نیست؟'], 500);
        out(['ok' => true, 'saved_at' => date('c')]);
    }

    default:
        out(['ok' => false, 'error' => 'unknown_action'], 400);
}
