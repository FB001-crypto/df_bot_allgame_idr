import { Markup } from 'telegraf';
import { createMsgFunnel } from '../utils/msgFunnel.js';
import { DANA_FORM_URL, WIN_TUTORIAL_IMAGE_URL, WIN_TUTORIAL_IMAGE_URLS, TUTORIAL_DELAY_MIN_MS, TUTORIAL_DELAY_MAX_MS } from '../config.js';

/**
 * 延时推送服务
 * 用于在用户点击FragmentLink后延时推送教程菜单
 */
class DelayedPushService {
  constructor(bot) {
    this.bot = bot;
    this.funnel = createMsgFunnel(bot);
    this.pendingPushes = new Map(); // userId -> timeoutId
  }

  /**
   * 安排延时推送
   * @param {string} userId - 用户ID
   * @param {number} delayMs - 延时毫秒数（可配置范围）
   */
  schedulePush(userId, delayMs = null) {
    // 如果未指定延时，使用配置的随机范围
    if (delayMs === null) {
      const minMs = TUTORIAL_DELAY_MIN_MS;
      const maxMs = TUTORIAL_DELAY_MAX_MS;
      delayMs = minMs + Math.random() * (maxMs - minMs);
    }
    // 如果已有待推送任务，先清除
    this.cancelPush(userId);

    const timeoutId = setTimeout(async () => {
      try {
        await this.sendTutorialMenu(userId);
        this.pendingPushes.delete(userId);
      } catch (error) {
        console.error(`Gagal mengirim push tertunda - pengguna ${userId}:`, error);
        this.pendingPushes.delete(userId);
      }
    }, delayMs);

    this.pendingPushes.set(userId, timeoutId);
    console.log(`Push tertunda telah dijadwalkan - pengguna ${userId}, delay ${delayMs}ms`);
  }

  /**
   * 取消延时推送
   * @param {string} userId - 用户ID
   */
  cancelPush(userId) {
    const timeoutId = this.pendingPushes.get(userId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingPushes.delete(userId);
      console.log(`Push tertunda dibatalkan - pengguna ${userId}`);
    }
  }

  /**
   * 发送教程菜单
   * @param {string} userId - 用户ID
   */
  async sendTutorialMenu(userId) {
    const menuText = `🎮 **Panduan Tutorial Game**\n\nSelamat datang di AllGame! Untuk membantu Anda menikmati pengalaman bermain yang lebih baik, kami telah menyiapkan panduan tutorial yang detail.\n\nSilakan pilih bantuan yang Anda butuhkan:`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🏆 Lihat Hasil Kemenangan', `tutorial_win|${userId}`)],
      [Markup.button.callback('💰 Isi Informasi Dana', `tutorial_dana|${userId}`)]
    ]);

    await this.funnel.reply({ chat: { id: userId } }, menuText, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  /**
   * 处理教程按钮回调
   * @param {Object} ctx - Telegraf上下文
   */
  async handleTutorialCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const [action, userId] = callbackData.split('|');

    try {
      await ctx.answerCbQuery();
      
      if (action === 'tutorial_win') {
        await this.sendWinTutorial(ctx, userId);
      } else if (action === 'tutorial_dana') {
        await this.sendDanaTutorial(ctx, userId);
      }
    } catch (error) {
      console.error('Gagal memproses callback tutorial:', error);
      await ctx.answerCbQuery('Operasi gagal, silakan coba lagi nanti');
    }
  }

  /**
   * 发送获胜教程
   * @param {Object} ctx - Telegraf上下文
   * @param {string} userId - 用户ID
   */
  async sendWinTutorial(ctx, userId) {
    const tutorialText = `🏆 **Cara Melihat Hasil Game**\n\n` +
      `1️⃣ Setelah masuk game, selesaikan 10 putaran permainan\n` +
      `2️⃣ Lihat jumlah permainan Anda di riwayat game\n` +
      `3️⃣ Tunggu pengumuman pemenangnya pada pukul 01:00 besok (UTC+8)\n` +
      `4️⃣ Periksa akun Dana Anda untuk memastikan hadiah telah diterima`;

    try {
      // 优先使用多张图片配置
      if (WIN_TUTORIAL_IMAGE_URLS && WIN_TUTORIAL_IMAGE_URLS.length > 0) {
        if (WIN_TUTORIAL_IMAGE_URLS.length === 1) {
          // 单张图片，使用 replyWithPhoto
          await this.funnel.replyWithPhoto(ctx, WIN_TUTORIAL_IMAGE_URLS[0], {
            caption: tutorialText,
            parse_mode: 'Markdown'
          });
        } else {
          // 多张图片，使用媒体组发送
          const mediaGroup = WIN_TUTORIAL_IMAGE_URLS.map((url, index) => ({
            type: 'photo',
            media: url,
            // 只在第一张图片添加说明文字
            caption: index === 0 ? tutorialText : undefined,
            parse_mode: index === 0 ? 'Markdown' : undefined
          }));
          
          await this.funnel.replyWithMediaGroup(ctx, mediaGroup);
        }
      } else if (WIN_TUTORIAL_IMAGE_URL && WIN_TUTORIAL_IMAGE_URL.trim()) {
        // 向后兼容单张图片配置
        await this.funnel.replyWithPhoto(ctx, WIN_TUTORIAL_IMAGE_URL, {
          caption: tutorialText,
          parse_mode: 'Markdown'
        });
      } else {
        // 没有配置图片，只发送文字教程
        await this.funnel.reply(ctx, tutorialText, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Gagal mengirim tutorial kemenangan:', error);
      // Jika gagal mengirim gambar, kembali ke teks saja
      await this.funnel.reply(ctx, tutorialText, { parse_mode: 'Markdown' });
    }
  }

  /**
   * 发送Dana信息教程
   * @param {Object} ctx - Telegraf上下文
   * @param {string} userId - 用户ID
   */
  async sendDanaTutorial(ctx, userId) {
    const tutorialText = `💰 **Panduan Mengisi Informasi Dana**\n\n` +
      `Untuk memastikan Anda dapat menarik hadiah dengan lancar, silakan ikuti langkah-langkah berikut untuk mengisi informasi Dana:\n\n` +
      `1️⃣ Setelah menyelesaikan 10 putaran permainan, klik link Google Form di bawah\n` +
      `2️⃣ Isi informasi akun Dana Anda dengan akurat\n` +
      `3️⃣ Pastikan informasi benar sebelum mengirim formulir\n` +
      `4️⃣ Tunggu distribusi hadiah\n\n` +
      `⚠️ **Pengingat Penting:**\n` +
      `• Pastikan informasi akun Dana akurat dan benar\n` +
      `• Informasi yang salah dapat menyebabkan keterlambatan penarikan\n` +
      `• Setiap akun hanya dapat mengikat satu akun Dana`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('📝 Isi Formulir Informasi Dana', DANA_FORM_URL)]
    ]);

    await this.funnel.reply(ctx, tutorialText, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }
}

export { DelayedPushService };