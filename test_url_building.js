#!/usr/bin/env node

/**
 * 测试URL构建逻辑
 * 验证buildFragmentUrl函数是否正确处理包含查询参数的URL
 */

// 模拟buildFragmentUrl函数
function buildFragmentUrl(token, username, mainSiteUrl) {
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

// 测试用例
const testCases = [
  {
    name: '原始首页URL',
    mainSiteUrl: 'https://www.dealerfoxy.com/',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    username: 'Promo55Uu7_DF',
    expected: 'https://www.dealerfoxy.com/?lang=id#tgToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test&username=Promo55Uu7_DF'
  },
  {
    name: '游戏页面URL（新需求）',
    mainSiteUrl: 'https://www.dealerfoxy.com/pages/game/index?gameId=9400',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    username: 'Promo55Uu7_DF',
    expected: 'https://www.dealerfoxy.com/pages/game/index?gameId=9400&lang=id#tgToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test&username=Promo55Uu7_DF'
  },
  {
    name: '已包含lang参数的URL',
    mainSiteUrl: 'https://www.dealerfoxy.com/pages/game/index?gameId=9400&lang=en',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    username: 'Promo55Uu7_DF',
    expected: 'https://www.dealerfoxy.com/pages/game/index?gameId=9400&lang=en#tgToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test&username=Promo55Uu7_DF'
  },
  {
    name: '无用户名的情况',
    mainSiteUrl: 'https://www.dealerfoxy.com/pages/game/index?gameId=9400',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    username: null,
    expected: 'https://www.dealerfoxy.com/pages/game/index?gameId=9400&lang=id#tgToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
  }
];

console.log('🧪 URL构建逻辑测试\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  console.log(`输入URL: ${testCase.mainSiteUrl}`);
  
  const result = buildFragmentUrl(testCase.token, testCase.username, testCase.mainSiteUrl);
  
  console.log(`生成结果: ${result}`);
  console.log(`预期结果: ${testCase.expected}`);
  
  const passed = result === testCase.expected;
  console.log(`测试结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
  
  if (passed) {
    passedTests++;
  } else {
    console.log('❌ 详细对比:');
    console.log(`   实际: ${result}`);
    console.log(`   预期: ${testCase.expected}`);
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');
});

console.log(`📊 测试总结: ${passedTests}/${totalTests} 个测试通过`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过！URL构建逻辑工作正常。');
  console.log('\n✅ 现在可以安全地将MAIN_SITE_URL设置为:');
  console.log('   MAIN_SITE_URL=https://www.dealerfoxy.com/pages/game/index?gameId=9400');
} else {
  console.log('⚠️  部分测试失败，需要进一步检查代码逻辑。');
}

console.log('\n📝 使用说明:');
console.log('1. 修改 .env 文件中的 MAIN_SITE_URL');
console.log('2. 重启Bot服务器');
console.log('3. 测试外链功能');