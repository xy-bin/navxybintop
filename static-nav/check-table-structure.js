const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 辅助函数：格式化查询结果
function formatResults(results) {
    if (!results || results.length === 0) return [];
    
    const result = results[0];
    if (!result.values) return [];
    
    const columns = result.columns;
    return result.values.map(row => {
        const obj = {};
        columns.forEach((column, index) => {
            obj[column] = row[index];
        });
        return obj;
    });
}

async function checkTableStructure() {
    try {
        const SQL = await initSqlJs();
        
        // 读取数据库文件
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        // 获取categories表结构
        const result = db.exec('PRAGMA table_info(categories)');
        const tableInfo = formatResults(result);
        
        console.log('categories表结构:');
        tableInfo.forEach(row => {
            console.log(row);
        });
        
        // 检查UNIQUE约束
        const constraints = db.exec('PRAGMA index_list(categories)');
        const indexList = formatResults(constraints);
        
        console.log('\ncategories表约束:');
        indexList.forEach(row => {
            console.log(row);
            // 获取约束详情
            const indexInfo = db.exec(`PRAGMA index_info(${row.name})`);
            const infoList = formatResults(indexInfo);
            infoList.forEach(info => {
                console.log('  约束字段:', info);
            });
        });
        
        // 查看当前所有分类
        const categories = db.exec('SELECT * FROM categories');
        const categoryList = formatResults(categories);
        
        console.log('\n当前所有分类:');
        categoryList.forEach(row => {
            console.log(row);
        });
        
    } catch (err) {
        console.error('检查数据库表结构失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

checkTableStructure();