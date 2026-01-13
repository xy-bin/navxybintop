const { initDatabase } = require('./db-sqlite.js');

(async () => {
    const db = await initDatabase();
    const result = db.exec('SELECT * FROM categories');
    const categories = result[0];
    
    console.log('当前分类信息:');
    console.log('==========================');
    categories.values.forEach(row => {
        console.log(`ID: ${row[0]}`);
        console.log(`名称: ${row[1]}`);
        console.log(`图标: ${row[2]}`);
        console.log(`排序: ${row[3]}`);
        console.log('--------------------------');
    });
})();
