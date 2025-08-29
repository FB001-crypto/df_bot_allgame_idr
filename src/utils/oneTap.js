import crypto from 'crypto';
import { PUBLIC_BASE_URL, ONE_TAP_SECRET } from '../config.js';

export function signOneTap(uid, ts) {
  const secret = String(ONE_TAP_SECRET || '').trim();
  if (!secret) return '';
  const h = crypto.createHmac('sha256', secret);
  h.update(`${uid}.${ts}`);
  return h.digest('hex');
}

export function buildOneTapUrl(uid) {
  let base = String(PUBLIC_BASE_URL || '').trim();
  const secretOk = String(ONE_TAP_SECRET || '').trim().length > 0;
  if (!base || !secretOk) return null;
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, '');
  const ts = Date.now();
  const sig = signOneTap(uid, ts);
  if (!sig) return null;
  return `${base}/one-tap-login?uid=${encodeURIComponent(uid)}&ts=${ts}&sig=${sig}`;
}

export function buildFirstPartyUrl(uid) {
  let base = String(PUBLIC_BASE_URL || '').trim();
  const secretOk = String(ONE_TAP_SECRET || '').trim().length > 0;
  if (!base || !secretOk) return null;
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, '');
  const ts = Date.now();
  const sig = signOneTap(uid, ts);
  if (!sig) return null;
  return `${base}/first-party-login?uid=${encodeURIComponent(uid)}&ts=${ts}&sig=${sig}`;
}

