const { initDatabase } = require('./db-sqlite.js');

async function testConstraint() {
    try {
        const db = await initDatabase();
        
        console.log('检查数据库表结构:');
        
        // 查询表结构
        const schema = db.exec('PRAGMA table_info(categories)');
        console.log('categories表结构:');
        schema[0].values.forEach(row => {
            console.log(`列名: ${row[1]}, 类型: ${row[2]}, 非空: ${row[3]}, 默认值: ${row[4]}, 主键: ${row[5]}`);
        });
        
        // 查询索引信息（UNIQUE约束会创建索引）
        const indexes = db.exec('PRAGMA index_list(categories)');
        console.log('\ncategories表索引:');
        if (indexes[0].values.length > 0) {
            indexes[0].values.forEach(index => {
                console.log(`索引名称: ${index[1]}, 唯一: ${index[2]}, 部分: ${index[3]}`);
                
                // 查询索引的列信息
                const indexInfo = db.exec(`PRAGMA index_info(${index[1]})`);
                if (indexInfo[0].values.length > 0) {
                    const columns = indexInfo[0].values.map(col => col[2]).join(', ');
                    console.log(`  索引列: ${columns}`);
                }
            });
        } else {
            console.log('没有找到索引');
        }
        
        // 尝试手动插入重复数据
        console.log('\n尝试手动插入重复分类:');
        try {
            // 先获取一个已存在的分类名称
            const existing = db.exec('SELECT category_name FROM categories LIMIT 1');
            const existingName = existing[0].values[0][0];
            
            console.log(`尝试插入已存在的分类名称: ${existingName}`);
            
            // 尝试插入重复数据
            db.exec(
                `INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (999, '${existingName}', 'fa fa-test', 999)`
            );
            console.log('插入成功（这是不应该发生的）');
        } catch (error) {
            console.log('插入失败（这是预期的行为）:', error.message);
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testConstraint();
