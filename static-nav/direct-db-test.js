const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

// 数据库文件路径
const DB_FILE = path.join(__dirname, 'data', 'navxybintop.db');

// 辅助函数：格式化sql.js的查询结果
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

async function testDirectDb() {
    try {
        const SQL = await initSqlJs();
        
        // 读取数据库文件
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        console.log('=== 直接数据库测试 ===');
        
        // 1. 查看当前分类
        console.log('\n1. 当前分类:');
        const categories = db.exec('SELECT * FROM categories');
        const categoryList = formatResults(categories);
        
        categoryList.forEach(category => {
            console.log('  ID:', category.category_id, '名称:', category.category_name, '图标:', category.category_icon, '排序:', category.sort);
        });
        
        // 2. 测试UNIQUE约束
        console.log('\n2. 测试添加重复分类...');
        
        try {
            // 使用db.exec而不是db.run来获取完整的错误信息
            const result = db.exec(
                "INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (999, '常用导航', 'fa fa-test', 999)"
            );
            console.log('  ❌ 错误：应该阻止插入重复分类，但插入成功了！');
            console.log('  插入结果:', result);
        } catch (error) {
            console.log('  ✅ 成功：插入重复分类被阻止！');
            console.log('  错误信息:', error.message);
            
            // 检查是否是我们预期的UNIQUE约束错误
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log('  ✅ 正确：这是预期的UNIQUE约束错误');
            } else {
                console.log('  ❌ 错误：这不是预期的UNIQUE约束错误');
            }
        }
        
        // 3. 测试添加新分类
        console.log('\n3. 测试添加新分类...');
        
        try {
            const newCategoryId = Date.now();
            const result = db.exec(
                `INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (${newCategoryId}, '测试新分类', 'fa fa-test', 999)`
            );
            console.log('  ✅ 成功：新分类添加成功');
            
            // 检查是否真的添加了
            const newCategories = db.exec(`SELECT * FROM categories WHERE category_id = ${newCategoryId}`);
            const newCategoryList = formatResults(newCategories);
            
            if (newCategoryList.length > 0) {
                console.log('  ✅ 验证：新分类确实存在于数据库中');
                console.log('  新分类:', newCategoryList[0]);
                
                // 删除测试分类
                db.exec(`DELETE FROM categories WHERE category_id = ${newCategoryId}`);
                console.log('  已清理测试数据');
            } else {
                console.log('  ❌ 验证：新分类不存在于数据库中');
            }
            
        } catch (error) {
            console.log('  ❌ 错误：新分类添加失败');
            console.log('  错误信息:', error.message);
        }
        
        // 4. 检查约束是否存在
        console.log('\n4. 检查约束是否存在...');
        
        const constraints = db.exec('PRAGMA index_list(categories)');
        const constraintList = formatResults(constraints);
        
        console.log('  索引列表:');
        constraintList.forEach(row => {
            console.log('    索引:', row.name, '唯一:', row.unique ? '是' : '否');
            
            // 获取索引详情
            if (row.name) {
                const indexInfo = db.exec(`PRAGMA index_info(${row.name})`);
                const indexInfoList = formatResults(indexInfo);
                indexInfoList.forEach(info => {
                    console.log('      字段:', info.name);
                });
            }
        });
        
        console.log('\n=== 测试完成 ===');
        
    } catch (err) {
        console.error('测试失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

testDirectDb();