const sqlite = require('sqlite');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 初始化数据库
async function initDatabase() {
    try {
        // 打开数据库连接
        const db = await sqlite.open({
            filename: DB_FILE,
            driver: sqlite3.Database
        });

        console.log('连接到SQLite数据库');

        // 创建表
        await db.run(`CREATE TABLE IF NOT EXISTS announcements (
            announcement_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('创建announcements表成功');

        await db.run(`CREATE TABLE IF NOT EXISTS categories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL,
            category_icon TEXT DEFAULT '',
            sort INTEGER DEFAULT 0
        )`);
        console.log('创建categories表成功');

        await db.run(`CREATE TABLE IF NOT EXISTS links (
            link_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            link_name TEXT NOT NULL,
            link_url TEXT NOT NULL,
            link_icon TEXT DEFAULT '',
            link_desc TEXT DEFAULT '',
            sort INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
        )`);
        console.log('创建links表成功');

        return db;
    } catch (err) {
        console.error('初始化数据库失败:', err);
        return null;
    }
}

// 数据迁移功能
async function migrateData() {
    try {
        // 打开数据库连接
        const db = await initDatabase();
        if (!db) return;

        // 迁移公告数据
        const announcementsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'announcements.json'), 'utf8'));
        
        // 清空公告表
        await db.run('DELETE FROM announcements');
        
        // 插入公告数据
        const insertAnnouncement = await db.prepare(`INSERT INTO announcements 
            (announcement_id, title, content, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`);
            
        for (const announcement of announcementsData) {
            await insertAnnouncement.run(
                announcement.announcement_id,
                announcement.title,
                announcement.content,
                announcement.is_active ? 1 : 0,
                announcement.created_at,
                announcement.updated_at
            );
        }
        
        await insertAnnouncement.finalize();
        console.log('公告数据迁移完成');
        
        // 迁移分类和书签数据
        const linksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'links.json'), 'utf8'));
        
        // 清空书签表
        await db.run('DELETE FROM links');
        // 清空分类表
        await db.run('DELETE FROM categories');
        
        // 插入分类和书签数据
        const insertCategory = await db.prepare(`INSERT INTO categories 
            (category_id, category_name, category_icon, sort) 
            VALUES (?, ?, ?, ?)`);
            
        const insertLink = await db.prepare(`INSERT INTO links 
            (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`);
            
        for (const category of linksData) {
            // 插入分类
            await insertCategory.run(
                category.category_id,
                category.category_name,
                category.category_icon,
                category.sort
            );
            
            // 插入书签
            for (const link of category.links) {
                await insertLink.run(
                    link.link_id,
                    category.category_id,
                    link.link_name,
                    link.link_url,
                    link.link_icon,
                    link.link_desc,
                    link.sort
                );
            }
        }
        
        await insertCategory.finalize();
        await insertLink.finalize();
        console.log('分类和书签数据迁移完成');

        // 关闭数据库连接
        await db.close();
        console.log('数据迁移完成');
        
    } catch (err) {
        console.error('数据迁移失败:', err);
    }
}

// 导出数据库操作函数
module.exports = {
    initDatabase,
    migrateData
};
