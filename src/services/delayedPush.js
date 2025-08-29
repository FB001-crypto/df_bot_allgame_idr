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
        console.error(`延时推送失败 - 用户 ${userId}:`, error);
        this.pendingPushes.delete(userId);
      }
    }, delayMs);

    this.pendingPushes.set(userId, timeoutId);
    console.log(`已安排延时推送 - 用户 ${userId}，延时 ${delayMs}ms`);
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
      console.log(`已取消延时推送 - 用户 ${userId}`);
    }
  }

  /**
   * 发送教程菜单
   * @param {string} userId - 用户ID
   */
  async sendTutorialMenu(userId) {
    const menuText = `🎮 **游戏教程指南**\n\n欢迎来到AllGame！为了帮助您更好地体验游戏，我们为您准备了详细的教程指南。\n\n请选择您需要的帮助：`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🏆 查看是否获胜', `tutorial_win|${userId}`)],
      [Markup.button.callback('💰 填写Dana信息', `tutorial_dana|${userId}`)]
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
      console.error('处理教程回调失败:', error);
      await ctx.answerCbQuery('操作失败，请稍后重试');
    }
  }

  /**
   * 发送获胜教程
   * @param {Object} ctx - Telegraf上下文
   * @param {string} userId - 用户ID
   */
  async sendWinTutorial(ctx, userId) {
    const tutorialText = `🏆 **如何查看游戏结果**\n\n` +
      `1️⃣ 进入游戏后，完成10局游戏\n` +
      `2️⃣ 在游戏记录查看您的游戏局数\n` +
      `3️⃣ 等待晚上xx:xx点公布中奖名单\n` +
      `4️⃣ 检查您的Dana账户，确认是否已收到奖励`;

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
      console.error('发送获胜教程失败:', error);
      // 如果图片发送失败，回退到纯文字
      await this.funnel.reply(ctx, tutorialText, { parse_mode: 'Markdown' });
    }
  }

  /**
   * 发送Dana信息教程
   * @param {Object} ctx - Telegraf上下文
   * @param {string} userId - 用户ID
   */
  async sendDanaTutorial(ctx, userId) {
    const tutorialText = `💰 **Dana信息填写指南**\n\n` +
      `为了确保您能顺利提取奖金，请按照以下步骤填写Dana信息：\n\n` +
      `1️⃣ 完成10局游戏后，点击下方的Google表单链接\n` +
      `2️⃣ 准确填写您的Dana账户信息\n` +
      `3️⃣ 确保信息无误后提交表单\n` +
      `4️⃣ 等待奖励发放\n\n` +
      `⚠️ **重要提醒：**\n` +
      `• 请确保Dana账户信息准确无误\n` +
      `• 错误信息可能导致提取延迟\n` +
      `• 每个账户只能绑定一个Dana账户`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('📝 填写Dana信息表单', DANA_FORM_URL)]
    ]);

    await this.funnel.reply(ctx, tutorialText, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }
}

export { DelayedPushService };