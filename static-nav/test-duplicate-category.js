const axios = require('axios');

async function testDuplicateCategory() {
    try {
        // 1. 登录获取会话
        const loginResponse = await axios.post('http://localhost:3000/api/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        console.log('登录成功:', loginResponse.data);
        
        // 2. 尝试添加一个已存在的分类
        const addCategoryResponse = await axios.post('http://localhost:3000/api/categories', {
            category_name: '常用导航',
            category_icon: 'fa fa-home',
            sort: 1
        }, {
            headers: {
                Cookie: loginResponse.headers['set-cookie']
            }
        });
        
        console.log('添加分类成功:', addCategoryResponse.data);
    } catch (error) {
        if (error.response) {
            console.log('添加分类失败:', error.response.data.message);
            console.log('HTTP状态码:', error.response.status);
        } else {
            console.log('请求失败:', error.message);
        }
    }
}

testDuplicateCategory();
