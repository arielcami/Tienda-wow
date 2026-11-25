// loginLimiter.js - Limita intentos fallidos de login sin bloquear cuentas para siempre.
// - Por cuenta: 5 fallos en 15 min -> esa cuenta queda en pausa 15 min.
// - Por IP: 20 fallos en 15 min -> esa IP queda en pausa 15 min (frena a quien prueba muchas cuentas).
// Se guarda en memoria: si reinicias el portal, los contadores se reinician.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 20;

const failures = new Map(); // clave -> { count, firstAt, blockedUntil }

function check(key, max) {
    const now = Date.now();
    const entry = failures.get(key);
    if (!entry) return { blocked: false };
    if (entry.blockedUntil && entry.blockedUntil > now) {
        return { blocked: true, retryInMin: Math.ceil((entry.blockedUntil - now) / 60000) };
    }
    if (now - entry.firstAt > WINDOW_MS) {
        failures.delete(key);
    }
    return { blocked: false };
}

function register(key, max) {
    const now = Date.now();
    let entry = failures.get(key);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
        entry = { count: 0, firstAt: now, blockedUntil: 0 };
    }
    entry.count += 1;
    if (entry.count >= max) {
        entry.blockedUntil = now + WINDOW_MS;
    }
    failures.set(key, entry);
}

export function isBlocked(username, ip) {
    const acc = check(`acc:${String(username).toLowerCase()}`, MAX_PER_ACCOUNT);
    if (acc.blocked) return acc;
    return check(`ip:${ip}`, MAX_PER_IP);
}

export function registerFailure(username, ip) {
    register(`acc:${String(username).toLowerCase()}`, MAX_PER_ACCOUNT);
    register(`ip:${ip}`, MAX_PER_IP);
}

export function registerSuccess(username) {
    failures.delete(`acc:${String(username).toLowerCase()}`);
}

// Limpieza periódica para que el mapa no crezca sin límite
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of failures) {
        if (now - entry.firstAt > WINDOW_MS && (!entry.blockedUntil || entry.blockedUntil < now)) {
            failures.delete(key);
        }
    }
}, WINDOW_MS).unref();
