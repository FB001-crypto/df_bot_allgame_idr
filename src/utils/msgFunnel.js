// 简易全局消息发送漏斗，避免触发 Telegram Bot API 限流
// 不引入外部依赖：全局队列 + 速率约束（全局 ~25/s；每 chat ~1/s）

export function createMsgFunnel(bot, opts = {}) {
  const globalPerSec = Number(opts.globalPerSec || 25);
  const perChatPerSec = Number(opts.perChatPerSec || 1);
  const globalStepMs = Math.max(1, Math.floor(1000 / globalPerSec)); // ~40ms
  const chatStepMs = Math.max(1, Math.floor(1000 / perChatPerSec));   // 1000ms

  const queue = [];
  let processing = false;
  let lastGlobalAt = 0;
  const lastChatAt = new Map();

  async function processLoop() {
    if (processing) return;
    processing = true;
    try {
      while (queue.length) {
        const job = queue[0];
        const now = Date.now();
        const gWait = Math.max(0, lastGlobalAt + globalStepMs - now);
        const cLast = lastChatAt.get(job.chatId) || 0;
        const cWait = Math.max(0, cLast + chatStepMs - now);
        const wait = Math.max(gWait, cWait);
        if (wait > 0) {
          await new Promise(r => setTimeout(r, wait));
        }
        // 执行
        try {
          await job.fn();
        } catch (e) {
          // 吞掉异常，避免阻塞队列；调用方自行处理
        }
        lastGlobalAt = Date.now();
        lastChatAt.set(job.chatId, lastGlobalAt);
        queue.shift();
      }
    } finally {
      processing = false;
    }
  }

  function enqueue(chatId, fn) {
    queue.push({ chatId, fn });
    processLoop();
  }

  return {
    // 发送文本消息（排队）
    async sendText(chatId, text, extra) {
      return new Promise((resolve) => {
        enqueue(chatId, async () => {
          const res = await bot.telegram.sendMessage(chatId, text, extra);
          resolve(res);
        });
      });
    },
    // 发送图片消息（排队）
    async sendPhoto(chatId, photo, extra) {
      return new Promise((resolve) => {
        enqueue(chatId, async () => {
          const res = await bot.telegram.sendPhoto(chatId, photo, extra);
          resolve(res);
        });
      });
    },
    // 便捷：基于 ctx 的 reply 包装
    async reply(ctx, text, extra) {
      const chatId = ctx.chat?.id ?? ctx.from?.id;
      if (chatId == null) return;
      return this.sendText(chatId, text, extra);
    },
    // 发送媒体组消息（排队）
    async sendMediaGroup(chatId, media, extra) {
      return new Promise((resolve) => {
        enqueue(chatId, async () => {
          const res = await bot.telegram.sendMediaGroup(chatId, media, extra);
          resolve(res);
        });
      });
    },
    // 便捷：基于 ctx 的 replyWithPhoto 包装
    async replyWithPhoto(ctx, photo, extra) {
      const chatId = ctx.chat?.id ?? ctx.from?.id;
      if (chatId == null) return;
      return this.sendPhoto(chatId, photo, extra);
    },
    // 便捷：基于 ctx 的 replyWithMediaGroup 包装
    async replyWithMediaGroup(ctx, media, extra) {
      const chatId = ctx.chat?.id ?? ctx.from?.id;
      if (chatId == null) return;
      return this.sendMediaGroup(chatId, media, extra);
    },
  };
}

