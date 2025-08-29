import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import crypto from 'crypto';

import {
  TELEGRAM_BOT_TOKEN, PORT, LOGIN_URL, MAIN_SITE_URL,
  ONE_TAP_TTL_SEC, ONE_TAP_SECRET, REGISTERED_FILE, DEALERFOXY_LOGIN_API, REG_COOLDOWN_MS,
} from './config.js';
import { RegistrationStore } from './store/registrationStore.js';
import { performRegistration } from './flows/performRegistration.js';
import { createIsUserInRequiredChats, buildRegisteredMessageRows } from './bot/handlers.js';
import { loginOnDealerFoxy } from './services/dealerFoxy.js';
import { createMsgFunnel } from './utils/msgFunnel.js';
import { DelayedPushService } from './services/delayedPush.js';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Variabel lingkungan TELEGRAM_BOT_TOKEN tidak ditemukan');
  process.exit(1);
}






async function main() {
  const store = new RegistrationStore(REGISTERED_FILE);
  await store.init();

  const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
  const funnel = createMsgFunnel(bot, { globalPerSec: 25, perChatPerSec: 1 });
  const delayedPushService = new DelayedPushService(bot);

  function buildHomeKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('Daftar', 'register')],
    ]);
  }

  // 构建主站 Fragment（tgToken 放在 URL 片段中）
  function buildFragmentUrl(token, username){
    try {
      const base = String(MAIN_SITE_URL || '').split('#')[0];
      if (!token) return '';
      // 在主站URL中添加语言参数
      const baseWithLang = base.includes('?') ? `${base}&lang=id` : `${base}?lang=id`;
      const hash = `tgToken=${encodeURIComponent(token)}${username?`&username=${encodeURIComponent(username)}`:''}`;
      return `${baseWithLang}#${hash}`;
    } catch { return ''; }
  }
  function extractToken(data){
    return (data && (data.token || data.access_token || data.accessToken || (data.data && (data.data.token || data.data.access_token)))) || '';
  }
  const tokenCache = new Map(); // uid -> { token, at }
  const TOKEN_TTL_MS = 5 * 60 * 1000; // 5分钟
  function getCachedToken(uid){
    const rec = tokenCache.get(uid);
    if (!rec) return '';
    if (Date.now() - rec.at > TOKEN_TTL_MS) { tokenCache.delete(uid); return ''; }
    return rec.token || '';
  }
  function setCachedToken(uid, token){ tokenCache.set(uid, { token, at: Date.now() }); }

  async function buildFragmentLinkFromCreds({ username, password, deviceId }){
    try {
      const cached = getCachedToken(String(deviceId));
      if (cached) return buildFragmentUrl(cached, username);
      const r = await loginOnDealerFoxy({ username, password, deviceId });
      if (r && r.ok) {
        const token = extractToken(r.data);
        if (token) { setCachedToken(String(deviceId), token); return buildFragmentUrl(token, username); }
      }
    } catch(e) { /* ignore */ }
    return '';
  }
  async function buildFragmentLinkForUser(userId){
    const rec = store.get(String(userId));
    if (!rec) return '';
    return buildFragmentLinkFromCreds({ username: rec.username, password: rec.password, deviceId: userId });
  }


  const isUserInRequiredChats = createIsUserInRequiredChats(bot.telegram);


  // 轻量防抖：同 UID 短冷却 + 并发互斥
  const lastRegisterAt = new Map(); // uid -> ts
  const inFlight = new Set(); // uid set

  async function handleRegister(ctx) {
    const from = ctx.from;
    const userId = String(from.id);

    // 短冷却 + 并发互斥：避免“疯狂点击”
    const now = Date.now();
    const last = lastRegisterAt.get(userId) || 0;
    if (now - last < REG_COOLDOWN_MS) {
      try { await ctx.answerCbQuery('Memproses, mohon tunggu...'); } catch {}
      return;
    }
    if (inFlight.has(userId)) {
      try { await ctx.answerCbQuery('Memproses, mohon tunggu...'); } catch {}
      return;
    }
    lastRegisterAt.set(userId, now);
    inFlight.add(userId);

    const allowed = await isUserInRequiredChats(userId);
    if (!allowed) {
      if ('answerCbQuery' in ctx) {
        try { await ctx.answerCbQuery('Harap gabung ke grup/kanal dulu'); } catch {}
      }
      inFlight.delete(userId);
      return funnel.reply(ctx, 'Gabung ke grup/kanal yang diwajibkan, lalu coba lagi.');
    }
    const result = await performRegistration(store, userId);
    try {
      if (result.code === 'already_registered') {
        if ('answerCbQuery' in ctx) {
          try { await ctx.answerCbQuery('Sudah terdaftar'); } catch {}
        }
        const rec2 = store.get(userId);
        const msg = [
          'Anda sudah terdaftar.',
          `Username: <code>${rec2?.username || '-'}</code>`,
          '',
          '👇👇Silakan pilih operasi menu',
        ].join('\n');
        const fragmentLink = await buildFragmentLinkForUser(userId);
        const rows = buildRegisteredMessageRows(userId, fragmentLink);
        
        // 为已注册用户也安排延时推送教程菜单
        delayedPushService.schedulePush(userId);
        
        return funnel.reply(ctx, msg, { parse_mode: 'HTML', disable_web_page_preview: true, ...Markup.inlineKeyboard(rows) });
      }
      if (result.code === 'rate_limited') {
        if ('answerCbQuery' in ctx) {
          try { await ctx.answerCbQuery('Terlalu sering, coba lagi nanti.'); } catch {}
        }
        return funnel.reply(ctx, 'Terlalu sering, coba lagi nanti.');
      }
      if (result.code === 'success') {
        if ('answerCbQuery' in ctx) {
          try { await ctx.answerCbQuery('Berhasil'); } catch {}
        }
        const userId = String(ctx.from.id);
        const successMsg = [
          'Pendaftaran berhasil!',
          `Username: <code>${result.username}</code>`,
          `Kata sandi: <tg-spoiler>${result.password}</tg-spoiler>`,
          '',
          `👇👇Silakan pilih operasi menu`,
        ].join('\n');
        const fragmentLink2 = await buildFragmentLinkForUser(userId);
        
        // 安排延时推送教程菜单
        delayedPushService.schedulePush(userId);
        
        return funnel.reply(ctx, successMsg, { parse_mode: 'HTML', disable_web_page_preview: true, ...Markup.inlineKeyboard(buildRegisteredMessageRows(userId, fragmentLink2)) });
      }
      if ('answerCbQuery' in ctx) {
        try { await ctx.answerCbQuery('Gagal mendaftar'); } catch {}
      }
      console.error('Gagal mendaftar:', result.error);
      return funnel.reply(ctx, 'Pendaftaran gagal, coba lagi nanti.');
    } finally {
      inFlight.delete(userId);
    }
  }

  bot.start(async (ctx) => {
    const from = ctx.from;
    const userId = String(from.id);
    if (store.isRegistered(userId)) {
      const rec = store.get(userId);
      await ctx.reply(`Selamat datang kembali!\nSudah terdaftar. Username: ${rec.username}`);
      return;
    }
    await ctx.reply(
      'Selamat datang! Klik tombol "Daftar" di bawah.',
      buildHomeKeyboard(),
    );
  });

  bot.command('register', handleRegister);
  bot.action('register', handleRegister);


  // 展示用户名/密码：仅允许本人触发（Monospace 便于长按复制）
  bot.action(/^su\|(\d+)$/, async (ctx) => {
    try { await ctx.answerCbQuery('Username ditampilkan'); } catch {}
    const [, uid] = ctx.match;
    if (String(ctx.from.id) !== String(uid)) return;
    const rec = store.get(String(uid));
    if (!rec) return;
    return funnel.reply(ctx, `Username: <code>${rec.username}</code>`, { parse_mode: 'HTML' });
  });

  bot.action(/^sp\|(\d+)$/, async (ctx) => {
    try { await ctx.answerCbQuery('Kata sandi ditampilkan'); } catch {}
    const [, uid] = ctx.match;
    if (String(ctx.from.id) !== String(uid)) return;
    const rec = store.get(String(uid));
    if (!rec) return;
    return funnel.reply(ctx, `Kata sandi: <code>${rec.password}</code>`, { parse_mode: 'HTML' });
  });

  // 处理教程相关回调
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('tutorial_')) {
      await delayedPushService.handleTutorialCallback(ctx);
      return;
    }
  });

  bot.catch(async (err, ctx) => {
    console.error('Bot 发生错误:', err);
    try { await funnel.reply(ctx, 'Terjadi kesalahan, coba lagi nanti.'); } catch {}
  });

  // 进程信号处理
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  // 健康检查（可用于保活/探针）
  const app = express();
  app.use(express.json());

  // 本地开发测试端点：无需 Telegram，也能模拟注册流程
  app.get('/dev/register', async (req, res) => {
    const userIdRaw = req.query.userId;
    const userId = userIdRaw ? String(userIdRaw) : '';
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'Parameter userId wajib. Contoh: /dev/register?userId=123456' });
    }

    const result = await performRegistration(store, userId);
    if (result.code === 'already_registered') {
      return res.status(409).json({ ok: false, message: 'Sudah terdaftar, tidak bisa daftar lagi', username: result.username });
    }
    if (result.code === 'rate_limited') {
      return res.status(429).json({ ok: false, message: 'Terlalu sering: maks 3x/menit' });
    }
    if (result.code === 'success') {
      return res.json({ ok: true, username: result.username, password: result.password });
    }
    return res.status(500).json({ ok: false, message: 'Pendaftaran gagal, coba lagi nanti' });
  });

  // 方案一：中转页（iframe 隐藏提交）
  app.get('/one-tap-login', async (req, res) => {
    const uid = String(req.query.uid || '');
    const ts = String(req.query.ts || '');
    const sig = String(req.query.sig || '');

    if (!uid || !ts || !sig || !ONE_TAP_SECRET) return res.status(400).send('Bad Request');
    const now = Date.now();
    if (Math.abs(now - Number(ts)) > ONE_TAP_TTL_SEC * 1000) return res.status(400).send('Tautan kedaluwarsa');
    const expected = (function(){ const h = crypto.createHmac('sha256', ONE_TAP_SECRET); h.update(`${uid}.${ts}`); return h.digest('hex'); })();
    const a = Buffer.from(sig); const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).send('Tanda tangan tidak valid');

    const rec = store.get(uid);
    if (!rec) return res.status(404).send('Pengguna tidak ditemukan');

    // 用户访问外链时触发延时推送教程
    delayedPushService.schedulePush(uid);

    const action = DEALERFOXY_LOGIN_API;
    const redirectUrl = MAIN_SITE_URL;

    const { renderIFrameLoginPage } = await import('./server/templates.js');
    const html = renderIFrameLoginPage({ action, rec, uid, redirectUrl });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(html);
  });

  // 方案二：顶级 POST 提交（target=_self）
  app.get('/first-party-login', async (req, res) => {
    const uid = String(req.query.uid || '');
    const ts = String(req.query.ts || '');
    const sig = String(req.query.sig || '');
    if (!uid || !ts || !sig || !ONE_TAP_SECRET) return res.status(400).send('Permintaan tidak valid');

    const now = Date.now();
    if (Math.abs(now - Number(ts)) > ONE_TAP_TTL_SEC * 1000) return res.status(400).send('Tautan kedaluwarsa');
    const expected = (function(){ const h = crypto.createHmac('sha256', ONE_TAP_SECRET); h.update(`${uid}.${ts}`); return h.digest('hex'); })();
    const a = Buffer.from(sig); const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).send('Tanda tangan tidak valid');

    const rec = store.get(uid);
    if (!rec) return res.status(404).send('Pengguna tidak ditemukan');

    // 用户访问外链时触发延时推送教程
    delayedPushService.schedulePush(uid);

    const action = DEALERFOXY_LOGIN_API;
    const { renderFirstPartyLoginPage } = await import('./server/templates.js');
    const html = renderFirstPartyLoginPage({ action, rec, uid });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(html);
  });

  app.get('/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
  app.listen(PORT, () => console.log(`Health server listening on :${PORT}`));

  try { await bot.telegram.deleteWebhook({ drop_pending_updates: true }); } catch {}
  await bot.launch();
  console.log('Bot Telegram berjalan');
}

main().catch((err) => {
  console.error('Gagal mulai:', err);
  process.exit(1);
});


