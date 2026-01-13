// 初始化仪表盘
function initDashboard() {
    // 加载仪表盘数据
    loadDashboardData();
}

// 加载仪表盘数据
function loadDashboardData() {
    // 加载分类和书签数量
    loadCategoriesAndBookmarkCounts();
    
    // 加载访问量数据
    loadVisitData();
    
    // 渲染图表
    renderCharts();
}

// 加载分类和书签数量
function loadCategoriesAndBookmarkCounts() {
    // 模拟数据 - 实际项目中应从API获取
    const mockCategoryCount = 15;
    const mockBookmarkCount = 230;
    
    // 更新统计卡片
    $('#category-count').text(mockCategoryCount);
    $('#bookmark-count').text(mockBookmarkCount);
}

// 加载访问量数据
function loadVisitData() {
    // 模拟数据 - 实际项目中应从API获取
    const mockTodayVisits = 125;
    const mockTotalVisits = 15230;
    
    // 更新统计卡片
    $('#today-visits').text(mockTodayVisits);
    $('#total-visits').text(mockTotalVisits);
}

// 渲染图表
function renderCharts() {
    // 渲染分类书签数量柱状图
    renderCategoryBookmarkChart();
    
    // 渲染访问量趋势图
    renderVisitTrendChart();
}

// 渲染分类书签数量柱状图
function renderCategoryBookmarkChart() {
    // 模拟数据 - 实际项目中应从API获取
    const categories = ['常用工具', '社交媒体', '新闻资讯', '编程开发', '设计资源', '学习平台'];
    const bookmarkCounts = [45, 38, 27, 56, 32, 29];
    
    // 获取canvas元素
    const ctx = document.getElementById('category-bookmark-chart').getContext('2d');
    
    // 创建图表
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: '书签数量',
                data: bookmarkCounts,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '书签数量'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '分类名称'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// 渲染访问量趋势图
function renderVisitTrendChart() {
    // 模拟数据 - 实际项目中应从API获取
    const days = ['1月6日', '1月7日', '1月8日', '1月9日', '1月10日', '1月11日', '1月12日'];
    const visits = [85, 92, 110, 98, 135, 120, 125];
    
    // 获取canvas元素
    const ctx = document.getElementById('visit-trend-chart').getContext('2d');
    
    // 创建图表
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: '访问量',
                data: visits,
                fill: true,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.3,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '访问量'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}