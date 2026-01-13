const { initDatabase } = require('./db-sqlite.js');

async function testNameMismatch() {
    try {
        const db = await initDatabase();
        
        // 获取所有分类
        const allCategories = db.exec('SELECT * FROM categories');
        console.log('数据库中的分类名称:');
        
        allCategories[0].values.forEach((row, index) => {
            const name = row[1];
            console.log(`索引: ${index}, 名称: "${name}", 长度: ${name.length}, Unicode编码: [${[...name].map(c => c.charCodeAt(0)).join(', ')}]`);
        });
        
        // 测试我们尝试插入的名称
        const testName = '常用导航';
        console.log(`\n我们尝试插入的名称: "${testName}", 长度: ${testName.length}, Unicode编码: [${[...testName].map(c => c.charCodeAt(0)).join(', ')}]`);
        
        // 检查是否有完全匹配的名称
        const matchingCategories = allCategories[0].values.filter(row => row[1] === testName);
        console.log(`\n完全匹配的分类数量: ${matchingCategories.length}`);
        
        // 检查是否有部分匹配或相似的名称
        console.log('\n相似名称检查:');
        allCategories[0].values.forEach((row, index) => {
            const name = row[1];
            const similarity = calculateSimilarity(name, testName);
            console.log(`索引: ${index}, 名称: "${name}", 相似度: ${similarity.toFixed(2)}`);
        });
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 计算字符串相似度的简单函数
function calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    let matches = 0;
    
    for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
        if (str1[i] === str2[i]) {
            matches++;
        }
    }
    
    return matches / maxLength;
}

testNameMismatch();
