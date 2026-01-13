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
        
        // 2. 检查当前分类数据
        const categories = db.exec('SELECT * FROM categories');
        const categoryList = formatResults(categories);
        
        console.log('\n当前分类数据:');
        categoryList.forEach(category => {
            console.log('ID:', category.category_id, '名称:', category.category_name, '图标:', category.category_icon, '排序:', category.sort);
        });
        
        // 3. 检查是否有重复分类
        const categoryNames = new Set();
        const duplicateCategories = [];
        const uniqueCategories = [];
        
        categoryList.forEach(category => {
            if (category.category_name === null) {
                console.log('发现空名称分类:', category);
                return;
            }
            
            if (categoryNames.has(category.category_name)) {
                duplicateCategories.push(category);
                console.log('发现重复分类:', category);
            } else {
                categoryNames.add(category.category_name);
                uniqueCategories.push(category);
            }
        });
        
        console.log('\n当前分类数量:', categoryList.length);
        console.log('重复分类数量:', duplicateCategories.length);
        console.log('唯一分类数量:', uniqueCategories.length);
        
        // 4. 如果没有重复分类，直接添加UNIQUE约束
        if (duplicateCategories.length === 0) {
            console.log('\n没有重复分类，直接添加UNIQUE约束...');
            
            // 先添加临时表
            db.run(`
                CREATE TABLE IF NOT EXISTS categories_temp (
                    category_id INTEGER PRIMARY KEY,
                    category_name TEXT UNIQUE,
                    category_icon TEXT,
                    sort INTEGER
                )
            `);
            
            // 复制数据到临时表
            db.run('INSERT INTO categories_temp SELECT * FROM categories');
            
            // 导出链接数据
            const links = db.exec('SELECT * FROM links');
            const linkList = formatResults(links);
            
            // 删除旧表
            db.run('DROP TABLE IF EXISTS links');
            db.run('DROP TABLE IF EXISTS categories');
            
            // 重命名临时表为categories
            db.run('ALTER TABLE categories_temp RENAME TO categories');
            
            // 重新创建links表
            db.run(`
                CREATE TABLE links (
                    link_id INTEGER PRIMARY KEY,
                    category_id INTEGER,
                    link_name TEXT,
                    link_url TEXT,
                    link_icon TEXT,
                    link_desc TEXT,
                    sort INTEGER,
                    FOREIGN KEY (category_id) REFERENCES categories(category_id)
                )
            `);
            
            // 重新插入链接数据
            const linkStmt = db.prepare(
                'INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            
            linkList.forEach(link => {
                linkStmt.run(
                    link.link_id,
                    link.category_id,
                    link.link_name,
                    link.link_url,
                    link.link_icon,
                    link.link_desc,
                    link.sort
                );
            });
            
            linkStmt.free();
            
        } else {
            // 5. 如果有重复分类，需要清理后再添加约束
            console.log('\n有重复分类，需要清理...');
            
            // 导出链接数据
            const links = db.exec('SELECT * FROM links');
            const linkList = formatResults(links);
            
            // 创建新的分类映射表
            const categoryMap = new Map();
            const newCategoryIdMap = new Map();
            
            // 给唯一分类分配新ID
            uniqueCategories.forEach((category, index) => {
                const newId = index + 1;
                newCategoryIdMap.set(category.category_id, newId);
                categoryMap.set(newId, category);
            });
            
            // 清理链接数据，只保留属于唯一分类的链接
            const validLinks = linkList.filter(link => {
                return newCategoryIdMap.has(link.category_id);
            });
            
            // 更新链接的分类ID
            validLinks.forEach(link => {
                link.category_id = newCategoryIdMap.get(link.category_id);
            });
            
            // 重新创建表结构
            db.run('DROP TABLE IF EXISTS links');
            db.run('DROP TABLE IF EXISTS categories');
            
            // 创建新表
            db.run(`
                CREATE TABLE categories (
                    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_name TEXT UNIQUE,
                    category_icon TEXT,
                    sort INTEGER
                )
            `);
            
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
            
            // 重新插入分类数据
            const categoryStmt = db.prepare(
                'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)'
            );
            
            categoryMap.forEach((category, id) => {
                categoryStmt.run(
                    id,
                    category.category_name,
                    category.category_icon,
                    category.sort
                );
            });
            
            categoryStmt.free();
            
            // 重新插入链接数据
            const linkStmt = db.prepare(
                'INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            
            validLinks.forEach((link, index) => {
                linkStmt.run(
                    index + 1,
                    link.category_id,
                    link.link_name,
                    link.link_url,
                    link.link_icon,
                    link.link_desc,
                    link.sort
                );
            });
            
            linkStmt.free();
        }
        
        // 6. 保存数据库更改
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_FILE, buffer);
        
        console.log('\n修复完成！');
        
        // 7. 验证修复结果
        console.log('\n验证修复结果:');
        
        // 检查表结构
        const tableInfo = formatResults(db.exec('PRAGMA table_info(categories)'));
        console.log('categories表结构:');
        tableInfo.forEach(row => {
            console.log('  ', row.name, ':', row.type, row.pk ? '(主键)' : '', row.notnull ? '(非空)' : '');
        });
        
        // 检查约束
        const constraints = formatResults(db.exec('PRAGMA index_list(categories)'));
        console.log('categories表约束:');
        constraints.forEach(row => {
            console.log('  ', row.name, ':', row.unique ? '(唯一)' : '', row.origin);
            if (row.name) {
                const indexInfo = formatResults(db.exec(`PRAGMA index_info(${row.name})`));
                indexInfo.forEach(info => {
                    console.log('    约束字段:', info.name);
                });
            }
        });
        
        // 检查修复后的分类数据
        const fixedCategories = formatResults(db.exec('SELECT * FROM categories'));
        console.log('\n修复后分类数据:');
        fixedCategories.forEach(category => {
            console.log('  ID:', category.category_id, '名称:', category.category_name, '图标:', category.category_icon, '排序:', category.sort);
        });
        
        // 检查链接数据
        const fixedLinks = formatResults(db.exec('SELECT * FROM links LIMIT 5'));
        console.log('\n修复后链接数据（前5条）:');
        fixedLinks.forEach(link => {
            console.log('  ID:', link.link_id, '分类ID:', link.category_id, '名称:', link.link_name);
        });
        
    } catch (err) {
        console.error('修复重复分类失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

fixDuplicateCategories();