import fsp from 'fs/promises';
import { DATA_DIR } from '../config.js';

export class RegistrationStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.db = {};
  }
  async init() {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fsp.readFile(this.filePath, 'utf-8');
      this.db = JSON.parse(content || '{}');
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        await this.#flush();
      } else {
        console.error('Gagal membaca data registrasi:', err);
        throw err;
      }
    }
  }
  isRegistered(userId) { return Boolean(this.db[userId]); }
  get(userId) { return this.db[userId] || null; }
  async add(userId, record) { this.db[userId] = record; await this.#flush(); }
  isUsernameTaken(username) {
    const values = Object.values(this.db || {});
    for (const rec of values) { if (rec && rec.username === username) return true; }
    return false;
  }
  async #flush() {
    const tmp = `${this.filePath}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(this.db, null, 2), 'utf-8');
    await fsp.rename(tmp, this.filePath);
  }
}

