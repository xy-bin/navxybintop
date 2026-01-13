const { initDatabase } = require('./db-sqlite.js');

async function testDirectDb() {
    try {
        const db = await initDatabase();
        
        // 获取所有分类
        const allCategories = db.exec('SELECT * FROM categories');
        console.log('当前所有分类:');
        allCategories[0].values.forEach(row => {
            console.log(`ID: ${row[0]}, 名称: ${row[1]}`);
        });
        
        // 尝试插入一个重复的分类
        console.log('\n尝试插入重复分类:');
        try {
            db.run(
                'INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (?, ?, ?, ?)',
                [100, '常用导航', 'fa fa-test', 1]
            );
            console.log('插入成功（这是不应该发生的）');
        } catch (error) {
            console.log('插入失败:', error.message);
        }
        
        // 检查数据库是否有重复分类
        console.log('\n检查是否有重复分类:');
        const duplicates = db.exec(
            'SELECT category_name, COUNT(*) as count FROM categories GROUP BY category_name HAVING COUNT(*) > 1'
        );
        
        if (duplicates[0].values.length > 0) {
            console.log('发现重复分类:');
            duplicates[0].values.forEach(row => {
                console.log(`名称: ${row[0]}, 重复次数: ${row[1]}`);
            });
        } else {
            console.log('没有发现重复分类');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testDirectDb();
