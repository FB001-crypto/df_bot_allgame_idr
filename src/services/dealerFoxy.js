import axios from 'axios';
import { DEALERFOXY_API, DEALERFOXY_LOGIN_API, DEALERFOXY_CHANNEL } from '../config.js';

export async function registerOnDealerFoxy({ username, password, deviceId }) {
  const payload = { username, password, repassword: password, device_id: String(deviceId), channel: DEALERFOXY_CHANNEL };
  const resp = await axios.post(DEALERFOXY_API, payload, {
    headers: { 'Content-Type': 'application/json' }, timeout: 15000, validateStatus: (s) => s >= 200 && s < 500,
  });
  if (resp.status >= 200 && resp.status < 300) return { ok: true, data: resp.data };
  const message = (resp.data && (resp.data.message || resp.data.error)) || `HTTP ${resp.status}`;
  return { ok: false, status: resp.status, message, data: resp.data };
}

export async function loginOnDealerFoxy({ username, password, deviceId }) {
  const payload = { username, password, device_id: String(deviceId) };
  const resp = await axios.post(DEALERFOXY_LOGIN_API, payload, {
    headers: { 'Content-Type': 'application/json' }, timeout: 15000, validateStatus: (s) => s >= 200 && s < 500,
  });
  if (resp.status >= 200 && resp.status < 300) return { ok: true, data: resp.data };
  const message = (resp.data && (resp.data.message || resp.data.error)) || `HTTP ${resp.status}`;
  return { ok: false, status: resp.status, message, data: resp.data };
}

