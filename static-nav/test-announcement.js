const axios = require('axios');

async function testAnnouncement() {
    try {
        console.log('=== 公告功能测试 ===');
        
        let cookie = '';
        
        // 1. 登录
        console.log('\n1. 登录测试:');
        
        try {
            const loginResponse = await axios.post('http://localhost:3000/api/login', {
                username: 'admin',
                password: 'admin123'
            }, {
                withCredentials: true
            });
            
            console.log('   ✅ 登录成功');
            
            // 获取cookie
            if (loginResponse.headers['set-cookie']) {
                cookie = loginResponse.headers['set-cookie'].join('; ');
            }
            
        } catch (error) {
            console.log('   ❌ 登录失败:', error.response?.data?.message || error.message);
            return;
        }
        
        // 2. 添加公告
        console.log('\n2. 添加公告测试:');
        
        let newAnnouncementId = null;
        
        try {
            const announcementData = {
                title: '测试公告',
                content: '这是一个测试公告内容',
                time: new Date().toLocaleString(),
                is_active: true
            };
            
            const addResponse = await axios.post('http://localhost:3000/api/announcements', announcementData, {
                headers: {
                    Cookie: cookie
                }
            });
            
            console.log('   ✅ 添加公告成功');
            console.log('   返回数据:', addResponse.data);
            
            newAnnouncementId = addResponse.data.data.id;
            
        } catch (error) {
            console.log('   ❌ 添加公告失败:', error.response?.data?.message || error.message);
            if (error.response?.data) {
                console.log('   响应数据:', error.response.data);
            }
            return;
        }
        
        // 3. 删除公告
        console.log('\n3. 删除公告测试:');
        
        try {
            if (newAnnouncementId) {
                const deleteResponse = await axios.delete(`http://localhost:3000/api/announcements/${newAnnouncementId}`, {
                    headers: {
                        Cookie: cookie
                    }
                });
                
                console.log('   ✅ 删除公告成功');
                console.log('   返回数据:', deleteResponse.data);
            } else {
                console.log('   ⚠️  没有有效的公告ID用于删除测试');
            }
            
        } catch (error) {
            console.log('   ❌ 删除公告失败:', error.response?.data?.message || error.message);
            if (error.response?.data) {
                console.log('   响应数据:', error.response.data);
            }
        }
        
        // 4. 测试无效ID删除
        console.log('\n4. 无效ID删除测试:');
        
        try {
            const deleteResponse = await axios.delete('http://localhost:3000/api/announcements/invalid-id', {
                headers: {
                    Cookie: cookie
                }
            });
            
            console.log('   ⚠️  删除无效ID公告，应该失败但成功了');
        } catch (error) {
            console.log('   ✅ 删除无效ID公告失败（符合预期）');
            console.log('   错误信息:', error.response?.data?.message || error.message);
        }
        
        console.log('\n=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试失败:', error);
        console.error('错误详情:', error.stack);
    }
}

testAnnouncement();