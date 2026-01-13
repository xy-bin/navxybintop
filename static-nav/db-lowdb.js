const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db.json');

// 创建数据库实例
function createDatabase() {
    // 初始化数据库
    const adapter = new FileSync(DB_FILE);
    const db = lowdb(adapter);
    
    // 设置默认数据结构
    db.defaults({
        announcements: [],
        categories: [],
        links: []
    }).write();
    
    return db;
}

// 初始化数据库
function initDatabase() {
    try {
        const db = createDatabase();
        
        // 如果数据库为空，迁移现有数据
        if (db.get('announcements').value().length === 0 && db.get('categories').value().length === 0) {
            console.log('数据库为空，开始迁移数据');
            migrateData(db);
        } else {
            console.log('数据库已存在数据');
        }
        
        return db;
    } catch (err) {
        console.error('初始化数据库失败:', err);
        return null;
    }
}

// 数据迁移功能
function migrateData(db) {
    try {
        // 迁移公告数据
        const announcementsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'announcements.json'), 'utf8'));
        db.set('announcements', announcementsData).write();
        console.log('公告数据迁移完成');
        
        // 迁移分类和书签数据
        const linksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'links.json'), 'utf8'));
        
        // 提取分类数据
        const categories = linksData.map(category => ({
            category_id: category.category_id,
            category_name: category.category_name,
            category_icon: category.category_icon,
            sort: category.sort
        }));
        db.set('categories', categories).write();
        
        // 提取书签数据
        const links = linksData.flatMap(category => 
            category.links.map(link => ({
                link_id: link.link_id,
                category_id: category.category_id,
                link_name: link.link_name,
                link_url: link.link_url,
                link_icon: link.link_icon,
                link_desc: link.link_desc,
                sort: link.sort
            }))
        );
        db.set('links', links).write();
        
        console.log('分类和书签数据迁移完成');
        console.log('数据迁移完成');
        
    } catch (err) {
        console.error('数据迁移失败:', err);
    }
}

// 导出数据库操作函数
module.exports = {
    createDatabase,
    initDatabase,
    migrateData
};
