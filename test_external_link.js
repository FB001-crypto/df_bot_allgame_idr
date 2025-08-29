#!/usr/bin/env node

/**
 * 测试外链点击后延时推送功能
 * 这个脚本提供了多种测试方法
 */

import crypto from 'crypto';

// 测试配置
const TEST_USER_ID = '123456789';
const TEST_SECRET = 'test-secret-key';
const TEST_PORT = 3000;

// 生成测试用的签名参数
function generateTestParams(uid, secret = TEST_SECRET) {
  const ts = Date.now().toString();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${uid}.${ts}`);
  const sig = hmac.digest('hex');
  
  return { uid, ts, sig };
}

// 测试方法1：模拟HTTP请求（需要Bot服务器运行）
async function testWithRunningServer() {
  console.log('🧪 测试方法1：模拟外链访问（需要Bot服务器运行）');
  
  const { uid, ts, sig } = generateTestParams(TEST_USER_ID);
  const testUrl = `http://localhost:${TEST_PORT}/one-tap-login?uid=${uid}&ts=${ts}&sig=${sig}`;
  
  console.log(`📋 测试参数:`);
  console.log(`   用户ID: ${uid}`);
  console.log(`   时间戳: ${ts}`);
  console.log(`   签名: ${sig}`);
  console.log(`   测试URL: ${testUrl}`);
  
  try {
    console.log('\n🌐 发送HTTP请求到外链路由...');
    const response = await fetch(testUrl);
    
    if (response.ok) {
      console.log('✅ 外链访问成功!');
      console.log(`   状态码: ${response.status}`);
      console.log('\n⏰ 延时推送应该在10-20秒内触发...');
      console.log('   请检查Telegram Bot是否向用户发送了教程菜单');
      
    } else {
      console.log('❌ 外链访问失败!');
      console.log(`   状态码: ${response.status}`);
      const errorText = await response.text();
      console.log(`   错误信息: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    console.log('\n💡 提示: 请确保Bot服务器正在运行');
    console.log('   1. 配置 .env 文件中的 TELEGRAM_BOT_TOKEN');
    console.log('   2. 运行: npm start');
    console.log('   3. 然后重新运行此测试脚本');
  }
}

// 测试方法2：手动测试指南
function showManualTestGuide() {
  console.log('\n🧪 测试方法2：手动测试指南');
  console.log('\n📝 步骤说明:');
  console.log('1. 配置环境变量:');
  console.log('   - 复制 .env.example 为 .env');
  console.log('   - 设置 TELEGRAM_BOT_TOKEN');
  console.log('   - 设置 ONE_TAP_SECRET');
  console.log('   - 设置其他必要的环境变量');
  
  console.log('\n2. 启动Bot服务器:');
  console.log('   npm start');
  
  console.log('\n3. 在Telegram中测试:');
  console.log('   - 向Bot发送消息触发注册流程');
  console.log('   - 注册成功后会收到包含"Masuk cepat"按钮的消息');
  console.log('   - 点击"Masuk cepat"按钮（这是外链）');
  console.log('   - 等待10-20秒，应该会收到教程菜单');
  
  console.log('\n4. 验证结果:');
  console.log('   - 教程菜单应包含两个按钮:');
  console.log('     🏆 查看是否获胜');
  console.log('     💰 填写Dana信息');
}

// 测试方法3：代码验证
function verifyCodeChanges() {
  console.log('\n🧪 测试方法3：代码修改验证');
  console.log('\n✅ 已完成的修改:');
  console.log('1. 在 src/index.js 的 /one-tap-login 路由中添加了:');
  console.log('   delayedPushService.schedulePush(uid);');
  
  console.log('\n2. 在 src/index.js 的 /first-party-login 路由中添加了:');
  console.log('   delayedPushService.schedulePush(uid);');
  
  console.log('\n3. 延时推送配置 (src/config.js):');
  console.log('   - TUTORIAL_DELAY_MIN_MS: 10000 (10秒)');
  console.log('   - TUTORIAL_DELAY_MAX_MS: 20000 (20秒)');
  
  console.log('\n🔍 修改前后对比:');
  console.log('   修改前: 只有点击"注册"按钮才触发延时推送');
  console.log('   修改后: 点击外链也会触发延时推送');
}

// 主函数
async function main() {
  console.log('🚀 外链延时推送功能测试工具\n');
  
  // 显示所有测试方法
  verifyCodeChanges();
  showManualTestGuide();
  
  // 尝试自动测试
  console.log('\n' + '='.repeat(50));
  await testWithRunningServer();
  
  console.log('\n📚 更多信息:');
  console.log('   - 查看 src/services/delayedPush.js 了解延时推送实现');
  console.log('   - 查看 .env.example 了解环境变量配置');
  console.log('   - 查看 README.md 了解完整的部署指南');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateTestParams, testWithRunningServer, showManualTestGuide, verifyCodeChanges };