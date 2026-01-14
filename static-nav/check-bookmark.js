const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 检查书签是否成功添加
async function checkBookmark() {
    try {
        const SQL = await initSqlJs();
        
        // 读取数据库
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        // 查询最近添加的书签
        const results = db.exec('SELECT * FROM links ORDER BY link_id DESC LIMIT 5');
        
        if (results && results[0] && results[0].values) {
            const columns = results[0].columns;
            const bookmarks = results[0].values.map(row => {
                const bookmark = {};
                columns.forEach((column, index) => {
                    bookmark[column] = row[index];
                });
                return bookmark;
            });
            
            console.log('最近添加的书签:');
            console.log(JSON.stringify(bookmarks, null, 2));
        } else {
            console.log('没有找到书签');
        }
        
        db.close();
    } catch (error) {
        console.error('检查书签失败:', error);
    }
}

checkBookmark();