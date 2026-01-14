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
        }
        
        // 始终创建表结构（确保新表被添加）
        createTables(db);
        
        // 检查是否需要迁移搜索引擎数据
        await checkAndMigrateSearchEngines(db);
        
        // 如果是新数据库，迁移其他数据
        if (!fs.existsSync(DB_FILE)) {
            // 迁移数据
            await migrateData(db);
        }
        
        // 检查website_settings表是否有数据
        const websiteSettingsCheck = db.exec('SELECT COUNT(*) as count FROM website_settings');
        const websiteSettingsCount = websiteSettingsCheck && websiteSettingsCheck[0] && websiteSettingsCheck[0].values ? websiteSettingsCheck[0].values[0][0] : 0;
        
        // 如果website_settings表没有数据，初始化默认数据
        if (websiteSettingsCount === 0) {
            // 初始化网站设置数据
            const websiteSettingsData = [
                { key: 'site_title', value: '导航站', description: '网站标题' },
                { key: 'site_logo', value: '', description: '网站LOGO URL' },
                { key: 'site_keywords', value: '导航站,实用工具,网址导航', description: '站点关键词' },
                { key: 'site_description', value: '一个简洁实用的网址导航站', description: '站点描述' },
                { key: 'site_copyright', value: '© 2024 导航站. All rights reserved.', description: '版权信息' },
                { key: 'site_icp', value: '', description: '备案信息' },
                { key: 'site_footer', value: '', description: '自定义footer' },
                { key: 'site_footer_custom', value: '', description: '站点底部自定义HTML代码' }
            ];
            
            const websiteSettingStmt = db.prepare(`
                INSERT INTO website_settings (setting_key, setting_value, description, created_at, updated_at) 
                VALUES ($key, $value, $description, $created_at, $updated_at)
            `);
            
            const now = new Date().toISOString();
            
            websiteSettingsData.forEach(setting => {
                websiteSettingStmt.run({
                    $key: setting.key,
                    $value: setting.value,
                    $description: setting.description,
                    $created_at: now,
                    $updated_at: now
                });
            });
            
            websiteSettingStmt.free();
            console.log('网站设置数据初始化完成');
        }
        
        // 保存数据库更改（如果有）
        saveDatabase(db);
        
        return db;
    } catch (err) {
        console.error('初始化数据库失败:', err);
        return null;
    }
}

// 检查并迁移搜索引擎数据
async function checkAndMigrateSearchEngines(db) {
    try {
        // 检查搜索引擎表是否存在且为空
        const results = db.exec('SELECT * FROM search_engines');
        let engines = [];
        
        if (results && results[0] && results[0].values) {
            const columns = results[0].columns;
            engines = results[0].values.map(row => {
                const item = {};
                columns.forEach((column, index) => {
                    item[column] = row[index];
                });
                return item;
            });
        }
        
        if (engines.length === 0) {
            // 插入默认搜索引擎数据
            const searchEnginesData = [
                { engine_name: '百度搜索', engine_key: 'baidu', engine_url: 'https://www.baidu.com/s?wd=', sort: 1 },
                { engine_name: '谷歌搜索', engine_key: 'google', engine_url: 'https://www.google.com/search?q=', sort: 2 },
                { engine_name: '必应搜索', engine_key: 'bing', engine_url: 'https://www.bing.com/search?q=', sort: 3 },
                { engine_name: '360搜索', engine_key: 'so', engine_url: 'https://www.so.com/s?q=', sort: 4 }
            ];
            
            // 直接执行SQL插入语句
            searchEnginesData.forEach(engine => {
                db.run(
                    'INSERT INTO search_engines (engine_name, engine_key, engine_url, sort) VALUES (?, ?, ?, ?)',
                    [engine.engine_name, engine.engine_key, engine.engine_url, engine.sort]
                );
            });
            console.log('默认搜索引擎数据已添加');
        }
    } catch (error) {
        console.error('检查并迁移搜索引擎数据失败:', error);
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
    
    // 创建访问量表
    db.run(`
        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visit_date TEXT,
            visit_count INTEGER DEFAULT 1
        )
    `);
    
    // 创建搜索引擎表
    db.run(`
        CREATE TABLE IF NOT EXISTS search_engines (
            search_engine_id INTEGER PRIMARY KEY AUTOINCREMENT,
            engine_name TEXT NOT NULL,
            engine_key TEXT NOT NULL UNIQUE,
            engine_url TEXT NOT NULL,
            sort INTEGER DEFAULT 0
        )
    `);
    
    // 创建网站设置表
    db.run(`
        CREATE TABLE IF NOT EXISTS website_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT NOT NULL UNIQUE,
            setting_value TEXT,
            description TEXT,
            created_at TEXT,
            updated_at TEXT
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
    
    // 迁移搜索引擎数据
    const searchEnginesData = [
        { engine_name: '百度搜索', engine_key: 'baidu', engine_url: 'https://www.baidu.com/s?wd=', sort: 1 },
        { engine_name: '谷歌搜索', engine_key: 'google', engine_url: 'https://www.google.com/search?q=', sort: 2 },
        { engine_name: '必应搜索', engine_key: 'bing', engine_url: 'https://www.bing.com/search?q=', sort: 3 },
        { engine_name: '360搜索', engine_key: 'so', engine_url: 'https://www.so.com/s?q=', sort: 4 }
    ];
    
    const searchEngineStmt = db.prepare(`
        INSERT INTO search_engines (engine_name, engine_key, engine_url, sort) VALUES ($engine_name, $engine_key, $engine_url, $sort)
    `);
    
    searchEnginesData.forEach(engine => {
        searchEngineStmt.run({
            $engine_name: engine.engine_name,
            $engine_key: engine.engine_key,
            $engine_url: engine.engine_url,
            $sort: engine.sort
        });
    });
    
    searchEngineStmt.free();
    console.log('搜索引擎数据迁移完成');
    
    // 迁移网站设置数据
    const websiteSettingsData = [
        { key: 'site_title', value: '导航站', description: '网站标题' },
        { key: 'site_logo', value: '', description: '网站LOGO URL' },
        { key: 'site_keywords', value: '导航站,实用工具,网址导航', description: '站点关键词' },
        { key: 'site_description', value: '一个简洁实用的网址导航站', description: '站点描述' },
        { key: 'site_copyright', value: '© 2024 导航站. All rights reserved.', description: '版权信息' },
        { key: 'site_icp', value: '', description: '备案信息' },
        { key: 'site_footer', value: '', description: '自定义footer' },
        { key: 'site_footer_custom', value: '', description: '站点底部自定义HTML代码' }
    ];
    
    const websiteSettingStmt = db.prepare(`
        INSERT INTO website_settings (setting_key, setting_value, description, created_at, updated_at) 
        VALUES ($key, $value, $description, $created_at, $updated_at)
    `);
    
    const currentTime = new Date().toISOString();
    
    websiteSettingsData.forEach(setting => {
        websiteSettingStmt.run({
            $key: setting.key,
            $value: setting.value,
            $description: setting.description,
            $created_at: currentTime,
            $updated_at: currentTime
        });
    });
    
    websiteSettingStmt.free();
    console.log('网站设置数据迁移完成');
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
