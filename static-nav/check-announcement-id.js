const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 辅助函数：格式化sql.js的查询结果
function formatResults(results) {
    if (!results || results.length === 0) return [];
    
    const result = results[0];
    if (!result || !result.values) return [];
    
    const columns = result.columns;
    return result.values.map(row => {
        const obj = {};
        columns.forEach((column, index) => {
            obj[column] = row[index];
        });
        return obj;
    });
}

async function checkAnnouncementId() {
    try {
        console.log('=== 检查公告ID问题 ===');
        
        const SQL = await initSqlJs();
        
        // 读取数据库文件
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        // 1. 检查表结构
        console.log('\n1. 公告表结构:');
        const tableInfo = db.exec('PRAGMA table_info(announcements)');
        const formattedTableInfo = formatResults(tableInfo);
        
        formattedTableInfo.forEach(column => {
            console.log(`   - ${column.name} (${column.type}) 主键: ${column.pk ? '是' : '否'} 非空: ${column.notnull ? '是' : '否'}`);
        });
        
        // 2. 检查当前公告数据
        console.log('\n2. 当前公告数据:');
        const announcements = db.exec('SELECT * FROM announcements ORDER BY id DESC');
        const formattedAnnouncements = formatResults(announcements);
        
        if (formattedAnnouncements.length === 0) {
            console.log('   没有公告数据');
        } else {
            formattedAnnouncements.forEach((announcement, index) => {
                console.log(`   公告 ${index + 1}:`);
                console.log(`     ID: ${announcement.id}`);
                console.log(`     标题: ${announcement.title}`);
                console.log(`     内容: ${announcement.content}`);
                console.log(`     时间: ${announcement.time}`);
                console.log(`     状态: ${announcement.is_active}`);
                console.log(`     创建时间: ${announcement.created_at}`);
                console.log(`     更新时间: ${announcement.updated_at}`);
            });
        }
        
        // 3. 测试获取最后插入ID
        console.log('\n3. 测试获取最后插入ID:');
        
        try {
            // 插入一条临时测试公告
            db.run(
                'INSERT INTO announcements (title, content, time, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                ['测试ID', '测试内容', new Date().toLocaleString(), 0, new Date().toISOString(), new Date().toISOString()]
            );
            
            // 获取最后插入的ID
            const lastIdResult = db.exec('SELECT last_insert_rowid() as id FROM announcements');
            const formattedLastIdResult = formatResults(lastIdResult);
            
            console.log('   最后插入ID:', formattedLastIdResult[0].id);
            
            // 删除测试公告
            db.run(`DELETE FROM announcements WHERE id = ${formattedLastIdResult[0].id}`);
            
        } catch (error) {
            console.log('   测试失败:', error.message);
        }
        
    } catch (err) {
        console.error('检查失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

checkAnnouncementId();