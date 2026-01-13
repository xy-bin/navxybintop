// 模拟前端公告数据结构测试
const mockAnnouncements = [
    {
        id: 1,
        title: '测试公告',
        content: '测试内容',
        time: '2026/1/12 19:45:00',
        is_active: 1,
        created_at: '2026-01-12T11:45:00.000Z',
        updated_at: '2026-01-12T11:45:00.000Z'
    }
];

console.log('=== 前端公告数据结构测试 ===');

// 模拟旧的渲染方式
console.log('\n1. 旧的渲染方式 (使用announcement_id):');
mockAnnouncements.forEach((announcement, index) => {
    console.log(`   公告 ${index + 1}:`);
    console.log(`     旧方式ID: ${announcement.announcement_id}`); // 会显示undefined
    console.log(`     新方式ID: ${announcement.id}`); // 会显示正确ID
});

// 模拟新的HTML模板
console.log('\n2. 新的HTML模板测试:');
mockAnnouncements.forEach((announcement, index) => {
    const announcementRow = `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${announcement.id}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900 font-medium">${announcement.title}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button class="delete-announcement-btn text-red-500 hover:text-red-700" 
                        data-id="${announcement.id}">
                    <i class="fa fa-trash"></i> 删除
                </button>
            </td>
        </tr>
    `;
    
    console.log(`   公告 ${index + 1} HTML模板:`);
    console.log(announcementRow);
});

console.log('\n=== 测试完成 ===');
console.log('修复说明:');
console.log('- 将announcement.announcement_id改为announcement.id');
console.log('- 将data-announcement-id改为data-id');
console.log('- 更新事件处理函数中的data()方法参数');
console.log('\n现在公告ID应该能正常显示和删除了。');