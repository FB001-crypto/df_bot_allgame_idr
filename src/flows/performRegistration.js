import { RateLimiterMemory } from 'rate-limiter-flexible';
import { registerOnDealerFoxy } from '../services/dealerFoxy.js';
import { generateUsername, generatePassword } from '../utils/generators.js';
import { REG_GLOBAL_POINTS, REG_GLOBAL_DURATION, REG_MAX_CONCURRENCY, REG_PER_USER_POINTS, REG_PER_USER_DURATION } from '../config.js';

// 全局限流：每分钟最多 N 次注册尝试（默认 120/min）
const globalLimiter = new RateLimiterMemory({ points: REG_GLOBAL_POINTS, duration: REG_GLOBAL_DURATION });

// 简易并发信号量（不引入新依赖）
let inflight = 0;
const waiters = [];
async function acquire() {
  if (inflight < REG_MAX_CONCURRENCY) { inflight += 1; return; }
  await new Promise(res => waiters.push(res)); inflight += 1;
}
function release() {
  inflight = Math.max(0, inflight - 1);
  const next = waiters.shift(); if (next) next();
}


// 每用户速率限制：每用户每分钟最多 N 次（默认 3/min）
const rateLimiter = new RateLimiterMemory({ points: REG_PER_USER_POINTS, duration: REG_PER_USER_DURATION });

export async function performRegistration(store, userId) {
  if (store.isRegistered(userId)) {
    const rec = store.get(userId);
    return { code: 'already_registered', username: rec.username };
  }

  // 全局限流（温和）：超出则提示稍后再试
  try { await globalLimiter.consume('global'); } catch { return { code: 'rate_limited', message: 'Sistem sibuk, coba lagi nanti' }; }

  // 并发信号量：限制同时进行的注册调用数量
  await acquire();
  try {
    // 每用户限流（分钟级）
    try { await rateLimiter.consume(userId); } catch { return { code: 'rate_limited' }; }

    const maxAttempts = 5;
    let lastErr = null;
    const attempted = new Set();
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let username = generateUsername();
      let guard = 0;
      while ((attempted.has(username) || store.isUsernameTaken(username)) && guard < 10) {
        username = generateUsername();
        guard += 1;
      }
      attempted.add(username);
      const password = generatePassword();
      try {
        const res = await registerOnDealerFoxy({ username, password, deviceId: userId });
        if (res.ok) {
          await store.add(userId, { username, password, createdAt: new Date().toISOString() });
          return { code: 'success', username, password };
        }
        const msg = String(res.message || '').toLowerCase();
        const shouldRetry = res.status === 409 || msg.includes('exist') || msg.includes('terpakai') || msg.includes('taken');
        if (!shouldRetry) { lastErr = new Error(`Pendaftaran gagal: ${res.message || 'Kesalahan tidak diketahui'}`); break; }
        // 随机退避 50–150ms
        await new Promise(r => setTimeout(r, 50 + Math.floor(Math.random()*100)));
        lastErr = new Error(`Konflik username, mencoba lagi (${attempt}/${maxAttempts})`);
      } catch (err) { lastErr = err; }
    }

    return { code: 'failed', error: lastErr ? String(lastErr.message || lastErr) : 'Kesalahan tidak diketahui' };
  } finally {
    release();
  }
}

