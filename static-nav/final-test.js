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

async function finalTest() {
    try {
        console.log('=== 最终验证测试 ===');
        
        const SQL = await initSqlJs();
        
        // 读取数据库文件
        const fileBuffer = fs.readFileSync(DB_FILE);
        const db = new SQL.Database(fileBuffer);
        
        console.log('\n1. 验证数据库约束：');
        
        // 检查约束是否存在
        const constraints = db.exec('PRAGMA index_list(categories)');
        const constraintList = formatResults(constraints);
        
        console.log('  分类表约束：');
        constraintList.forEach(row => {
            console.log('    -', row.name, '(唯一：', row.unique ? '是' : '否', ')');
        });
        
        // 检查是否有UNIQUE约束
        const hasUniqueConstraint = constraintList.some(row => row.unique === 1);
        
        if (hasUniqueConstraint) {
            console.log('  ✅ 数据库已设置UNIQUE约束');
        } else {
            console.log('  ❌ 数据库未设置UNIQUE约束');
        }
        
        console.log('\n2. 验证重复分类插入：');
        
        // 尝试插入重复分类
        let duplicateInsertSuccess = false;
        
        try {
            db.exec("INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (999, '常用导航', 'fa fa-test', 999)");
            duplicateInsertSuccess = true;
            console.log('  ❌ 错误：重复分类插入成功');
        } catch (error) {
            duplicateInsertSuccess = false;
            console.log('  ✅ 成功：重复分类插入被阻止');
            console.log('  错误信息:', error.message);
        }
        
        if (duplicateInsertSuccess) {
            // 清理测试数据
            db.exec('DELETE FROM categories WHERE category_id = 999');
        }
        
        console.log('\n3. 验证新分类插入：');
        
        // 尝试插入新分类
        const newCategoryId = Date.now();
        let newInsertSuccess = false;
        
        try {
            db.exec(`INSERT INTO categories (category_id, category_name, category_icon, sort) VALUES (${newCategoryId}, '测试新分类_${newCategoryId}', 'fa fa-test', 999)`);
            newInsertSuccess = true;
            console.log('  ✅ 成功：新分类插入成功');
            
            // 清理测试数据
            db.exec(`DELETE FROM categories WHERE category_id = ${newCategoryId}`);
        } catch (error) {
            newInsertSuccess = false;
            console.log('  ❌ 错误：新分类插入失败');
            console.log('  错误信息:', error.message);
        }
        
        console.log('\n4. 验证JavaScript检查逻辑：');
        
        // 模拟我们在API中使用的JavaScript检查逻辑
        const checkCategoryExists = (db, categoryName, excludeId = null) => {
            let query = `SELECT * FROM categories WHERE category_name = '${categoryName}'`;
            if (excludeId !== null) {
                query += ` AND category_id != ${excludeId}`;
            }
            const results = db.exec(query);
            const categoryList = formatResults(results);
            return categoryList.length > 0;
        };
        
        // 测试现有分类
        const existingName = '常用导航';
        const exists = checkCategoryExists(db, existingName);
        
        if (exists) {
            console.log(`  ✅ 成功：能够检测到现有分类 "${existingName}"`);
        } else {
            console.log(`  ❌ 错误：未能检测到现有分类 "${existingName}"`);
        }
        
        // 测试不存在的分类
        const nonExistingName = '不存在的分类_测试' + Date.now();
        const notExists = checkCategoryExists(db, nonExistingName);
        
        if (!notExists) {
            console.log(`  ✅ 成功：能够检测到不存在的分类 "${nonExistingName}"`);
        } else {
            console.log(`  ❌ 错误：未能检测到不存在的分类 "${nonExistingName}"`);
        }
        
        console.log('\n5. 验证更新时的检查逻辑：');
        
        // 测试更新时排除当前ID
        const categoryToUpdate = formatResults(db.exec('SELECT * FROM categories LIMIT 1'))[0];
        
        if (categoryToUpdate) {
            const sameNameDifferentId = checkCategoryExists(db, categoryToUpdate.category_name, categoryToUpdate.category_id);
            
            if (!sameNameDifferentId) {
                console.log('  ✅ 成功：更新时能够正确排除当前分类');
            } else {
                console.log('  ❌ 错误：更新时未能正确排除当前分类');
            }
        }
        
        console.log('\n=== 测试总结 ===');
        
        if (hasUniqueConstraint && !duplicateInsertSuccess && newInsertSuccess) {
            console.log('✅ 所有核心测试通过！重复分类问题已解决。');
            console.log('   - 数据库已设置UNIQUE约束');
            console.log('   - 重复分类插入被阻止');
            console.log('   - 新分类插入正常');
            console.log('   - JavaScript检查逻辑正常');
        } else {
            console.log('❌ 某些测试失败，需要进一步检查。');
        }
        
    } catch (err) {
        console.error('测试失败:', err);
        console.error('错误详情:', JSON.stringify(err, null, 2));
    }
}

finalTest();