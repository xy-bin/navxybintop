const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 初始化数据库
async function initDatabase() {
    try {
        const SQL = await initSqlJs();
        
        // 检查数据库文件是否存在
        let db;
        if (fs.existsSync(DB_FILE)) {
            // 读取现有数据库
            const fileBuffer = fs.readFileSync(DB_FILE);
            db = new SQL.Database(fileBuffer);
        } else {
            // 创建新数据库
            db = new SQL.Database();
            
            // 创建表结构
            createTables(db);
            
            // 迁移数据
            await migrateData(db);
            
            // 保存数据库到文件
            saveDatabase(db);
        }
        
        return db;
    } catch (err) {
        console.error('初始化数据库失败:', err);
        return null;
    }
}

// 创建表结构
function createTables(db) {
    // 创建公告表
    db.run(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            time TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        )
    `);
    
    // 创建分类表 - 添加UNIQUE约束防止重复分类名称
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            category_id INTEGER PRIMARY KEY,
            category_name TEXT UNIQUE,
            category_icon TEXT,
            sort INTEGER
        )
    `);
    
    // 创建链接表
    db.run(`
        CREATE TABLE IF NOT EXISTS links (
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
}

// 迁移数据
async function migrateData(db) {
    console.log('开始迁移数据...');
    
    // 迁移公告数据
    const announcementsPath = path.join(__dirname, 'data', 'announcements.json');
    const announcementsData = JSON.parse(fs.readFileSync(announcementsPath, 'utf8'));
    
    const announcementStmt = db.prepare(`
        INSERT INTO announcements (id, title, content, time, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    
    announcementsData.forEach((announcement, index) => {
        const isActive = announcement.is_active !== undefined ? announcement.is_active : true;
        announcementStmt.run(
            index + 1, 
            announcement.title, 
            announcement.content, 
            announcement.time, 
            isActive ? 1 : 0,
            now, 
            now
        );
    });
    
    announcementStmt.free();
    console.log('公告数据迁移完成');
    
    // 迁移分类和链接数据
    const linksPath = path.join(__dirname, 'data', 'links.json');
    const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));
    
    // 去重分类 - 基于分类名称
    const uniqueCategories = [];
    const categoryNames = new Set();
    
    linksData.forEach(category => {
        if (!categoryNames.has(category.category_name)) {
            categoryNames.add(category.category_name);
            uniqueCategories.push(category);
        }
    });
    
    const categoryStmt = db.prepare(`
        INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES ($category_id, $category_name, $category_icon, $sort)
    `);
    
    const linkStmt = db.prepare(`
        INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES ($link_id, $category_id, $link_name, $link_url, $link_icon, $link_desc, $sort)
    `);
    
    // 重新生成唯一的link_id
    let globalLinkId = 0;
    
    uniqueCategories.forEach(category => {
        // 插入分类 - 使用命名参数绑定
        categoryStmt.run({
            $category_id: category.category_id,
            $category_name: category.category_name,
            $category_icon: category.category_icon,
            $sort: category.sort
        });
        
        // 插入链接 - 使用全局唯一的link_id
        category.links.forEach(link => {
            globalLinkId++;
            linkStmt.run({
                $link_id: globalLinkId,
                $category_id: category.category_id,
                $link_name: link.link_name,
                $link_url: link.link_url,
                $link_icon: link.link_icon,
                $link_desc: link.link_desc,
                $sort: link.sort
            });
        });
    });
    
    categoryStmt.free();
    linkStmt.free();
    
    console.log('分类和链接数据迁移完成');
    console.log('数据迁移完成');
}

// 保存数据库到文件
function saveDatabase(db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
}

// 获取数据库实例
async function getDb() {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(DB_FILE);
    return new SQL.Database(fileBuffer);
}

// 保存数据库更改
function saveDbChanges(db) {
    saveDatabase(db);
}

module.exports = {
    initDatabase,
    getDb,
    saveDbChanges
};
