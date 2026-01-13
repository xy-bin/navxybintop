// 测试节假日倒计时函数
const fs = require('fs');

// 读取main.js文件内容
const mainJsContent = fs.readFileSync('./js/main.js', 'utf8');

// 提取getNextHolidayCountdown函数
const functionMatch = mainJsContent.match(/function getNextHolidayCountdown\(now\)\{[\s\S]*?\}/);
if (functionMatch) {
    const functionCode = functionMatch[0];
    
    // 创建测试函数
    const getNextHolidayCountdown = eval(`(${functionCode.replace('function getNextHolidayCountdown', '')})`);
    
    // 测试当前日期（2026-01-12）
    const now = new Date('2026-01-12');
    const result = getNextHolidayCountdown(now);
    
    console.log('当前日期:', now.toISOString().split('T')[0]);
    console.log('节假日倒计时:', result);
    
    // 验证结果是否正确
    if (result.includes('春节')) {
        console.log('✓ 测试通过：正确显示下一个节假日（春节）');
    } else {
        console.log('✗ 测试失败：未正确显示下一个节假日');
    }
} else {
    console.log('✗ 未找到getNextHolidayCountdown函数');
}