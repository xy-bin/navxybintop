const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const https = require('https');

// 导入SQLite数据库模块
const { initDatabase, getDb, saveDbChanges } = require('./db-sqlite.js');

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite数据库实例
let db = null;

// 初始化数据库
async function setupDatabase() {
    try {
        db = await initDatabase();
        console.log('SQLite数据库连接成功');
    } catch (error) {
        console.error('SQLite数据库连接失败:', error);
        process.exit(1);
    }
}

// 会话配置
app.use(session({
    secret: 'your-secret-key-change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        secure: false, // 在生产环境中设置为true
        httpOnly: true
    }
}));

// 管理员用户（实际项目中应该存储在数据库中）
const adminUser = {
    id: 1,
    username: 'xybin',
    // 密码：zxcvbnm...（已加密）
    password: '$2b$10$ZtZRznW0MjLHSo8GNtIWq.ISQAq5BZ9SfMj7v8N1kHwSYw6cAnh.G'
};

// 一键添加书签的Token（用于验证请求合法性）
const jsAddToken = '291b848e68a5949f3e57b5490015b02f';

// 检查用户是否已登录的中间件
function isAuthenticated(req, res, next) {
    // 允许公开访问的端点和页面
    const publicEndpoints = [
        '/api/categories',
        '/api/public/categories',
        '/api/announcements',
        '/api/search-engines',
        '/api/test'
    ];
    
    // 公开页面
    const publicPages = [
        '/login.html',
        '/index.html',
        '/api/login',
        '/api/logout',
        '/api/check-login'
    ];
    
    // 如果请求路径在公开端点或公开页面列表中，直接通过
    if (publicEndpoints.includes(req.path) || publicPages.includes(req.path)) {
        return next();
    }
    
    // 检查会话
    if (req.session && req.session.userId) {
        return next();
    } else {
        // 对于HTML页面请求，重定向到登录页面
        if (req.path.endsWith('.html')) {
            return res.redirect('/login.html');
        }
        // 对于API请求，返回JSON错误信息
        return res.status(401).json({ success: false, message: '请先登录' });
    }
}

// 全局请求日志中间件
app.use((req, res, next) => {
    console.log(`收到请求: ${req.method} ${req.path}`);
    next();
});

// 中间件配置
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// 公开的分类端点（放在所有路由的最前面）
app.get('/api/categories', (req, res) => {
    console.log('收到GET /api/categories请求');
    try {
        const db = getDatabase();
        const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        
        // 为每个分类获取链接数量
        const categoriesWithCount = categories.map(category => {
            const linkCountResult = formatResults(db.exec(`SELECT COUNT(*) as count FROM links WHERE category_id = ${category.category_id}`));
            return {
                ...category,
                link_count: linkCountResult[0].count || 0
            };
        });
        
        res.json({ success: true, data: categoriesWithCount });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// 公开的分类端点（用于书签提交和前端显示）
app.get('/api/public/categories', (req, res) => {
    console.log('收到GET /api/public/categories请求');
    try {
        const db = getDatabase();
        const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        console.log('返回分类数据:', categories.length, '个分类');
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// 测试端点（放在所有路由之前）
app.get('/api/test', (req, res) => {
    console.log('收到GET /api/test请求');
    res.json({ success: true, message: '测试端点工作正常' });
});

// 登录API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 检查用户名
    if (username !== adminUser.username) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    // 检查密码
    bcrypt.compare(password, adminUser.password, (err, isMatch) => {
        if (err) {
            console.error('密码比较错误:', err);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        
        if (isMatch) {
            // 登录成功，创建会话
            req.session.userId = adminUser.id;
            req.session.username = adminUser.username;
            return res.json({ success: true, message: '登录成功' });
        } else {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
    });
});

// 登出API
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('登出错误:', err);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        res.json({ success: true, message: '登出成功' });
    });
});

// 简单测试API端点（不依赖数据库）
app.get('/api/simple-test', (req, res) => {
    res.send('简单测试API正常工作');
});

// 网站设置API

// 获取所有网站设置
app.get('/api/website-settings', (req, res) => {
    try {
        const results = db.exec('SELECT setting_key, setting_value FROM website_settings');
        
        // 转换为键值对格式
        const settingsMap = {};
        if (results && results.length > 0 && results[0].values) {
            const rows = results[0].values;
            const columns = results[0].columns;
            
            rows.forEach(row => {
                const setting = {};
                columns.forEach((column, index) => {
                    setting[column] = row[index];
                });
                settingsMap[setting.setting_key] = setting.setting_value;
            });
        }
        
        res.json({ success: true, data: settingsMap });
    } catch (error) {
        console.error('获取网站设置失败:', error);
        res.status(500).json({ success: false, message: '获取网站设置失败' });
    }
});

// 保存网站设置
app.post('/api/website-settings', isAuthenticated, (req, res) => {
    try {
        const settings = req.body;
        const now = new Date().toISOString();
        
        // 确保数据库实例存在
        if (!db) {
            return res.status(500).json({ success: false, message: '数据库连接失败' });
        }
        
        // 更新每个设置项
        for (const [key, value] of Object.entries(settings)) {
            // 检查记录是否存在，如果不存在则插入
            const checkResult = db.exec(`SELECT COUNT(*) as count FROM website_settings WHERE setting_key = '${key}'`);
            const count = checkResult && checkResult[0] && checkResult[0].values ? checkResult[0].values[0][0] : 0;
            
            if (count > 0) {
                // 更新现有记录
                db.run(
                    `UPDATE website_settings 
                     SET setting_value = ?, updated_at = ? 
                     WHERE setting_key = ?`,
                    [value, now, key]
                );
            } else {
                // 插入新记录
                db.run(
                    `INSERT INTO website_settings (setting_key, setting_value, description, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [key, value, `${key}设置`, now, now]
                );
            }
        }
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '网站设置保存成功' });
    } catch (error) {
        console.error('保存网站设置失败:', error);
        res.status(500).json({ success: false, message: `保存网站设置失败: ${error.message}` });
    }
});

// 检查登录状态API
app.get('/api/check-login', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ success: true, loggedIn: true, username: req.session.username });
    } else {
        res.json({ success: true, loggedIn: false });
    }
});

// API端点：获取网站描述（需要登录）
app.get('/api/website-description', isAuthenticated, async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.json({ success: false, description: '' });
    }
    
    // 确保URL有协议前缀
    let fullUrl = url;
    if (!fullUrl.includes('://')) {
        fullUrl = 'http://' + fullUrl;
    }
    
    // 尝试从缓存中获取描述（可选功能，提高性能）
    const cacheKey = `description_${fullUrl}`;
    
    // 这里可以实现缓存逻辑，暂时跳过
    
    // 使用Node.js内置模块和cheerio的替代方案
    // 直接使用正则表达式提取描述信息
    try {
        const http = require('http');
        const https = require('https');
        const parsedUrl = new URL(fullUrl);
        const protocolModule = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000
        };
        
        const responseData = await new Promise((resolve, reject) => {
            let data = '';
            const req = protocolModule.request(options, (res) => {
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve(data);
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });
            
            req.end();
        });
        
        let description = '';
        let icon = '';
        
        // 使用正则表达式提取description元标签
        const descriptionRegex = /<meta[^>]*name\s*=\s*["']?description["']?[^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i;
        const descriptionMatch = responseData.match(descriptionRegex);
        if (descriptionMatch && descriptionMatch[1]) {
            description = descriptionMatch[1].trim();
        }
        
        // 如果没有找到description，尝试提取og:description
        if (!description) {
            const ogDescriptionRegex = /<meta[^>]*property\s*=\s*["']?og:description["']?[^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i;
            const ogDescriptionMatch = responseData.match(ogDescriptionRegex);
            if (ogDescriptionMatch && ogDescriptionMatch[1]) {
                description = ogDescriptionMatch[1].trim();
            }
        }
        
        // 如果没有找到描述，尝试提取页面标题
        if (!description) {
            const titleRegex = /<title[^>]*>([^<]*)<\/title>/i;
            const titleMatch = responseData.match(titleRegex);
            if (titleMatch && titleMatch[1]) {
                description = titleMatch[1].trim();
            }
        }
        
        // 提取网站图标
        // 首先尝试提取favicon或shortcut icon
        const iconRegex = /<link[^>]*rel\s*=\s*["']?(?:shortcut\s+)?icon["']?[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/i;
        const iconMatch = responseData.match(iconRegex);
        if (iconMatch && iconMatch[1]) {
            icon = iconMatch[1].trim();
            
            // 如果图标URL是相对路径，转换为绝对路径
            if (!icon.startsWith('http://') && !icon.startsWith('https://')) {
                const iconUrl = new URL(icon, fullUrl);
                icon = iconUrl.href;
            }
        } else {
            // 如果没有找到图标标签，尝试使用默认的favicon.ico
            try {
                const defaultIconUrl = new URL('/favicon.ico', fullUrl);
                icon = defaultIconUrl.href;
            } catch (e) {
                // 忽略无效的URL
                icon = '';
            }
        }
        
        // 清理描述
        description = description.trim();
        
        // 限制描述长度为200个字符
        if (description.length > 200) {
            description = description.substring(0, 200) + '...';
        }
        
        // 可以添加缓存逻辑
        res.json({ success: true, description, icon });
    } catch (error) {
        console.warn('获取网站描述和图标失败:', url, error.message);
        res.json({ success: true, description: '', icon: '' });
    }
});

// 添加Content Security Policy头
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
  );
  next();
});

// 测试端点（放在所有中间件之前）
app.get('/api/test', (req, res) => {
    console.log('收到GET /api/test请求');
    res.json({ success: true, message: '测试端点工作正常' });
});

// 确保所有JSON API响应使用UTF-8编码
app.use('/api/', (req, res, next) => {
  // 不为/api/v1/jsadd端点设置JSON Content-Type，因为它返回HTML
  // 注意：req.path是相对于/api/的，所以路径是/v1/jsadd
  if (req.path !== '/v1/jsadd') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// 保护管理后台页面
app.get('/admin.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 辅助函数：获取数据库实例
function getDatabase() {
    if (!db) {
        throw new Error('数据库尚未初始化');
    }
    return db;
}

// 辅助函数：格式化查询结果
function formatResults(results) {
    try {
        if (!results || results.length === 0) {
            return [];
        }
        
        const result = results[0];
        if (!result || !result.values) {
            return [];
        }
        
        const columns = result.columns;
        return result.values.map(row => {
            const obj = {};
            columns.forEach((column, index) => {
                obj[column] = row[index] !== null ? row[index] : null;
            });
            return obj;
        });
    } catch (error) {
        console.error('formatResults函数出错:', error);
        return [];
    }
}

// 记录访问量的中间件
function trackVisits(req, res, next) {
    // 跟踪所有页面的访问量，但排除API调用和静态资源
    const isApiCall = req.path.startsWith('/api/');
    const isStaticResource = /\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);
    
    if (!isApiCall && !isStaticResource) {
        try {
            const db = getDatabase();
            const today = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD
            
            // 检查今天的访问记录是否存在
            const existingVisit = formatResults(db.exec(`SELECT * FROM visits WHERE visit_date = '${today}'`));
            
            if (existingVisit.length > 0) {
                // 更新现有记录
                db.run(`UPDATE visits SET visit_count = visit_count + 1 WHERE visit_date = '${today}'`);
            } else {
                // 创建新记录
                db.run(`INSERT INTO visits (visit_date, visit_count) VALUES ('${today}', 1)`);
            }
            
            // 保存数据库更改
            saveDbChanges(db);
        } catch (error) {
            console.error('记录访问量失败:', error);
        }
    }
    
    next();
}

// 应用访问量跟踪中间件
app.use(trackVisits);

// API端点：获取所有数据（公开访问）
app.get('/api/data', async (req, res) => {
    try {
        const db = getDatabase();
        
        // 获取所有分类
        const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        
        // 为每个分类获取链接
        const result = await Promise.all(categories.map(async category => {
            const links = formatResults(db.exec(`SELECT * FROM links WHERE category_id = ${category.category_id} ORDER BY sort ASC`));
            return {
                ...category,
                links: links
            };
        }));
        
        res.json(result);
    } catch (error) {
        console.error('获取数据失败:', error);
        res.status(500).json({ success: false, message: '获取数据失败' });
    }
});

// API端点：获取所有书签（用于管理后台，需要登录）
app.get('/api/bookmarks', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        
        // 执行联合查询，获取所有书签及其分类名称
        const query = `
            SELECT 
                l.link_id as bookmark_id,
                l.link_name as bookmark_name,
                l.link_url as bookmark_url,
                l.link_icon as bookmark_icon,
                l.link_desc as bookmark_description,
                l.sort as sort,
                IFNULL(c.category_name, '未分类') as category_name,
                IFNULL(c.category_id, 0) as category_id
            FROM 
                links l
            LEFT JOIN 
                categories c ON l.category_id = c.category_id
            ORDER BY 
                l.sort ASC
        `;
        
        const bookmarks = formatResults(db.exec(query));
        res.json({ success: true, data: bookmarks });
    } catch (error) {
        console.error('获取书签失败:', error);
        res.status(500).json({ success: false, message: '获取书签失败' });
    }
});

// API端点：获取单个书签（用于管理后台，需要登录）
app.get('/api/bookmarks/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const bookmarkId = parseInt(req.params.id);
        
        // 执行联合查询，获取单个书签及其分类信息
        const query = `
            SELECT 
                l.link_id as bookmark_id,
                l.link_name as bookmark_name,
                l.link_url as bookmark_url,
                l.link_icon as bookmark_icon,
                l.link_desc as bookmark_description,
                l.sort as sort,
                IFNULL(c.category_name, '未分类') as category_name,
                IFNULL(c.category_id, 0) as category_id
            FROM 
                links l
            LEFT JOIN 
                categories c ON l.category_id = c.category_id
            WHERE 
                l.link_id = ${bookmarkId}
        `;
        
        const bookmarks = formatResults(db.exec(query));
        
        if (bookmarks.length === 0) {
            return res.status(404).json({ success: false, message: '书签不存在' });
        }
        
        res.json({ success: true, data: bookmarks[0] });
    } catch (error) {
        console.error('获取书签详情失败:', error);
        res.status(500).json({ success: false, message: '获取书签详情失败' });
    }
});

// API端点：一键添加书签（用于外部网站的书签工具栏按钮，不需要登录但需要验证token）
// 为这个特定端点设置Content-Type中间件
app.get('/api/v1/jsadd', (req, res, next) => {
    // 明确设置Content-Type为HTML，覆盖任何之前的设置
    res.header('Content-Type', 'text/html; charset=utf-8');
    next();
}, async (req, res) => {
    try {
        // 验证token
        const { token, name, url } = req.query;
        
        if (token !== jsAddToken) {
            return res.status(401).send(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>未授权</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                            color: #333;
                            overflow: hidden;
                        }
                        
                        .error-container {
                            background: white;
                            border-radius: 16px;
                            padding: 3rem;
                            text-align: center;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                            animation: fadeIn 0.5s ease-out;
                            max-width: 400px;
                            width: 90%;
                            overflow: hidden;
                        }
                        
                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                                transform: translateY(-20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        
                        .error-icon {
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0 auto 1.5rem;
                            animation: bounce 1s ease-out;
                        }
                        
                        @keyframes bounce {
                            0%, 100% {
                                transform: scale(1);
                            }
                            50% {
                                transform: scale(1.1);
                            }
                        }
                        
                        .error-icon::before {
                            content: '×';
                            color: white;
                            font-size: 48px;
                            font-weight: bold;
                        }
                        
                        h1 {
                            font-size: 2rem;
                            margin-bottom: 1rem;
                            color: #2d3748;
                        }
                        
                        p {
                            font-size: 1.1rem;
                            margin-bottom: 2rem;
                            color: #4a5568;
                            line-height: 1.5;
                        }
                        
                        .close-btn {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                        }
                        
                        .close-btn:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                        }
                        
                        @media (max-width: 480px) {
                            .error-container {
                                padding: 2rem 1.5rem;
                            }
                            
                            h1 {
                                font-size: 1.5rem;
                            }
                            
                            p {
                                font-size: 1rem;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <div class="error-icon"></div>
                        <h1>未授权</h1>
                        <p>无效的token，请检查您的书签代码是否正确。</p>
                        <button class="close-btn" onclick="window.parent.postMessage('close-modal', '*')">关闭窗口</button>
                    </div>
                </body>
                </html>
            `);
        }
        
        if (!name || !url) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>参数错误</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                            color: #333;
                        }
                        
                        .error-container {
                            background: white;
                            border-radius: 16px;
                            padding: 3rem;
                            text-align: center;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                            animation: fadeIn 0.5s ease-out;
                            max-width: 400px;
                            width: 90%;
                        }
                        
                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                                transform: translateY(-20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        
                        .error-icon {
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0 auto 1.5rem;
                            animation: bounce 1s ease-out;
                        }
                        
                        @keyframes bounce {
                            0%, 100% {
                                transform: scale(1);
                            }
                            50% {
                                transform: scale(1.1);
                            }
                        }
                        
                        .error-icon::before {
                            content: '×';
                            color: white;
                            font-size: 48px;
                            font-weight: bold;
                        }
                        
                        h1 {
                            font-size: 2rem;
                            margin-bottom: 1rem;
                            color: #2d3748;
                        }
                        
                        p {
                            font-size: 1.1rem;
                            margin-bottom: 2rem;
                            color: #4a5568;
                            line-height: 1.5;
                        }
                        
                        .close-btn {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                        }
                        
                        .close-btn:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                        }
                        
                        @media (max-width: 480px) {
                            .error-container {
                                padding: 2rem 1.5rem;
                            }
                            
                            h1 {
                                font-size: 1.5rem;
                            }
                            
                            p {
                                font-size: 1rem;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <div class="error-icon"></div>
                        <h1>参数错误</h1>
                        <p>缺少必要的参数，请确保网址和名称都已提供。</p>
                        <button class="close-btn" onclick="window.parent.postMessage('close-modal', '*')">关闭窗口</button>
                    </div>
                </body>
                </html>
            `);
        }
        
        const db = getDatabase();
        
        // 检查URL是否已存在
        const existingLinks = formatResults(db.exec(`SELECT * FROM links WHERE link_url = '${url}'`));
        if (existingLinks.length > 0) {
            return res.send(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>书签已存在</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                            color: #333;
                        }
                        
                        .error-container {
                            background: white;
                            border-radius: 16px;
                            padding: 3rem;
                            text-align: center;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                            animation: fadeIn 0.5s ease-out;
                            max-width: 400px;
                            width: 90%;
                        }
                        
                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                                transform: translateY(-20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        
                        .error-icon {
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0 auto 1.5rem;
                            animation: bounce 1s ease-out;
                        }
                        
                        @keyframes bounce {
                            0%, 100% {
                                transform: scale(1);
                            }
                            50% {
                                transform: scale(1.1);
                            }
                        }
                        
                        .error-icon::before {
                            content: '×';
                            color: white;
                            font-size: 48px;
                            font-weight: bold;
                        }
                        
                        h1 {
                            font-size: 2rem;
                            margin-bottom: 1rem;
                            color: #2d3748;
                        }
                        
                        p {
                            font-size: 1.1rem;
                            margin-bottom: 2rem;
                            color: #4a5568;
                            line-height: 1.5;
                        }
                        
                        .close-btn {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                        }
                        
                        .close-btn:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                        }
                        
                        @media (max-width: 480px) {
                            .error-container {
                                padding: 2rem 1.5rem;
                            }
                            
                            h1 {
                                font-size: 1.5rem;
                            }
                            
                            p {
                                font-size: 1rem;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <div class="error-icon"></div>
                        <h1>书签已存在</h1>
                        <p>该网址已经存在于您的书签列表中。</p>
                        <button class="close-btn" onclick="window.parent.postMessage('close-modal', '*')">关闭窗口</button>
                    </div>
                </body>
                </html>
            `);
        }
        
        // 确保有有效的分类ID，默认使用"未分类"分类
        let categoryId = null;
        
        // 首先检查是否存在"未分类"分类
        const uncategorizedCategory = formatResults(db.exec("SELECT * FROM categories WHERE category_name = '未分类'"));
        
        if (uncategorizedCategory.length > 0) {
            categoryId = uncategorizedCategory[0].category_id;
        } else {
            // 检查是否有其他分类
            const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
            
            if (categories.length > 0) {
                // 如果有其他分类，创建"未分类"分类
                const maxCategoryIdResult = formatResults(db.exec('SELECT MAX(category_id) as max_id FROM categories'));
                const maxCategoryIdValue = maxCategoryIdResult.length > 0 && maxCategoryIdResult[0] && maxCategoryIdResult[0].max_id !== null ? maxCategoryIdResult[0].max_id : 0;
                categoryId = maxCategoryIdValue + 1;
                
                db.exec(`INSERT INTO categories (category_id, category_name, sort) VALUES (${categoryId}, '未分类', 0)`);
                saveDbChanges(db);
            } else {
                // 如果没有任何分类，创建"未分类"分类
                categoryId = 1;
                db.exec(`INSERT INTO categories (category_id, category_name, sort) VALUES (${categoryId}, '未分类', 0)`);
                saveDbChanges(db);
            }
        }
        
        // 生成书签ID
        const maxBookmarkIdResult = formatResults(db.exec('SELECT MAX(link_id) as max_id FROM links'));
        const maxBookmarkIdValue = maxBookmarkIdResult.length > 0 && maxBookmarkIdResult[0] && maxBookmarkIdResult[0].max_id !== null ? maxBookmarkIdResult[0].max_id : 0;
        const newBookmarkId = maxBookmarkIdValue + 1;
        
        // 获取当前时间
        const currentTime = new Date().toISOString();
        
        // 尝试获取网站的描述和图标
        let linkIcon = '';
        let linkDesc = '';
        
        // 仅在开发或测试环境中启用此功能
        // 注意：生产环境中应该使用更安全的HTML解析方法
        const fetchWebsiteInfo = (url) => {
            return new Promise((resolve, reject) => {
                // 检查URL是否以https开头
                if (!url.startsWith('https://')) {
                    resolve({ desc: '', icon: '' });
                    return;
                }
                
                // 解析URL获取主机名
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                
                const options = {
                    hostname: hostname,
                    path: '/',
                    method: 'GET',
                    timeout: 5000
                };
                
                const req = https.request(options, (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            // 添加调试信息
                            console.log('尝试解析网站HTML内容');
                            console.log('HTML内容前500字符:', data.substring(0, 500));
                            
                            // 使用正则表达式获取网站描述
                            const descPattern = /<meta[^>]*name=["'](?:description|Description)["'][^>]*content=["']([^"']+)["']/i;
                            const ogDescPattern = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i;
                            
                            let desc = '';
                            const descMatch = data.match(descPattern);
                            if (descMatch) {
                                desc = descMatch[1] || '';
                                console.log('找到网站描述:', desc);
                            } else {
                                console.log('未找到常规网站描述');
                                const ogDescMatch = data.match(ogDescPattern);
                                if (ogDescMatch) {
                                    desc = ogDescMatch[1] || '';
                                    console.log('找到OG网站描述:', desc);
                                } else {
                                    console.log('未找到任何网站描述');
                                }
                            }
                            
                            // 使用正则表达式获取网站图标
                            const iconPattern = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i;
                            let icon = '';
                            const iconMatch = data.match(iconPattern);
                            if (iconMatch) {
                                icon = iconMatch[1] || '';
                                console.log('找到网站图标:', icon);
                                
                                // 如果图标是相对路径，转换为绝对路径
                                if (icon && !icon.startsWith('http://') && !icon.startsWith('https://')) {
                                    if (icon.startsWith('/')) {
                                        icon = `${urlObj.protocol}//${hostname}${icon}`;
                                    } else {
                                        icon = `${urlObj.protocol}//${hostname}/${icon}`;
                                    }
                                    console.log('转换后的绝对图标路径:', icon);
                                }
                            } else {
                                console.log('未找到网站图标');
                            }
                            
                            resolve({ desc, icon });
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('请求超时'));
                });
                
                req.end();
            });
        };
        
        try {
            const websiteInfo = await fetchWebsiteInfo(url);
            linkIcon = websiteInfo.icon;
            linkDesc = websiteInfo.desc;
        } catch (error) {
            console.error('获取网站描述和图标失败:', error.message);
            // 如果获取失败，使用空字符串
            linkIcon = '';
            linkDesc = '';
        }
        
        // 直接执行插入语句（避免使用prepared statement的finalize方法）
        db.exec(`
            INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort)
            VALUES (${newBookmarkId}, ${categoryId}, '${name}', '${url}', '${linkIcon}', '${linkDesc}', 0)
        `);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 返回美观的成功提示HTML页面
        res.send(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>书签添加成功</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: #333;
                            overflow: hidden;
                        }
                    
                    .success-container {
                            background: white;
                            border-radius: 16px;
                            padding: 2rem;
                            text-align: center;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                            animation: fadeIn 0.5s ease-out;
                            max-width: 400px;
                            width: 90%;
                            overflow: hidden;
                        }
                    
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .success-icon {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin: 0 auto 1.5rem;
                        animation: bounce 1s ease-out;
                    }
                    
                    @keyframes bounce {
                        0%, 100% {
                            transform: scale(1);
                        }
                        50% {
                            transform: scale(1.1);
                        }
                    }
                    
                    .success-icon::before {
                        content: '✓';
                        color: white;
                        font-size: 48px;
                        font-weight: bold;
                    }
                    
                    h1 {
                        font-size: 2rem;
                        margin-bottom: 1rem;
                        color: #2d3748;
                    }
                    
                    p {
                        font-size: 1.1rem;
                        margin-bottom: 2rem;
                        color: #4a5568;
                        line-height: 1.5;
                    }
                    
                    .details {
                        background: #f7fafc;
                        padding: 1rem;
                        border-radius: 8px;
                        margin-bottom: 2rem;
                        text-align: left;
                    }
                    
                    .detail-item {
                        margin-bottom: 0.5rem;
                        font-size: 0.9rem;
                    }
                    
                    .detail-label {
                        font-weight: 600;
                        color: #2d3748;
                    }
                    
                    .detail-value {
                        color: #4a5568;
                        word-break: break-all;
                    }
                    
                    .close-btn {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    }
                    
                    .close-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                    }
                    
                    .timer {
                        margin-top: 1rem;
                        font-size: 0.9rem;
                        color: #718096;
                    }
                    
                    @media (max-width: 480px) {
                        .success-container {
                            padding: 2rem 1.5rem;
                        }
                        
                        h1 {
                            font-size: 1.5rem;
                        }
                        
                        p {
                            font-size: 1rem;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="success-container">
                    <div class="success-icon"></div>
                    <h1>书签添加成功！</h1>
                    <p>您的网站已成功添加到书签列表中。</p>
                    <div class="details">
                        <div class="detail-item">
                            <span class="detail-label">网站名称：</span>
                            <span class="detail-value">${name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">网站地址：</span>
                            <span class="detail-value">${url}</span>
                        </div>
                    </div>
                    <button class="close-btn" onclick="window.parent.postMessage('close-modal', '*')">关闭窗口</button>
                    <div class="timer">窗口将在 <span id="countdown">3</span> 秒后自动关闭...</div>
                </div>
                
                <script>
                    // 倒计时自动关闭窗口
                    let countdown = 3;
                    const countdownElement = document.getElementById('countdown');
                    
                    const timer = setInterval(() => {
                        countdown--;
                        countdownElement.textContent = countdown;
                        
                        if (countdown <= 0) {
                            clearInterval(timer);
                            window.parent.postMessage('close-modal', '*');
                        }
                    }, 1000);
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('一键添加书签失败:', error);
        // 返回美观的错误提示HTML页面
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>添加书签失败</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        color: #333;
                        overflow: hidden;
                    }
                    
                    .error-container {
                        background: white;
                        border-radius: 16px;
                        padding: 2rem;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        animation: fadeIn 0.5s ease-out;
                        max-width: 400px;
                        width: 90%;
                        overflow: hidden;
                    }
                    
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .error-icon {
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin: 0 auto 1.5rem;
                        animation: bounce 1s ease-out;
                    }
                    
                    @keyframes bounce {
                        0%, 100% {
                            transform: scale(1);
                        }
                        50% {
                            transform: scale(1.1);
                        }
                    }
                    
                    .error-icon::before {
                        content: '×';
                        color: white;
                        font-size: 48px;
                        font-weight: bold;
                    }
                    
                    h1 {
                        font-size: 2rem;
                        margin-bottom: 1rem;
                        color: #2d3748;
                    }
                    
                    p {
                        font-size: 1.1rem;
                        margin-bottom: 2rem;
                        color: #4a5568;
                        line-height: 1.5;
                    }
                    
                    .close-btn {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    }
                    
                    .close-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                    }
                    
                    @media (max-width: 480px) {
                        .error-container {
                            padding: 2rem 1.5rem;
                        }
                        
                        h1 {
                            font-size: 1.5rem;
                        }
                        
                        p {
                            font-size: 1rem;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-icon"></div>
                    <h1>添加书签失败</h1>
                    <p>抱歉，添加书签时遇到了问题。请稍后重试或检查网络连接。</p>
                    <button class="close-btn" onclick="window.close()">关闭窗口</button>
                </div>
            </body>
            </html>
        `);
    }
});

// API端点：添加书签（用于管理后台，需要登录）
app.post('/api/bookmarks', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const bookmark = req.body;
        
        // 检查URL是否已存在
        const existingLinks = formatResults(db.exec(`SELECT * FROM links WHERE link_url = '${bookmark.bookmark_url || ''}'`));
        if (existingLinks.length > 0) {
            return res.status(400).json({ success: false, message: '书签URL已存在' });
        }
        
        // 确保有有效的分类ID
        let categoryId = parseInt(bookmark.category_id);
        if (isNaN(categoryId) || categoryId <= 0) {
            // 检查是否有分类
            const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
            if (categories.length === 0 || !categories[0] || !categories[0].category_id) {
                // 创建一个默认分类
                const maxCategoryIdResult = formatResults(db.exec('SELECT MAX(category_id) as max_id FROM categories'));
                const maxCategoryIdValue = maxCategoryIdResult.length > 0 && maxCategoryIdResult[0] && maxCategoryIdResult[0].max_id !== null ? maxCategoryIdResult[0].max_id : 0;
                const newCategoryId = maxCategoryIdValue + 1;
                
                // 确保所有分类参数都有值
                const categoryName = '默认分类';
                const categoryIcon = 'fa fa-folder';
                const categorySort = 1;
                
                db.run(
                    'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)',
                    [newCategoryId, categoryName, categoryIcon, categorySort]
                );
                
                saveDbChanges(db);
                categoryId = newCategoryId;
            } else {
                // 使用第一个分类
                categoryId = categories[0].category_id;
            }
        }
        
        // 生成新书签ID
        const links = formatResults(db.exec('SELECT MAX(link_id) as max_id FROM links'));
        const maxId = links.length > 0 && links[0] && links[0].max_id !== null ? links[0].max_id : 0;
        const linkId = maxId + 1;
        
        // 设置默认排序值
        let bookmarkSort = bookmark.sort;
        if (typeof bookmarkSort === 'undefined' || bookmarkSort === null) {
            const sortLinks = formatResults(db.exec(`SELECT MAX(sort) as max_sort FROM links WHERE category_id = ${categoryId}`));
            const maxSort = sortLinks.length > 0 && sortLinks[0] && sortLinks[0].max_sort !== null ? sortLinks[0].max_sort : 0;
            bookmarkSort = maxSort + 1;
        }
        
        // 确保所有字段都有值，并且不是undefined
        const finalLinkId = typeof linkId === 'undefined' || linkId === null ? 1 : linkId;
        const finalCategoryId = typeof categoryId === 'undefined' || categoryId === null ? 1 : categoryId;
        const finalBookmarkName = typeof bookmark.bookmark_name === 'undefined' || bookmark.bookmark_name === null ? '' : bookmark.bookmark_name;
        const finalBookmarkUrl = typeof bookmark.bookmark_url === 'undefined' || bookmark.bookmark_url === null ? '' : bookmark.bookmark_url;
        const finalBookmarkIcon = typeof bookmark.bookmark_icon === 'undefined' || bookmark.bookmark_icon === null ? 'fa fa-link' : bookmark.bookmark_icon;
        const finalBookmarkDescription = typeof bookmark.bookmark_description === 'undefined' || bookmark.bookmark_description === null ? '' : bookmark.bookmark_description;
        const finalBookmarkSort = typeof bookmarkSort === 'undefined' || bookmarkSort === null ? 0 : bookmarkSort;
        
        console.log('插入书签参数:', finalLinkId, finalCategoryId, finalBookmarkName, finalBookmarkUrl, finalBookmarkIcon, finalBookmarkDescription, finalBookmarkSort);
        console.log('参数类型:', typeof finalLinkId, typeof finalCategoryId, typeof finalBookmarkName, typeof finalBookmarkUrl, typeof finalBookmarkIcon, typeof finalBookmarkDescription, typeof finalBookmarkSort);
        
        // 插入书签
        const insertResult = db.run(
            'INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [finalLinkId, finalCategoryId, finalBookmarkName, finalBookmarkUrl, finalBookmarkIcon, finalBookmarkDescription, finalBookmarkSort]
        );
        console.log('插入结果:', insertResult);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取刚插入的书签信息
        const newBookmarkQuery = `
            SELECT 
                l.link_id as bookmark_id,
                l.link_name as bookmark_name,
                l.link_url as bookmark_url,
                l.link_icon as bookmark_icon,
                l.link_desc as bookmark_description,
                l.sort as sort,
                IFNULL(c.category_name, '未分类') as category_name,
                IFNULL(c.category_id, 0) as category_id
            FROM 
                links l
            LEFT JOIN 
                categories c ON l.category_id = c.category_id
            WHERE 
                l.link_id = ${linkId}
        `;
        
        const newBookmarks = formatResults(db.exec(newBookmarkQuery));
        
        res.json({ success: true, data: newBookmarks.length > 0 ? newBookmarks[0] : { bookmark_id: linkId, bookmark_name: bookmarkName, bookmark_url: bookmarkUrl } });
    } catch (error) {
        console.error('添加书签失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({ success: false, message: '添加书签失败' });
    }
});

// API端点：更新书签（用于管理后台，需要登录）
app.put('/api/bookmarks/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const bookmarkId = parseInt(req.params.id);
        const updatedBookmark = req.body;
        
        // 更新书签
        db.run(
            'UPDATE links SET category_id = ?, link_name = ?, link_url = ?, link_icon = ?, link_desc = ?, sort = ? WHERE link_id = ?',
            [updatedBookmark.category_id, updatedBookmark.bookmark_name, updatedBookmark.bookmark_url, updatedBookmark.bookmark_icon, updatedBookmark.bookmark_description, updatedBookmark.sort, bookmarkId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取更新后的书签信息
        const updatedBookmarkQuery = `
            SELECT 
                l.link_id as bookmark_id,
                l.link_name as bookmark_name,
                l.link_url as bookmark_url,
                l.link_icon as bookmark_icon,
                l.link_desc as bookmark_description,
                l.sort as sort,
                c.category_name as category_name,
                c.category_id as category_id
            FROM 
                links l
            JOIN 
                categories c ON l.category_id = c.category_id
            WHERE 
                l.link_id = ${bookmarkId}
        `;
        
        const updatedBookmarks = formatResults(db.exec(updatedBookmarkQuery));
        
        res.json({ success: true, data: updatedBookmarks[0] });
    } catch (error) {
        console.error('更新书签失败:', error);
        res.status(500).json({ success: false, message: '更新书签失败' });
    }
});

// API端点：删除书签（用于管理后台，需要登录）
app.delete('/api/bookmarks/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const bookmarkId = parseInt(req.params.id);
        
        // 先获取要删除的书签的URL
        const linkResults = db.exec(`SELECT link_url FROM links WHERE link_id = ${bookmarkId}`);
        const links = formatResults(linkResults);
        
        // 删除书签
        db.run(`DELETE FROM links WHERE link_id = ${bookmarkId}`);
        
        // 如果找到了对应的URL，也删除pending_bookmarks表中对应的已批准记录
        if (links.length > 0) {
            const linkUrl = links[0].link_url;
            db.run(`DELETE FROM pending_bookmarks WHERE link_url = '${linkUrl}' AND status = 1`);
        }
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '书签删除成功' });
    } catch (error) {
        console.error('删除书签失败:', error);
        res.status(500).json({ success: false, message: '删除书签失败' });
    }
});

// 测试端点
app.get('/api/test', (req, res) => {
    console.log('收到GET /api/test请求');
    res.json({ success: true, message: '测试端点工作正常' });
});



// API端点：获取所有分类（公开访问）
app.get('/api/categories', (req, res) => {
    console.log('收到GET /api/categories请求');
    try {
        const db = getDatabase();
        const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        
        // 为每个分类获取链接数量
        const categoriesWithCount = categories.map(category => {
            const linkCountResult = formatResults(db.exec(`SELECT COUNT(*) as count FROM links WHERE category_id = ${category.category_id}`));
            return {
                ...category,
                link_count: linkCountResult[0].count || 0
            };
        });
        
        res.json({ success: true, data: categoriesWithCount });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// API端点：获取单个分类详情（需要登录）
app.get('/api/categories/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const categoryId = parseInt(req.params.id);
        
        // 获取单个分类
        const categories = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        
        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: '分类不存在' });
        }
        
        res.json({ success: true, data: categories[0] });
    } catch (error) {
        console.error('获取分类详情失败:', error);
        res.status(500).json({ success: false, message: '获取分类详情失败' });
    }
});

// API端点：添加分类（需要登录）
app.post('/api/categories', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const newCategory = req.body;
        
        // 依赖数据库的UNIQUE约束防止重复分类名称
        
        // 生成新分类ID
        const categories = formatResults(db.exec('SELECT MAX(category_id) as max_id FROM categories'));
        const maxId = categories.length > 0 && categories[0] && categories[0].max_id !== null ? categories[0].max_id : 0;
        newCategory.category_id = maxId + 1;
        
        // 设置默认排序值
        if (!newCategory.sort) {
            const sortCategories = formatResults(db.exec('SELECT MAX(sort) as max_sort FROM categories'));
            const maxSort = sortCategories.length > 0 && sortCategories[0] && sortCategories[0].max_sort !== null ? sortCategories[0].max_sort : 0;
            newCategory.sort = maxSort + 1;
        }
        
        // 插入前先检查分类名称是否已存在（双重保障）
        console.log('检查分类名称是否已存在:', newCategory.category_name);
        const existingCategories = formatResults(db.exec(`SELECT * FROM categories WHERE category_name = '${newCategory.category_name}'`));
        
        if (existingCategories.length > 0) {
            console.log('分类名称已存在:', newCategory.category_name);
            return res.status(400).json({ success: false, message: '分类名称已存在' });
        }
        
        // 确保所有参数都有值
        const categoryId = newCategory.category_id;
        const categoryName = newCategory.category_name || '';
        const categoryIcon = newCategory.category_icon || 'fa fa-folder';
        const categorySort = newCategory.sort || 0;
        
        // 插入分类
        console.log('准备插入分类，参数:', categoryId, categoryName, categoryIcon, categorySort);
        const result = db.run(
            'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)',
            [categoryId, categoryName, categoryIcon, categorySort]
        );
        
        console.log('插入分类结果:', JSON.stringify(result, null, 2));
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, data: newCategory });
    } catch (error) {
        console.error('添加分类失败:', error);
        res.status(500).json({ success: false, message: '添加分类失败' });
    }
});

// API端点：更新分类（需要登录）
app.put('/api/categories/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const categoryId = parseInt(req.params.id);
        const updatedCategory = req.body;
        
        // 检查分类是否存在
        const existingCategories = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        if (existingCategories.length === 0) {
            return res.status(404).json({ success: false, message: '分类不存在' });
        }
        
        // 更新前先检查新名称是否与其他分类重复
        console.log('检查更新后的分类名称是否已存在:', updatedCategory.category_name);
        const duplicateCategories = formatResults(db.exec(`SELECT * FROM categories WHERE category_name = '${updatedCategory.category_name}' AND category_id != ${categoryId}`));
        
        if (duplicateCategories.length > 0) {
            console.log('分类名称已存在:', updatedCategory.category_name);
            return res.status(400).json({ success: false, message: '分类名称已存在' });
        }
        
        // 更新分类
        console.log('准备更新分类:', updatedCategory, 'ID:', categoryId);
        db.run(
            'UPDATE categories SET category_name = ?, category_icon = ?, sort = ? WHERE category_id = ?',
            [updatedCategory.category_name, updatedCategory.category_icon, updatedCategory.sort, categoryId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取更新后的分类
        const result = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error('更新分类失败:', error);
        res.status(500).json({ success: false, message: '更新分类失败' });
    }
});

// API端点：删除分类（需要登录）
app.delete('/api/categories/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const categoryId = parseInt(req.params.id);
        
        // 检查分类是否存在
        const categories = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: '分类不存在' });
        }
        
        // 删除分类下的所有链接
        db.run(`DELETE FROM links WHERE category_id = ${categoryId}`);
        
        // 删除分类
        db.run(`DELETE FROM categories WHERE category_id = ${categoryId}`);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '分类删除成功' });
    } catch (error) {
        console.error('删除分类失败:', error);
        res.status(500).json({ success: false, message: '删除分类失败' });
    }
});

// API端点：更新分类排序（需要登录）
app.put('/api/categories/:id/sort', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const categoryId = parseInt(req.params.id);
        const newSort = req.body.sort;
        
        // 检查分类是否存在
        const categories = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: '分类不存在' });
        }
        
        // 更新排序值
        db.run(
            'UPDATE categories SET sort = ? WHERE category_id = ?',
            [newSort, categoryId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取所有分类并排序
        const allCategories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        
        // 为每个分类获取链接
        const result = allCategories.map(category => {
            const links = formatResults(db.exec(`SELECT * FROM links WHERE category_id = ${category.category_id} ORDER BY sort ASC`));
            return {
                ...category,
                links: links
            };
        });
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('更新分类排序失败:', error);
        res.status(500).json({ success: false, message: '更新分类排序失败' });
    }
});

// API端点：获取指定分类的所有书签（需要登录）
app.get('/api/categories/:id/links', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const categoryId = parseInt(req.params.id);
        
        // 检查分类是否存在
        const categories = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: '分类不存在' });
        }
        
        // 获取该分类下的所有链接
        const links = formatResults(db.exec(`SELECT * FROM links WHERE category_id = ${categoryId} ORDER BY sort ASC`));
        res.json(links);
    } catch (error) {
        console.error('获取书签失败:', error);
        res.status(500).json({ success: false, message: '获取书签失败' });
    }
});

// API端点：添加书签（需要登录）
app.post('/api/categories/:id/links', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const categoryId = parseInt(req.params.id);
        const newLink = req.body;
        
        // 检查分类是否存在
        const categories = formatResults(db.exec(`SELECT * FROM categories WHERE category_id = ${categoryId}`));
        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: '分类不存在' });
        }
        
        // 生成新书签ID
        const links = formatResults(db.exec('SELECT MAX(link_id) as max_id FROM links'));
        const maxId = links[0].max_id || 0;
        newLink.link_id = maxId + 1;
        
        // 设置默认排序值
        if (!newLink.sort) {
            const sortLinks = formatResults(db.exec(`SELECT MAX(sort) as max_sort FROM links WHERE category_id = ${categoryId}`));
            const maxSort = sortLinks[0].max_sort || 0;
            newLink.sort = maxSort + 1;
        }
        
        // 添加到分类中
        db.run(
            'INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newLink.link_id, categoryId, newLink.link_name, newLink.link_url, newLink.link_icon, newLink.link_desc, newLink.sort]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, data: newLink });
    } catch (error) {
        console.error('添加书签失败:', error);
        res.status(500).json({ success: false, message: '添加书签失败' });
    }
});

// API端点：更新书签（需要登录）
app.put('/api/links/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const linkId = parseInt(req.params.id);
        const updatedLink = req.body;
        
        // 检查书签是否存在
        const links = formatResults(db.exec(`SELECT * FROM links WHERE link_id = ${linkId}`));
        if (links.length === 0) {
            return res.status(404).json({ success: false, message: '书签不存在' });
        }
        
        // 更新书签
        db.run(
            'UPDATE links SET category_id = ?, link_name = ?, link_url = ?, link_icon = ?, link_desc = ?, sort = ? WHERE link_id = ?',
            [updatedLink.category_id, updatedLink.link_name, updatedLink.link_url, updatedLink.link_icon, updatedLink.link_desc, updatedLink.sort, linkId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, data: updatedLink });
    } catch (error) {
        console.error('更新书签失败:', error);
        res.status(500).json({ success: false, message: '更新书签失败' });
    }
});

// API端点：删除书签（需要登录）
app.delete('/api/links/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const linkId = parseInt(req.params.id);
        
        // 检查书签是否存在
        const links = formatResults(db.exec(`SELECT * FROM links WHERE link_id = ${linkId}`));
        if (links.length === 0) {
            return res.status(404).json({ success: false, message: '书签不存在' });
        }
        
        // 删除书签
        db.run(`DELETE FROM links WHERE link_id = ${linkId}`);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '书签删除成功' });
    } catch (error) {
        console.error('删除书签失败:', error);
        res.status(500).json({ success: false, message: '删除书签失败' });
    }
});

// API端点：更新书签排序（需要登录）
app.put('/api/links/:id/sort', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const linkId = parseInt(req.params.id);
        const newSort = req.body.sort;
        
        // 检查书签是否存在
        const links = formatResults(db.exec(`SELECT * FROM links WHERE link_id = ${linkId}`));
        if (links.length === 0) {
            return res.status(404).json({ success: false, message: '书签不存在' });
        }
        
        // 获取分类ID
        const categoryId = links[0].category_id;
        
        // 更新排序值
        db.run(
            'UPDATE links SET sort = ? WHERE link_id = ?',
            [newSort, linkId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取该分类下的所有链接并排序
        const updatedLinks = formatResults(db.exec(`SELECT * FROM links WHERE category_id = ${categoryId} ORDER BY sort ASC`));
        
        res.json({ success: true, data: updatedLinks });
    } catch (error) {
        console.error('更新书签排序失败:', error);
        res.status(500).json({ success: false, message: '更新书签排序失败' });
    }
});

// API端点：获取仪表盘数据（需要登录）
app.get('/api/dashboard', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        
        // 获取统计数据
        const totalBookmarks = formatResults(db.exec('SELECT COUNT(*) as count FROM links'));
        const totalCategories = formatResults(db.exec('SELECT COUNT(*) as count FROM categories'));
        
        // 获取今天的访问量
        const today = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD
        const todayVisits = formatResults(db.exec(`SELECT SUM(visit_count) as count FROM visits WHERE visit_date = '${today}'`));
        
        // 获取总访问量
        const totalVisits = formatResults(db.exec('SELECT SUM(visit_count) as count FROM visits'));
        
        // 计算活跃用户数（这里简单返回1，实际项目中应该从用户表获取）
        const activeUsers = [{ count: 1 }];
        
        // 获取最近7天的访问量趋势数据
        const visitTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const formattedDate = date.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
            const displayDate = `${date.getMonth() + 1}月${date.getDate()}日`;
            
            const visits = formatResults(db.exec(`SELECT SUM(visit_count) as count FROM visits WHERE visit_date = '${formattedDate}'`));
            visitTrend.push({
                date: displayDate,
                visits: visits[0].count || 0
            });
        }
        
        res.json({ 
            success: true, 
            data: {
                total_bookmarks: totalBookmarks[0].count || 0,
                total_categories: totalCategories[0].count || 0,
                active_users: activeUsers[0].count || 0,
                today_visits: todayVisits[0].count || 0,
                total_visits: totalVisits[0].count || 0,
                visit_trend: visitTrend
            }
        });
    } catch (error) {
        console.error('获取仪表盘数据失败:', error);
        res.status(500).json({ success: false, message: '获取仪表盘数据失败' });
    }
});

// API端点：获取所有公告（公开访问）
app.get('/api/announcements', (req, res) => {
    try {
        const db = getDatabase();
        const announcements = formatResults(db.exec('SELECT * FROM announcements ORDER BY id DESC'));
        res.json(announcements);
    } catch (error) {
        console.error('获取公告失败:', error);
        res.status(500).json({ success: false, message: '获取公告失败' });
    }
});





// API端点：获取活跃的公告（公开访问）
app.get('/api/announcements/active', (req, res) => {
    try {
        const db = getDatabase();
        const announcements = formatResults(db.exec('SELECT * FROM announcements WHERE is_active = 1 ORDER BY id DESC'));
        res.json(announcements);
    } catch (error) {
        console.error('获取活跃公告失败:', error);
        res.status(500).json({ success: false, message: '获取活跃公告失败' });
    }
});

// API端点：获取单个公告（需要登录）
app.get('/api/announcements/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const announcementId = parseInt(req.params.id);
        
        // 检查公告是否存在
        const announcements = formatResults(db.exec(`SELECT * FROM announcements WHERE id = ${announcementId}`));
        if (announcements.length === 0) {
            return res.status(404).json({ success: false, message: '公告不存在' });
        }
        
        res.json({ success: true, data: announcements[0] });
    } catch (error) {
        console.error('获取公告详情失败:', error);
        res.status(500).json({ success: false, message: '获取公告详情失败' });
    }
});

// API端点：添加公告（需要登录）
app.post('/api/announcements', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const newAnnouncement = req.body;
        
        // 设置创建和更新时间
        const now = new Date().toISOString();
        newAnnouncement.created_at = now;
        newAnnouncement.updated_at = now;
        
        // 默认激活
        if (newAnnouncement.is_active === undefined) {
            newAnnouncement.is_active = true;
        }
        
        // 确保参数不为undefined
        const title = newAnnouncement.title || '';
        const content = newAnnouncement.content || '';
        const time = newAnnouncement.time || '';
        const isActive = newAnnouncement.is_active ? 1 : 0;
        
        // 插入公告
        db.run(
            'INSERT INTO announcements (title, content, time, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [title, content, time, isActive, newAnnouncement.created_at, newAnnouncement.updated_at]
        );
        
        // 获取刚插入的公告ID
        const result = formatResults(db.exec('SELECT last_insert_rowid() as id FROM announcements'));
        newAnnouncement.id = result[0].id;
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, data: newAnnouncement });
    } catch (error) {
        console.error('添加公告失败:', error);
        res.status(500).json({ success: false, message: '添加公告失败' });
    }
});

// API端点：更新公告（需要登录）
app.put('/api/announcements/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const announcementId = parseInt(req.params.id);
        
        // 验证公告ID是否有效
        if (isNaN(announcementId)) {
            return res.status(400).json({ success: false, message: '无效的公告ID' });
        }
        
        const updatedAnnouncement = req.body;
        
        // 检查公告是否存在
        const announcements = formatResults(db.exec(`SELECT * FROM announcements WHERE id = ${announcementId}`));
        if (announcements.length === 0) {
            return res.status(404).json({ success: false, message: '公告不存在' });
        }
        
        // 更新时间
        updatedAnnouncement.updated_at = new Date().toISOString();
        
        // 确保参数不为undefined
        const title = updatedAnnouncement.title || '';
        const content = updatedAnnouncement.content || '';
        const time = updatedAnnouncement.time || '';
        const isActive = updatedAnnouncement.is_active ? 1 : 0;
        
        // 更新公告
        db.run(
            'UPDATE announcements SET title = ?, content = ?, time = ?, is_active = ?, updated_at = ? WHERE id = ?',
            [title, content, time, isActive, updatedAnnouncement.updated_at, announcementId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取更新后的公告
        const result = formatResults(db.exec(`SELECT * FROM announcements WHERE id = ${announcementId}`));
        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error('更新公告失败:', error);
        res.status(500).json({ success: false, message: '更新公告失败' });
    }
});

// API端点：删除公告（需要登录）
app.delete('/api/announcements/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const announcementId = parseInt(req.params.id);
        
        // 验证公告ID是否有效
        if (isNaN(announcementId)) {
            return res.status(400).json({ success: false, message: '无效的公告ID' });
        }
        
        // 检查公告是否存在
        const announcements = formatResults(db.exec(`SELECT * FROM announcements WHERE id = ${announcementId}`));
        if (announcements.length === 0) {
            return res.status(404).json({ success: false, message: '公告不存在' });
        }
        
        // 删除公告
        db.run(`DELETE FROM announcements WHERE id = ${announcementId}`);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '公告删除成功' });
    } catch (error) {
        console.error('删除公告失败:', error);
        res.status(500).json({ success: false, message: '删除公告失败' });
    }
});

// API端点：清空所有分类和书签数据（需要登录）
app.delete('/api/clear-all-data', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        
        // 先删除所有书签（因为书签有外键关联分类）
        db.run('DELETE FROM links');
        
        // 再删除所有分类
        db.run('DELETE FROM categories');
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '所有数据已清空' });
    } catch (error) {
        console.error('清空数据失败:', error);
        res.status(500).json({ success: false, message: '清空数据失败' });
    }
});

// ------------------------
// 图片源管理API
// ------------------------

// API端点：获取所有图片源（需要登录）
app.get('/api/image-sources', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        // 检查imagesources表是否存在
        let result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='imagesources'`);
        let imageSources = [];
        
        if (result && result[0] && result[0].values.length > 0) {
            // 表存在，获取数据
            imageSources = formatResults(db.exec('SELECT * FROM imagesources ORDER BY id ASC'));
        }
        
        res.json({ success: true, data: imageSources });
    } catch (error) {
        console.error('获取图片源失败:', error);
        res.status(500).json({ success: false, message: '获取图片源失败' });
    }
});

// API端点：获取单个图片源（需要登录）
app.get('/api/image-sources/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const sourceId = parseInt(req.params.id);
        
        // 检查imagesources表是否存在
        let result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='imagesources'`);
        if (!result || !result[0] || result[0].values.length === 0) {
            return res.status(404).json({ success: false, message: '图片源不存在' });
        }
        
        // 获取单个图片源
        const imageSource = formatResults(db.exec(`SELECT * FROM imagesources WHERE id = ${sourceId}`));
        if (imageSource.length === 0) {
            return res.status(404).json({ success: false, message: '图片源不存在' });
        }
        
        res.json({ success: true, data: imageSource[0] });
    } catch (error) {
        console.error('获取图片源详情失败:', error);
        res.status(500).json({ success: false, message: '获取图片源详情失败' });
    }
});

// API端点：添加图片源（需要登录）
app.post('/api/image-sources', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const newSource = req.body;
        
        // 检查imagesources表是否存在，如果不存在则创建
        let result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='imagesources'`);
        if (!result || !result[0] || result[0].values.length === 0) {
            // 创建表
            db.exec(`
                CREATE TABLE imagesources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL,
                    desc TEXT
                );
            `);
        }
        
        // 插入数据
        db.run(
            'INSERT INTO imagesources (name, url, desc) VALUES (?, ?, ?)',
            [newSource.name, newSource.url, newSource.desc || '']
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 获取刚插入的数据
        const insertedId = formatResults(db.exec('SELECT last_insert_rowid() as id FROM imagesources'));
        newSource.id = insertedId[0].id;
        
        res.json({ success: true, data: newSource });
    } catch (error) {
        console.error('添加图片源失败:', error);
        res.status(500).json({ success: false, message: '添加图片源失败' });
    }
});

// API端点：更新图片源（需要登录）
app.put('/api/image-sources/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const sourceId = parseInt(req.params.id);
        const updatedSource = req.body;
        
        // 更新数据
        db.run(
            'UPDATE imagesources SET name = ?, url = ?, desc = ? WHERE id = ?',
            [updatedSource.name, updatedSource.url, updatedSource.desc || '', sourceId]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        // 返回更新后的数据
        updatedSource.id = sourceId;
        res.json({ success: true, data: updatedSource });
    } catch (error) {
        console.error('更新图片源失败:', error);
        res.status(500).json({ success: false, message: '更新图片源失败' });
    }
});

// API端点：删除图片源（需要登录）
app.delete('/api/image-sources/:id', isAuthenticated, (req, res) => {
    try {
        const sourceId = parseInt(req.params.id);
        
        // 删除数据
        db.run('DELETE FROM imagesources WHERE id = ?', [sourceId]);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '图片源删除成功' });
    } catch (error) {
        console.error('删除图片源失败:', error);
        res.status(500).json({ success: false, message: '删除图片源失败' });
    }
});

// ------------------------------
// 搜索引擎管理API
// ------------------------------



// API端点：获取搜索引擎和分类（公开访问）
app.get('/api/search-engines', (req, res) => {
    try {
        const db = getDatabase();
        const engines = formatResults(db.exec('SELECT * FROM search_engines ORDER BY sort ASC'));
        const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        res.json({ 
            success: true, 
            data: { 
                search_engines: engines, 
                categories: categories 
            } 
        });
    } catch (error) {
        console.error('获取数据失败:', error);
        res.status(500).json({ success: false, message: '获取数据失败' });
    }
});

// API端点：获取单个搜索引擎（需要登录）
app.get('/api/search-engines/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const engineId = parseInt(req.params.id);
        
        // 获取单个搜索引擎
        const engines = formatResults(db.exec(`SELECT * FROM search_engines WHERE search_engine_id = ${engineId}`));
        
        if (engines.length === 0) {
            return res.status(404).json({ success: false, message: '搜索引擎不存在' });
        }
        
        res.json({ success: true, data: engines[0] });
    } catch (error) {
        console.error('获取搜索引擎详情失败:', error);
        res.status(500).json({ success: false, message: '获取搜索引擎详情失败' });
    }
});

// API端点：创建搜索引擎（需要登录）
app.post('/api/search-engines', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const { engine_name, engine_key, engine_url, sort } = req.body;
        
        // 验证必填字段
        if (!engine_name || !engine_key || !engine_url) {
            return res.status(400).json({ success: false, message: '请填写完整的搜索引擎信息' });
        }
        
        // 检查engine_key是否已存在
        const existingEngine = formatResults(db.exec(`SELECT * FROM search_engines WHERE engine_key = '${engine_key}'`));
        if (existingEngine.length > 0) {
            return res.status(400).json({ success: false, message: '搜索引擎标识已存在' });
        }
        
        // 插入新搜索引擎
        db.run(`
            INSERT INTO search_engines (engine_name, engine_key, engine_url, sort)
            VALUES ('${engine_name}', '${engine_key}', '${engine_url}', ${sort || 0})
        `);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '搜索引擎创建成功' });
    } catch (error) {
        console.error('创建搜索引擎失败:', error);
        res.status(500).json({ success: false, message: '创建搜索引擎失败' });
    }
});

// API端点：更新搜索引擎（需要登录）
app.put('/api/search-engines/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const engineId = parseInt(req.params.id);
        const { engine_name, engine_key, engine_url, sort } = req.body;
        
        // 验证必填字段
        if (!engine_name || !engine_key || !engine_url) {
            return res.status(400).json({ success: false, message: '请填写完整的搜索引擎信息' });
        }
        
        // 检查搜索引擎是否存在
        const engine = formatResults(db.exec(`SELECT * FROM search_engines WHERE search_engine_id = ${engineId}`));
        if (engine.length === 0) {
            return res.status(404).json({ success: false, message: '搜索引擎不存在' });
        }
        
        // 检查engine_key是否已被其他搜索引擎使用
        const existingEngine = formatResults(db.exec(`SELECT * FROM search_engines WHERE engine_key = '${engine_key}' AND search_engine_id != ${engineId}`));
        if (existingEngine.length > 0) {
            return res.status(400).json({ success: false, message: '搜索引擎标识已存在' });
        }
        
        // 更新搜索引擎
        db.run(`
            UPDATE search_engines
            SET engine_name = '${engine_name}', engine_key = '${engine_key}', engine_url = '${engine_url}', sort = ${sort || 0}
            WHERE search_engine_id = ${engineId}
        `);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '搜索引擎更新成功' });
    } catch (error) {
        console.error('更新搜索引擎失败:', error);
        res.status(500).json({ success: false, message: '更新搜索引擎失败' });
    }
});

// API端点：删除搜索引擎（需要登录）
app.delete('/api/search-engines/:id', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const engineId = parseInt(req.params.id);
        
        // 检查搜索引擎是否存在
        const engine = formatResults(db.exec(`SELECT * FROM search_engines WHERE search_engine_id = ${engineId}`));
        if (engine.length === 0) {
            return res.status(404).json({ success: false, message: '搜索引擎不存在' });
        }
        
        // 删除搜索引擎
        db.run(`DELETE FROM search_engines WHERE search_engine_id = ${engineId}`);
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '搜索引擎删除成功' });
    } catch (error) {
        console.error('删除搜索引擎失败:', error);
        res.status(500).json({ success: false, message: '删除搜索引擎失败' });
    }
});



// API端点：审核书签（批准/拒绝）
app.put('/api/pending-bookmarks/:id/approve', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const id = req.params.id;
        const { category_id } = req.body || {};
        
        // 获取待审核书签
        const pendingResults = db.exec(`SELECT * FROM pending_bookmarks WHERE id = ${id}`);
        const pendingBookmarks = formatResults(pendingResults);
        
        if (pendingBookmarks.length === 0) {
            return res.status(404).json({ success: false, message: '待审核书签不存在' });
        }
        
        const pendingBookmark = pendingBookmarks[0];
        
        // 确保有有效的分类ID
        let categoryId = parseInt(category_id) || pendingBookmark.category_id;
        
        if (isNaN(categoryId) || categoryId <= 0) {
            // 检查是否有分类
            const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
            
            if (categories.length === 0 || !categories[0] || !categories[0].category_id) {
                // 创建一个默认分类
                const maxCategoryIdResult = formatResults(db.exec('SELECT MAX(category_id) as max_id FROM categories'));
                const maxCategoryIdValue = maxCategoryIdResult.length > 0 && maxCategoryIdResult[0] && maxCategoryIdResult[0].max_id !== null ? maxCategoryIdResult[0].max_id : 0;
                const newCategoryId = maxCategoryIdValue + 1;
                
                const categoryName = '默认分类';
                const categoryIcon = 'fa fa-folder';
                const categorySort = 1;
                
                db.run(
                    'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)',
                    [newCategoryId, categoryName, categoryIcon, categorySort]
                );
                
                saveDbChanges(db);
                categoryId = newCategoryId;
            } else {
                categoryId = categories[0].category_id;
            }
        }
        
        // 检查URL是否已存在
        const existingLinks = formatResults(db.exec(`SELECT * FROM links WHERE link_url = '${pendingBookmark.link_url}'`));
        
        if (existingLinks.length > 0) {
            return res.status(400).json({ success: false, message: '该网址已经存在' });
        }
        
        // 生成新书签ID
        const links = formatResults(db.exec('SELECT MAX(link_id) as max_id FROM links'));
        const maxId = links.length > 0 && links[0] && links[0].max_id !== null ? links[0].max_id : 0;
        const linkId = maxId + 1;
        
        // 获取当前时间
        const currentTime = new Date().toISOString();
        
        // 插入到正式书签表
        db.run(
            'INSERT INTO links (link_id, category_id, link_name, link_url, link_icon, link_desc, sort) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                linkId,
                categoryId,
                pendingBookmark.link_name,
                pendingBookmark.link_url,
                pendingBookmark.link_icon || 'fa fa-link',
                pendingBookmark.link_desc || '',
                0
            ]
        );
        
        // 更新待审核书签状态为已批准
        db.run(
            'UPDATE pending_bookmarks SET status = 1, updated_at = ? WHERE id = ?',
            [currentTime, id]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '书签已批准并添加到网站' });
    } catch (error) {
        console.error('批准书签失败:', error);
        res.status(500).json({ success: false, message: '批准书签失败' });
    }
});

app.put('/api/pending-bookmarks/:id/reject', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const id = req.params.id;
        
        // 检查待审核书签是否存在
        const pendingResults = db.exec(`SELECT * FROM pending_bookmarks WHERE id = ${id}`);
        const pendingBookmarks = formatResults(pendingResults);
        
        if (pendingBookmarks.length === 0) {
            return res.status(404).json({ success: false, message: '待审核书签不存在' });
        }
        
        // 更新待审核书签状态为已拒绝
        const currentTime = new Date().toISOString();
        db.run(
            'UPDATE pending_bookmarks SET status = 2, updated_at = ? WHERE id = ?',
            [currentTime, id]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '书签已拒绝' });
    } catch (error) {
        console.error('拒绝书签失败:', error);
        res.status(500).json({ success: false, message: '拒绝书签失败' });
    }
});

// API端点：获取待审核书签列表（需要管理员权限）
app.get('/api/pending-bookmarks', isAuthenticated, (req, res) => {
    try {
        const db = getDatabase();
        const results = db.exec(`
            SELECT pb.*, c.category_name 
            FROM pending_bookmarks pb
            LEFT JOIN categories c ON pb.category_id = c.category_id
            WHERE pb.status = 0
            ORDER BY pb.created_at DESC
        `);
        const pendingBookmarks = formatResults(results);
        res.json({ success: true, data: pendingBookmarks });
    } catch (error) {
        console.error('获取待审核书签列表失败:', error);
        res.status(500).json({ success: false, message: '获取待审核书签列表失败' });
    }
});

// API端点：提交书签（用于前台页面，不需要登录）
app.post('/api/pending-bookmarks', (req, res) => {
    console.log('收到POST /api/pending-bookmarks请求');
    try {
        const db = getDatabase();
        const pendingBookmark = req.body;
        console.log('书签数据:', pendingBookmark);
        
        // 验证必填字段
        if (!pendingBookmark.link_name || !pendingBookmark.link_url || !pendingBookmark.submitter_name) {
            return res.status(400).json({ success: false, message: '请填写完整的书签信息' });
        }
        
        // 检查URL是否已存在
        const existingLinks = formatResults(db.exec(`SELECT * FROM links WHERE link_url = '${pendingBookmark.link_url}'`));
        if (existingLinks.length > 0) {
            return res.status(400).json({ success: false, message: '该网址已经存在' });
        }
        
        // 先检查是否有状态为0的待审核记录
        const existingPending = formatResults(db.exec(`SELECT * FROM pending_bookmarks WHERE link_url = '${pendingBookmark.link_url}' AND status = 0`));
        if (existingPending.length > 0) {
            return res.status(400).json({ success: false, message: '该网址已经在待审核列表中' });
        }
        
        // 获取当前时间
        const currentTime = new Date().toISOString();
        
        // 使用INSERT OR REPLACE语句，确保在有冲突时自动更新记录
        db.run(
            `INSERT OR REPLACE INTO pending_bookmarks 
             (link_name, link_url, link_icon, link_desc, category_id, submitter_name, submitter_contact, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 
                     CASE WHEN EXISTS (SELECT 1 FROM pending_bookmarks WHERE link_url = ?) 
                          THEN (SELECT created_at FROM pending_bookmarks WHERE link_url = ?) 
                          ELSE ? 
                     END, 
                     ?)`,
            [
                pendingBookmark.link_name,
                pendingBookmark.link_url,
                pendingBookmark.link_icon || 'fa fa-link',
                pendingBookmark.link_desc || '',
                pendingBookmark.category_id || null,
                pendingBookmark.submitter_name,
                pendingBookmark.submitter_contact || '',
                pendingBookmark.link_url,
                pendingBookmark.link_url,
                currentTime,
                currentTime
            ]
        );
        
        // 保存数据库更改
        saveDbChanges(db);
        
        res.json({ success: true, message: '书签提交成功，等待管理员审核' });
    } catch (error) {
        console.error('提交书签失败:', error);
        res.status(500).json({ success: false, message: '提交书签失败' });
    }
});

// 保护管理后台页面 - 必须放在静态文件服务之前
app.get('/admin.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 静态文件服务 - 放在所有API端点之后
app.use(express.static(__dirname));

// 公开分类端点（用于书签提交和前端显示）
app.get('/api/public/categories', (req, res) => {
    console.log('收到GET /api/public/categories请求');
    try {
        const db = getDatabase();
        const categories = formatResults(db.exec('SELECT * FROM categories ORDER BY sort ASC'));
        console.log('返回分类数据:', categories.length, '个分类');
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// 测试端点
app.get('/api/test', (req, res) => {
    console.log('收到GET /api/test请求');
    res.json({ success: true, message: '测试端点工作正常' });
});

// 启动服务器
// 初始化数据库后启动服务器
setupDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`服务器正在运行，访问地址: http://localhost:${PORT}`);
        console.log(`前端页面地址: http://localhost:${PORT}`);
        console.log(`后台管理地址: http://localhost:${PORT}/admin.html`);
    });
});