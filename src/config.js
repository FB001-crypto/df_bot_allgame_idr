import path from 'path';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const DEALERFOXY_API = process.env.DEALERFOXY_API || 'https://api.dealerfoxy.com/user/register';
export const DEALERFOXY_CHANNEL = process.env.DEALERFOXY_CHANNEL || 'telegram';

// 教程功能相关配置
export const DANA_FORM_URL = process.env.DANA_FORM_URL || 'https://forms.google.com/your-form-id';
// 支持多张图片URL，用逗号分隔
export const WIN_TUTORIAL_IMAGE_URLS = process.env.WIN_TUTORIAL_IMAGE_URLS ? 
  process.env.WIN_TUTORIAL_IMAGE_URLS.split(',').map(url => url.trim()).filter(Boolean) : [];
// 向后兼容单张图片配置
export const WIN_TUTORIAL_IMAGE_URL = process.env.WIN_TUTORIAL_IMAGE_URL || '';
export const TUTORIAL_DELAY_MIN_MS = parseInt(process.env.TUTORIAL_DELAY_MIN_MS || '10000', 10);
export const TUTORIAL_DELAY_MAX_MS = parseInt(process.env.TUTORIAL_DELAY_MAX_MS || '20000', 10);
export const LOGIN_URL = process.env.LOGIN_URL || 'https://www.dealerfoxy.com/?tab=signIn&lang=id';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const DEALERFOXY_LOGIN_API = process.env.DEALERFOXY_LOGIN_API || 'https://api.dealerfoxy.com/user/login?lang=id';
export const MAIN_SITE_URL = process.env.MAIN_SITE_URL || 'https://www.dealerfoxy.com/';
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
export const ONE_TAP_SECRET = process.env.ONE_TAP_SECRET || '';
export const ONE_TAP_TTL_SEC = parseInt(process.env.ONE_TAP_TTL_SEC || '300', 10);
export const REQUIRED_CHAT_IDS = (process.env.REQUIRED_CHAT_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
export const REGISTERED_FILE = path.join(DATA_DIR, 'registered.json');

// Feature toggles
export const SHOW_TEST_LINKS = process.env.SHOW_TEST_LINKS === 'true';

// Rate limiting & concurrency (tunable, with gentle defaults)
export const REG_PER_USER_POINTS = parseInt(process.env.REG_PER_USER_POINTS || '3', 10);
export const REG_PER_USER_DURATION = parseInt(process.env.REG_PER_USER_DURATION || '60', 10);
export const REG_GLOBAL_POINTS = parseInt(process.env.REG_GLOBAL_POINTS || '300', 10);
export const REG_GLOBAL_DURATION = parseInt(process.env.REG_GLOBAL_DURATION || '60', 10);
export const REG_COOLDOWN_MS = parseInt(process.env.REG_COOLDOWN_MS || '1500', 10);
export const REG_MAX_CONCURRENCY = parseInt(process.env.REG_MAX_CONCURRENCY || '20', 10);
export const MEMBERSHIP_CACHE_TTL_SEC = parseInt(process.env.MEMBERSHIP_CACHE_TTL_SEC || '300', 10);
export const DEV_REGISTER_IP_POINTS = parseInt(process.env.DEV_REGISTER_IP_POINTS || '60', 10);
export const DEV_REGISTER_IP_DURATION = parseInt(process.env.DEV_REGISTER_IP_DURATION || '60', 10);
