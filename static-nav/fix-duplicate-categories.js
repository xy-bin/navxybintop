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

async function fixDuplicateCategories() {
    try {
        console.log('开始修复重复分类问题...');
        
        // 1. 备份当前数据库
        if (fs.existsSync(DB_FILE)) {
            fs.copyFileSync(DB_FILE, BACKUP_FILE);
            console.log('已创建数据库备份:', BACKUP_FILE);
        }
        
        const SQL = await initSqlJs();
        
        // 读取数据库文件
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        // 2. 导出当前分类数据并去重
        const categories = db.exec('SELECT * FROM categories');
        const categoryList = formatResults(categories);
        
        console.log('\n当前分类数量:', categoryList.length);
        
        // 去重分类 - 保留第一个出现的分类
        const uniqueCategoriesMap = new Map();
        const duplicateCategories = [];
        
        categoryList.forEach(category => {
            if (uniqueCategoriesMap.has(category.category_name)) {
                duplicateCategories.push(category);
                console.log('发现重复分类:', category);
            } else {
                uniqueCategoriesMap.set(category.category_name, category);
            }
        });
        
        const uniqueCategories = Array.from(uniqueCategoriesMap.values());
        console.log('去重后分类数量:', uniqueCategories.length);
        
        // 3. 导出链接数据
        const links = db.exec('SELECT * FROM links');
        const linkList = formatResults(links);
        
        console.log('\n当前链接数量:', linkList.length);
        
        // 4. 创建新的分类映射表（旧ID -> 新ID）
        const categoryIdMap = new Map();
        uniqueCategories.forEach((category, index) => {
            categoryIdMap.set(category.category_id, index + 1);
        });
        
        // 5. 重新创建表结构
        console.log('\n重新创建表结构...');
        
        // 删除现有表
        db.run('DROP TABLE IF EXISTS links');
        db.run('DROP TABLE IF EXISTS categories');
        
        // 重新创建categories表（带UNIQUE约束）
        db.run(`
            CREATE TABLE categories (
                category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_name TEXT UNIQUE,
                category_icon TEXT,
                sort INTEGER
            )
        `);
        
        // 重新创建links表
        db.run(`
            CREATE TABLE links (
                link_id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER,
                link_name TEXT,
                link_url TEXT,
                link_icon TEXT,
                link_desc TEXT,
                sort INTEGER,
                FOREIGN KEY (category_id) REFERENCES categories(category_id)
            )
        `);
        
        // 6. 重新插入去重后的分类数据
        console.log('\n重新插入分类数据...');
        
        const categoryStmt = db.prepare(
            'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)'
        );
        
        uniqueCategories.forEach((category, index) => {
            const newId = index + 1;
            categoryStmt.run(
                newId,
                category.category_name,
                category.category_icon,
                category.sort
            );
        });
        
        categoryStmt.free();
        
        // 7. 重新插入链接数据，更新category_id引用
        console.log('\n重新插入链接数据...');
        
        const linkStmt = db.prepare(
            'INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        let linkCount = 0;
        linkList.forEach((link, index) => {
            const oldCategoryId = link.category_id;
            const newCategoryId = categoryIdMap.get(oldCategoryId);
            
            if (newCategoryId) {
                linkStmt.run(
                    index + 1,
                    newCategoryId,
                    link.link_name,
                    link.link_url,
                    link.link_icon,
                    link.link_desc,
                    link.sort
                );
                linkCount++;
            } else {
                console.log('跳过无效链接（分类不存在）:', link);
            }
        });
        
        linkStmt.free();
        
        // 8. 保存数据库更改
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
        
        console.log('\n修复完成！');
        console.log('删除了', duplicateCategories.length, '个重复分类');
        console.log('保留了', uniqueCategories.length, '个唯一分类');
        console.log('重新插入了', linkCount, '个链接');
        
        // 9. 验证修复结果
        console.log('\n验证修复结果:');
        
        // 检查分类表结构
        const tableInfo = formatResults(db.exec('PRAGMA table_info(categories)'));
        console.log('\ncategories表结构:');
        tableInfo.forEach(row => console.log(row));
        
        // 检查UNIQUE约束
        const constraints = formatResults(db.exec('PRAGMA index_list(categories)'));
        console.log('\ncategories表约束:');
        constraints.forEach(row => console.log(row));
        
        // 检查修复后的分类
        const fixedCategories = formatResults(db.exec('SELECT * FROM categories'));
        console.log('\n修复后分类数量:', fixedCategories.length);
        fixedCategories.forEach(category => {
            console.log(category);
        });
        
    } catch (err) {
        console.error('修复重复分类失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

fixDuplicateCategories();