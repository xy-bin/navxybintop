// 测试书签解析函数
const fs = require('fs');
const { JSDOM } = require('jsdom');

// 复制admin.js中的相关函数
function isValidUrl(url) {
    let cleanedUrl = url.trim().replace(/^`+|`+$/g, '');
    
    if (!cleanedUrl) {
        return false;
    }
    
    if (cleanedUrl.includes('://') || cleanedUrl.includes('.')) {
        return true;
    }
    
    try {
        const parsedUrl = new URL('http://' + cleanedUrl);
        return true;
    } catch (error) {
        console.warn('URL格式不标准，但仍尝试导入:', cleanedUrl);
        return true;
    }
}

// 创建测试HTML文件
const testHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1699361337" LAST_MODIFIED="1768128170" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>
        <DT><H3 ADD_DATE="1768125332" LAST_MODIFIED="1768125990">影音娱乐</H3>
        <DL><p>
            <DT><A HREF="https://music.163.com/?from=itab" ADD_DATE="1768125420">网易云音乐</A>
            <DT><A HREF="https://www.bilibili.com/" ADD_DATE="1768125978">哔哩哔哩</A>
            <DT><A HREF="https://www.iqiyi.com/" ADD_DATE="1768125990">爱奇艺</A>
        </DL><p>
        <DT><H3 ADD_DATE="1768128156" LAST_MODIFIED="1768128172">新建文件夹</H3>
        <DL><p>
            <DT><A HREF="https://boardmix.cn" ADD_DATE="1768128170">boardmix博思白板</A>
        </DL><p>
    </DL><p>
</DL><p>`;

// 先创建测试文件
fs.writeFileSync('./test_bookmarks.html', testHtml);

// 读取测试HTML文件
const htmlContent = fs.readFileSync('./test_bookmarks.html', 'utf8');

// 创建DOM环境
const dom = new JSDOM(htmlContent);
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;

// 模拟jQuery
const jQuery = require('jquery')(dom.window);
global.$ = jQuery;

// 重写解析函数，添加更详细的日志
function parseDlElement(dlElement) {
    const result = [];
    let currentCategory = null;
    let isFirstLevel = true;
    
    const skipFolders = ['书签栏', 'Bookmarks Bar', '书签菜单', 'Bookmarks Menu', 'Other Bookmarks', '其他书签'];

    const processElement = (element, level = 0) => {
        const indent = '  '.repeat(level);
        const tagName = element.tagName.toLowerCase();
        
        console.log(`${indent}处理元素: <${tagName}>`);
        
        if (tagName === 'dt') {
            const h3 = element.querySelector('h3');
            if (h3) {
                const categoryName = h3.textContent.trim();
                console.log(`${indent}  发现分类: ${categoryName}, 级别: ${isFirstLevel ? '第一级' : '子级'}`);
                
                if (categoryName === '我的') {
                    console.log(`${indent}  跳过分类: ${categoryName}`);
                    const nestedDl = element.querySelector('dl');
                    if (nestedDl) {
                        console.log(`${indent}  处理被排除分类下的子元素`);
                        processChildren(nestedDl, level + 1);
                    }
                    return;
                }
                
                if (isFirstLevel && skipFolders.includes(categoryName)) {
                    console.log(`${indent}  跳过系统文件夹: ${categoryName}`);
                    const nestedDl = element.querySelector('dl');
                    if (nestedDl) {
                        console.log(`${indent}  处理系统文件夹下的子元素`);
                        processChildren(nestedDl, level + 1);
                    }
                    return;
                }
                
                if (currentCategory) {
                    console.log(`${indent}  完成当前分类: ${currentCategory.category_name}, 包含 ${currentCategory.links.length} 个书签`);
                    result.push(currentCategory);
                }
                
                currentCategory = {
                    category_name: categoryName,
                    category_icon: 'fa fa-folder',
                    sort: result.length + 1,
                    links: []
                };
                console.log(`${indent}  开始新分类: ${currentCategory.category_name}`);
                
                isFirstLevel = false;
                
                const nestedDl = element.querySelector('dl');
                if (nestedDl) {
                    console.log(`${indent}  处理分类 ${categoryName} 下的子元素`);
                    processChildren(nestedDl, level + 1);
                    console.log(`${indent}  完成处理分类 ${categoryName} 下的子元素，当前书签数: ${currentCategory.links.length}`);
                }
            } else {
                const a = element.querySelector('a');
                if (a) {
                    const bookmarkName = a.textContent.trim();
                    let url = a.getAttribute('href') || '';
                    
                    console.log(`${indent}  发现书签: ${bookmarkName}, URL: ${url}`);
                    
                    if (bookmarkName === '我的' || url.includes('znl.tupojingyang.top/Web/mine.html')) {
                        console.log(`${indent}  跳过特定书签: ${bookmarkName}`);
                        return;
                    }
                    
                    url = url.trim().replace(/^`+|`+$/g, '');
                    
                    if (!url) {
                        console.log(`${indent}  跳过空URL书签: ${bookmarkName}`);
                        return;
                    }
                    
                    const bookmark = {
                        link_name: bookmarkName,
                        link_url: url,
                        link_icon: 'fa fa-link',
                        link_desc: a.getAttribute('description') || '',
                        sort: currentCategory ? currentCategory.links.length + 1 : 1
                    };
                    
                    if (currentCategory) {
                        currentCategory.links.push(bookmark);
                        console.log(`${indent}  添加到分类 ${currentCategory.category_name}，当前书签数: ${currentCategory.links.length}`);
                    } else {
                        console.log(`${indent}  未分类书签: ${bookmarkName}`);
                        if (!result.find(cat => cat.category_name === '未分类')) {
                            result.push({
                                category_name: '未分类',
                                category_icon: 'fa fa-folder',
                                sort: result.length + 1,
                                links: [bookmark]
                            });
                        } else {
                            const uncategorized = result.find(cat => cat.category_name === '未分类');
                            uncategorized.links.push(bookmark);
                        }
                    }
                }
            }
        } else if (tagName === 'dl') {
            console.log(`${indent}  处理嵌套的DL元素`);
            processChildren(element, level + 1);
        }
    };

    const processChildren = (parentElement, level = 0) => {
        const indent = '  '.repeat(level);
        console.log(`${indent}处理子元素，共 ${parentElement.children.length} 个`);
        
        const validChildren = Array.from(parentElement.children).filter(child => 
            child.nodeType === Node.ELEMENT_NODE
        );
        
        validChildren.forEach(child => {
            console.log(`${indent}处理子元素: <${child.tagName}>`);
            processElement(child, level);
        });
    };

    console.log('开始解析书签数据');
    processChildren(dlElement);

    if (currentCategory) {
        console.log(`添加最后一个分类: ${currentCategory.category_name}, 包含 ${currentCategory.links.length} 个书签`);
        result.push(currentCategory);
    }
    
    console.log('解析完成，共找到:', result.length, '个分类');
    let totalLinks = 0;
    result.forEach(category => {
        console.log('分类:', category.category_name, '包含', category.links.length, '个书签');
        totalLinks += category.links.length;
    });
    console.log('总计:', totalLinks, '个书签');

    return result;
}

// 获取DL元素
const dlElement = document.querySelector('dl');

// 解析书签
const result = parseDlElement(dlElement);

// 输出结果
console.log('\n解析结果:', JSON.stringify(result, null, 2));

// 清理
fs.unlinkSync('./test_bookmarks.html');