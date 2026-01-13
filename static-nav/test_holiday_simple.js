// 简化版节假日测试脚本

// 复制getNextHolidayCountdown函数的核心逻辑
function testHolidayCountdown(now) {
    // 2025-2026年主要节日列表（公历）
    const holidays = [
        { date: '2025-01-01', name: '元旦' },
        { date: '2025-01-29', name: '春节' },
        { date: '2025-04-04', name: '清明节' },
        { date: '2025-05-01', name: '劳动节' },
        { date: '2025-06-25', name: '端午节' },
        { date: '2025-09-17', name: '中秋节' },
        { date: '2025-10-01', name: '国庆节' },
        { date: '2026-01-01', name: '元旦' },
        { date: '2026-02-16', name: '春节' },
        { date: '2026-04-04', name: '清明节' },
        { date: '2026-05-01', name: '劳动节' },
        { date: '2026-06-15', name: '端午节' },
        { date: '2026-09-25', name: '中秋节' },
        { date: '2026-10-01', name: '国庆节' }
    ];
    
    // 格式化当前日期
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 查找下一个节日
    let nextHoliday = null;
    for (const holiday of holidays) {
        const holidayDate = new Date(holiday.date);
        if (holidayDate > currentDate) {
            nextHoliday = holiday;
            break;
        }
    }
    
    if (nextHoliday) {
        // 计算倒计时
        const holidayDate = new Date(nextHoliday.date);
        const timeDiff = holidayDate - currentDate;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        return `距离${nextHoliday.name}还有${daysLeft}天`;
    } else {
        return '暂无即将到来的节日';
    }
}

// 测试当前日期（2026-01-12）
const now = new Date('2026-01-12');
const result = testHolidayCountdown(now);

console.log('当前日期:', now.toISOString().split('T')[0]);
console.log('节假日倒计时:', result);

// 验证结果是否正确
if (result.includes('春节')) {
    console.log('✓ 测试通过：正确显示下一个节假日（春节）');
} else {
    console.log('✗ 测试失败：未正确显示下一个节假日');
}

// 计算实际天数差
const currentDate = new Date('2026-01-12');
const springFestival = new Date('2026-02-16');
const actualDays = Math.ceil((springFestival - currentDate) / (1000 * 60 * 60 * 24));
console.log('实际距离春节天数:', actualDays);