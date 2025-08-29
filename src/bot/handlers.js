import { Markup } from 'telegraf';
import { REQUIRED_CHAT_IDS, MAIN_SITE_URL, MEMBERSHIP_CACHE_TTL_SEC, SHOW_TEST_LINKS } from '../config.js';
import { buildOneTapUrl, buildFirstPartyUrl } from '../utils/oneTap.js';

export function createIsUserInRequiredChats(telegram){
  const cache = new Map(); // key: `${chatId}:${userId}` -> { status, at }
  const POSITIVE = ['creator','administrator','member','restricted'];
  return async function isUserInRequiredChats(userId){
    if (!REQUIRED_CHAT_IDS.length) return true;
    const now = Date.now();
    for (const rawId of REQUIRED_CHAT_IDS) {
      const chatId = Number(String(rawId).trim());
      if (!Number.isFinite(chatId)) continue;
      const key = `${chatId}:${userId}`;
      const cached = cache.get(key);
      // 只缓存正面结果：命中正面缓存则直接放行；负面缓存一律忽略，转实时查询
      if (cached && now - cached.at < MEMBERSHIP_CACHE_TTL_SEC * 1000 && POSITIVE.includes(cached.status)) {
        return true;
      }
      try {
        const m = await telegram.getChatMember(chatId, userId);
        if (m && POSITIVE.includes(m.status)) {
          cache.set(key, { status: m.status, at: now });
          return true;
        }
        // 负面结果不缓存，下一次会再次实查，避免“刚加入却被判未加入”的体验问题
      } catch (err) {
        console.warn('[membership] getChatMember 失败', { rawId, userId, err: err?.message || err });
      }
    }
    return false;
  };
}

export function buildRegisteredMessageRows(userId, fragmentLink){
  const link1 = buildOneTapUrl(userId);
  const link2 = buildFirstPartyUrl(userId);
  const rows = [];
  // 优先提供主站 Fragment 一键进入
  rows.push([fragmentLink ? Markup.button.url('Masuk cepat', fragmentLink) : Markup.button.url('Beranda', MAIN_SITE_URL)]);
  if (SHOW_TEST_LINKS) {
    rows.push([link1 ? Markup.button.url('Tes login (iframe)', link1) : Markup.button.url('Beranda', MAIN_SITE_URL)]);
    rows.push([link2 ? Markup.button.url('Tes login (form)', link2) : Markup.button.url('Beranda', MAIN_SITE_URL)]);
  }
  rows.push([Markup.button.callback('Lihat username', `su|${userId}`), Markup.button.callback('Lihat sandi', `sp|${userId}`)]);
  return rows;
}

