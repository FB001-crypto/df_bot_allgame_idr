# Telegram 注册机器人

该项目实现了一个 Telegram 机器人：
- 点击“注册”按钮后，请求 `https://api.dealerfoxy.com/user/register` 完成注册
- 返回给用户已注册的【用户名】和【8位密码】
- 对每个用户做速率限制：每分钟最多 3 次
- 同一 Telegram 用户注册成功后，后续不允许再次注册

## 本地运行

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 编辑 `.env`（完整示例见 .env.example）：
- TELEGRAM_BOT_TOKEN：必填，BotFather 获取
- DEALERFOXY_API：可选，默认 https://api.dealerfoxy.com/user/register
- DEALERFOXY_LOGIN_API：可选，默认 https://api.dealerfoxy.com/user/login?lang=id
- LOGIN_URL：可选，默认 https://www.dealerfoxy.com/?tab=signIn
- MAIN_SITE_URL：可选，默认 https://www.dealerfoxy.com/
- PUBLIC_BASE_URL：可选，对外可访问域名，生成一键登录链接（支持裸域名，自动补 https）
- ONE_TAP_SECRET：可选，启用一键登录签名必填
- ONE_TAP_TTL_SEC：可选，默认 300（秒）
- REQUIRED_CHAT_IDS：可选，限制必须在这些群/频道内，逗号分隔，如 -1001234567890,-1002222222222
- DATA_DIR：可选，默认 /data
- PORT：健康检查端口，默认 3000
- REG_PER_USER_POINTS/REG_PER_USER_DURATION：每用户注册限流（默认 3次/60秒）
- REG_GLOBAL_POINTS/REG_GLOBAL_DURATION：全局注册限流（默认 300次/60秒）
- REG_COOLDOWN_MS：同用户短冷却（默认 1500ms），避免连点
- REG_MAX_CONCURRENCY：注册并发上限（默认 20），保护上游接口
- MEMBERSHIP_CACHE_TTL_SEC：群成员校验缓存TTL（默认 300秒）
- DEV_REGISTER_IP_POINTS/DEV_REGISTER_IP_DURATION：/dev/register 的 IP 限流（默认 60次/60秒，按需启用）

3. 安装依赖并启动：

```bash
npm i
npm run dev
```

## 使用方式（Telegram）
- 在 Telegram 中打开你的机器人，输入 `/start` 或点击“注册”按钮。
- 首次注册成功后，会返回：
  - 用户名：如 `GE200123`
  - 密码：随机 8 位字符串
- 已注册用户再次尝试，会提示已注册且不允许重复注册。

## 本地测试（无 Telegram 环境）
- 直接调用本地测试端点，传入模拟的 `userId`（代替 Telegram userid）：

```bash
curl 'http://localhost:3000/dev/register?userId=123456'
```

- 返回示例：

```json
{"ok":true,"username":"GE200123","password":"aB3dE4fG"}
```

- 其它调试端点：
  - /one-tap-login：中转页 iFrame 隐藏提交方案
  - /first-party-login：顶级表单直接提交方案

- 注意：
  - 该端点与机器人使用同一套逻辑：速率限制（每分钟 3 次）与“注册后锁定”同样生效。
  - `userId` 只是测试用的模拟标识，不必是真实 Telegram UID。

## 说明
- 用户名格式：`Promo{2位数字}{3位字母/数字}_DF`（例如：Promo02ab2_DF）
- 密码：长度 8 位，字母数字随机
- 失败自动重试用户名冲突（最多 5 次）
- 数据持久化：`data/registered.json`

## 登录与复制
- 注册成功与已注册用户会收到两个测试按钮：
  - 中转页登录测试：打开 /one-tap-login（iFrame 隐藏提交方案）
  - 顶级POST表单测试：打开 /first-party-login（顶级表单直接提交方案）
- 同时提供“展示用户名”“展示密码”按钮（仅本人可用），点击后机器人会分别回送可复制文本。

## Railway 部署

推荐使用 Railway 控制台从 GitHub 一键部署（使用仓库中的 Dockerfile 构建）。

1. 连接 GitHub 仓库并创建服务：
   - 在 Railway 控制台新建 Project → Deploy From GitHub
   - 选择仓库 `FB001-crypto/df_register_bot`（或你的 Fork）
   - 选择分支：`master`（或你的默认分支）
   - Railway 会自动识别 Dockerfile 并用容器方式构建，无需额外配置

2. 配置环境变量（Service → Variables）：
   - `TELEGRAM_BOT_TOKEN`（必填）：从 BotFather 获取
   - `DEALERFOXY_API`（可选）：默认 `https://api.dealerfoxy.com/user/register`
   - `LOGIN_URL`（可选）：默认 `https://www.dealerfoxy.com/?tab=signIn`
   - `PORT`（可选）：默认 `3000`（Dockerfile 内应用监听 3000）
   - `DATA_DIR`（可选）：默认 `/data`

3. 配置持久化 Volume（确保“注册后不可重复”在重启后仍生效）：
   - 在 Service → Storage/Volumes 中新增 Volume
   - Mount Path：`/data`
   - 容量按需分配（如 1GB）
   - 注意：Mount Path 应与 `DATA_DIR` 保持一致（默认 `/data`）

4. 健康检查设置：
   - 在 Service → Settings 中配置 Health Check（若可用）
   - 类型：HTTP；Path：`/health`

5. 部署与验证：
   - 首次连接仓库后会自动构建并部署
   - 之后对被监听分支的每次推送会触发自动部署
   - 验证：访问 `https://<your-service>.up.railway.app/health` 应返回 `{ "ok": true, ... }`

6. 日志与故障排查：
   - 在 Logs 查看：应看到 `Health server listening on :3000` 与 `Telegram Bot 已启动`
   - 若出现 409 Conflict（terminated by other getUpdates request）：
     - 确保同一时间只有一个实例在运行（本地/云上不要重复启动）
     - 如使用过 webhook，请先清除 webhook（可在启动前调用 deleteWebhook）
   - 若启动失败检查：
     - `TELEGRAM_BOT_TOKEN` 是否配置正确
     - Volume 是否挂载到 `/data`
     - 端口是否为 3000 或 `PORT` 与应用一致
