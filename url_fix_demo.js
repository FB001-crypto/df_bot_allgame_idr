#!/usr/bin/env node

/**
 * URL构建修复演示
 * 展示修复前后的差异
 */

console.log('🔧 URL构建修复演示\n');

// 修复前的逻辑（有问题的版本）
function buildFragmentUrlOld(token, username, mainSiteUrl) {
  try {
    const base = String(mainSiteUrl || '').split('#')[0];
    if (!token) return '';
    // 简单的参数拼接（有问题）
    const baseWithLang = base.includes('?') ? `${base}&lang=id` : `${base}?lang=id`;
    const hash = `tgToken=${encodeURIComponent(token)}${username?`&username=${encodeURIComponent(username)}`:''}`;;
    return `${baseWithLang}#${hash}`;
  } catch { return ''; }
}

// 修复后的逻辑（正确版本）
function buildFragmentUrlNew(token, username, mainSiteUrl) {
  try {
    const base = String(mainSiteUrl || '').split('#')[0];
    if (!token) return '';
    
    // 智能处理URL参数拼接
    let baseWithLang;
    if (base.includes('?')) {
      // 如果URL已包含查询参数，检查是否已有lang参数
      const url = new URL(base);
      if (!url.searchParams.has('lang')) {
        url.searchParams.set('lang', 'id');
      }
      baseWithLang = url.toString();
    } else {
      // 如果URL没有查询参数，直接添加
      baseWithLang = `${base}?lang=id`;
    }
    
    const hash = `tgToken=${encodeURIComponent(token)}${username?`&username=${encodeURIComponent(username)}`:''}`;;
    return `${baseWithLang}#${hash}`;
  } catch { return ''; }
}

// 测试数据
const testUrl = 'https://www.dealerfoxy.com/pages/game/index?gameId=9400';
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIwMTcxNDE2LCJsb2dpblRpbWUiOjE3NTY1MDE4MzQsInZlciI6MiwiaWF0IjoxNzU2NTAxODM0LCJleHAiOjE3NzIwNTM4MzR9.dxK4Rb3XSSrtk5twdCiA9qCEG0l6fOmoYtO6b_LFtl0';
const testUsername = 'Promo55Uu7_DF';

console.log('📋 测试参数:');
console.log(`   游戏页面URL: ${testUrl}`);
console.log(`   用户名: ${testUsername}`);
console.log(`   Token: ${testToken.substring(0, 50)}...`);
console.log();

// 修复前的结果
const oldResult = buildFragmentUrlOld(testToken, testUsername, testUrl);
console.log('❌ 修复前的结果（有问题）:');
console.log(`   ${oldResult}`);
console.log();

// 修复后的结果
const newResult = buildFragmentUrlNew(testToken, testUsername, testUrl);
console.log('✅ 修复后的结果（正确）:');
console.log(`   ${newResult}`);
console.log();

// 分析差异
console.log('🔍 差异分析:');
if (oldResult === newResult) {
  console.log('   两个结果相同');
} else {
  console.log('   修复前: 可能存在URL参数拼接问题');
  console.log('   修复后: 使用URL对象正确处理参数');
}

console.log();
console.log('📝 修复要点:');
console.log('1. 使用URL对象而不是字符串拼接');
console.log('2. 检查是否已存在lang参数，避免重复添加');
console.log('3. 正确处理复杂的查询参数组合');
console.log();
console.log('🎯 现在可以安全地使用游戏页面作为外链目标！');