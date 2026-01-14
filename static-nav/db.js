const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 创建数据库连接
function createConnection() {
    return new sqlite3.Database(DB_FILE, (err) => {
        if (err) {
            console.error('连接数据库失败:', err.message);
        } else {
            console.log('连接到SQLite数据库');
        }
    });
}

// 初始化数据库
function initDatabase() {
    const db = createConnection();

    // 创建表
    db.serialize(() => {
        // 创建公告表
        db.run(`CREATE TABLE IF NOT EXISTS announcements (
            announcement_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('创建announcements表失败:', err.message);
            } else {
                console.log('创建announcements表成功');
            }
        });

        // 创建分类表
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL,
            category_icon TEXT DEFAULT '',
            sort INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('创建categories表失败:', err.message);
            } else {
                console.log('创建categories表成功');
            }
        });

        // 创建书签表
        db.run(`CREATE TABLE IF NOT EXISTS links (
            link_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            link_name TEXT NOT NULL,
            link_url TEXT NOT NULL,
            link_icon TEXT DEFAULT '',
            link_desc TEXT DEFAULT '',
            sort INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                console.error('创建links表失败:', err.message);
            } else {
                console.log('创建links表成功');
            }
        });
        
        // 创建搜索引擎表
        db.run(`CREATE TABLE IF NOT EXISTS search_engines (
            search_engine_id INTEGER PRIMARY KEY AUTOINCREMENT,
            engine_name TEXT NOT NULL,
            engine_key TEXT NOT NULL UNIQUE,
            engine_url TEXT NOT NULL,
            sort INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('创建search_engines表失败:', err.message);
            } else {
                console.log('创建search_engines表成功');
            }
        });
    });

    db.close((err) => {
        if (err) {
            console.error('关闭数据库连接失败:', err.message);
        } else {
            console.log('数据库初始化完成');
        }
    });
}

// 数据迁移功能
function migrateData() {
    const db = createConnection();
    
    // 迁移公告数据
    const announcementsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'announcements.json'), 'utf8'));
    
    db.serialize(() => {
        // 清空公告表
        db.run('DELETE FROM announcements');
        
        // 插入公告数据
        const stmt = db.prepare(`INSERT INTO announcements 
            (announcement_id, title, content, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`);
            
        announcementsData.forEach(announcement => {
            stmt.run(
                announcement.announcement_id,
                announcement.title,
                announcement.content,
                announcement.is_active ? 1 : 0,
                announcement.created_at,
                announcement.updated_at
            );
        });
        
        stmt.finalize();
        console.log('公告数据迁移完成');
        
        // 迁移分类和书签数据
        const linksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'links.json'), 'utf8'));
        
        // 清空书签表
        db.run('DELETE FROM links');
        // 清空分类表
        db.run('DELETE FROM categories');
        
        // 插入分类和书签数据
        const categoryStmt = db.prepare(`INSERT INTO categories 
            (category_id, category_name, category_icon, sort) 
            VALUES (?, ?, ?, ?)`);
            
        const linkStmt = db.prepare(`INSERT INTO links 
            (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`);
            
        linksData.forEach(category => {
            // 插入分类
            categoryStmt.run(
                category.category_id,
                category.category_name,
                category.category_icon,
                category.sort
            );
            
            // 插入书签
            category.links.forEach(link => {
                linkStmt.run(
                    link.link_id,
                    category.category_id,
                    link.link_name,
                    link.link_url,
                    link.link_icon,
                    link.link_desc,
                    link.sort
                );
            });
        });
        
        categoryStmt.finalize();
        linkStmt.finalize();
        console.log('分类和书签数据迁移完成');
        
        // 迁移搜索引擎数据
        const searchEnginesData = [
            { engine_name: '百度搜索', engine_key: 'baidu', engine_url: 'https://www.baidu.com/s?wd=', sort: 1 },
            { engine_name: '谷歌搜索', engine_key: 'google', engine_url: 'https://www.google.com/search?q=', sort: 2 },
            { engine_name: '必应搜索', engine_key: 'bing', engine_url: 'https://www.bing.com/search?q=', sort: 3 },
            { engine_name: '360搜索', engine_key: 'so', engine_url: 'https://www.so.com/s?q=', sort: 4 }
        ];
        
        // 清空搜索引擎表
        db.run('DELETE FROM search_engines');
        
        // 插入搜索引擎数据
        const searchEngineStmt = db.prepare(`INSERT INTO search_engines 
            (engine_name, engine_key, engine_url, sort) 
            VALUES (?, ?, ?, ?)`);
            
        searchEnginesData.forEach(engine => {
            searchEngineStmt.run(
                engine.engine_name,
                engine.engine_key,
                engine.engine_url,
                engine.sort
            );
        });
        
        searchEngineStmt.finalize();
        console.log('搜索引擎数据迁移完成');
    });
    
    db.close();
}

// 导出数据库操作函数
module.exports = {
    createConnection,
    initDatabase,
    migrateData
};
