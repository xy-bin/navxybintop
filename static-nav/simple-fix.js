const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');
const BACKUP_FILE = path.join(__dirname, 'data', 'navxybintop-backup.db');

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

async function simpleFix() {
    try {
        console.log('开始简单修复...');
        
        // 1. 从备份恢复数据库
        if (fs.existsSync(BACKUP_FILE)) {
            fs.copyFileSync(BACKUP_FILE, DB_FILE);
            console.log('已从备份恢复数据库:', DB_FILE);
        } else {
            console.error('找不到备份文件:', BACKUP_FILE);
            return;
        }
        
        const SQL = await initSqlJs();
        
        // 读取数据库文件
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        // 2. 检查当前分类表结构和约束
        const tableInfo = formatResults(db.exec('PRAGMA table_info(categories)'));
        console.log('\n当前分类表结构:');
        tableInfo.forEach(row => {
            console.log('  ', row.name, ':', row.type, row.pk ? '(主键)' : '');
        });
        
        const constraints = formatResults(db.exec('PRAGMA index_list(categories)'));
        console.log('\n当前分类表约束:');
        constraints.forEach(row => {
            console.log('  ', row.name, ':', row.unique ? '(唯一)' : '', row.origin);
        });
        
        // 3. 检查当前分类数据
        const categories = formatResults(db.exec('SELECT * FROM categories'));
        console.log('\n当前分类数据:');
        categories.forEach(category => {
            console.log('  ID:', category.category_id, '名称:', category.category_name);
        });
        
        // 4. 直接添加UNIQUE约束
        console.log('\n添加UNIQUE约束到category_name字段...');
        
        // 使用CREATE INDEX语句添加唯一约束
        try {
            db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(category_name)');
            console.log('成功添加UNIQUE约束！');
        } catch (error) {
            console.error('添加约束失败:', error);
            return;
        }
        
        // 5. 保存数据库更改
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
        
        console.log('\n修复完成！');
        
        // 6. 验证修复结果
        const newConstraints = formatResults(db.exec('PRAGMA index_list(categories)'));
        console.log('\n修复后分类表约束:');
        newConstraints.forEach(row => {
            console.log('  ', row.name, ':', row.unique ? '(唯一)' : '', row.origin);
            if (row.name) {
                const indexInfo = formatResults(db.exec(`PRAGMA index_info(${row.name})`));
                indexInfo.forEach(info => {
                    console.log('    约束字段:', info.name);
                });
            }
        });
        
        // 7. 测试约束是否生效
        console.log('\n测试UNIQUE约束是否生效...');
        try {
            // 尝试插入重复分类
            const result = db.run(
                'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)',
                [999, '常用导航', 'fa fa-test', 999]
            );
            console.log('错误：应该阻止插入重复分类，但插入成功了！');
        } catch (error) {
            console.log('成功：插入重复分类被阻止！');
            console.log('错误信息:', error.message);
        }
        
        // 8. 检查链接数据是否完整
        const links = db.exec('SELECT COUNT(*) as count FROM links');
        const linkCount = formatResults(links)[0].count;
        console.log('\n链接数据数量:', linkCount);
        
    } catch (err) {
        console.error('修复失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

simpleFix();