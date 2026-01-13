// 管理后台核心功能


// 初始化管理页面
function initAdminPage() {
    // 初始化仪表盘
    initDashboard();
    
    // 加载分类列表
    loadCategories();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化移动端菜单
    initAdminMobileMenu();
    
    // 绑定导航菜单事件
    bindNavigationEvents();
    
    // 初始化主题设置
    initThemeSettings();
    
    // 初始化图片源管理
    initImageSourceManagement();
    
    // 初始化公告管理
    initAnnouncementManagement();
}


// 页面加载完成后初始化
$(document).ready(function() {
    initAdminPage();
});


// 初始化仪表盘
function initDashboard() {
    // 仪表盘数据加载逻辑
    $.ajax({
        url: "/api/dashboard",
        method: "GET",
        success: function(response) {
            if (response.success) {
                // 更新仪表盘统计数据
                $("#total-bookmarks").text(response.data.total_bookmarks);
                $("#total-categories").text(response.data.total_categories);
                $("#active-users").text(response.data.active_users);
            }
        },
        error: function() {
            // 仪表盘数据加载失败时使用默认值
            $("#total-bookmarks").text("0");
            $("#total-categories").text("0");
            $("#active-users").text("0");
        }
    });
}


// 加载分类列表
function loadCategories() {
    $.ajax({
        url: "/api/categories",
        method: "GET",
        success: function(response) {
            if (response.success) {
                // 填充分类列表表格
                $("#category-list").empty();
                response.data.forEach(category => {
                    const row = "<tr data-id=\"" + category.category_id + "\"><td class=\"py-3 px-4 text-center\"><i class=\"drag-handle fa fa-bars cursor-move text-gray-500\"></i></td><td class=\"py-3 px-4 text-center\">" + category.category_id + "</td><td class=\"py-3 px-4\">" + category.category_name + "</td><td class=\"py-3 px-4 text-center\"><i class=\"" + category.category_icon + " text-xl\"></i></td><td class=\"py-3 px-4 font-mono text-sm\">" + category.category_icon + "</td><td class=\"py-3 px-4 text-right\"><button class=\"edit-category-btn bg-primary text-white px-3 py-1 rounded-lg mr-2\" data-id=\"" + category.category_id + "\">编辑</button><button class=\"delete-category-btn bg-red-500 text-white px-3 py-1 rounded-lg\" data-id=\"" + category.category_id + "\">删除</button></td></tr>";
                    $("#category-list").append(row);
                });
                
                // 填充分类选择下拉框
                $("#select-category").empty();
                // 添加"全部分类"选项
                $("#select-category").append("<option value=\"\">全部分类</option>");
                response.data.forEach(category => {
                    const option = "<option value=\"" + category.category_id + "\">" + category.category_name + "</option>";
                    $("#select-category").append(option);
                });
                
                bindCategoryActions();
                bindCategoryFilter();
                
                // 分类加载完成后，默认加载所有书签
                loadBookmarks();
            }
        },
        error: function(xhr) {
            let errorMsg = "加载分类失败";
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) {}
            alert(errorMsg);
            
            // 分类加载失败时，仍然尝试加载书签
            loadBookmarks();
        }
    });
}


// 绑定分类操作事件
function bindCategoryActions() {
    // 移除事件委托绑定，移到initEventListeners()中
}


// 加载书签列表
function loadBookmarks(categoryId = null) {
    let url = "/api/bookmarks";
    if (categoryId) {
        url = "/api/categories/" + categoryId + "/links";
    }
    
    $.ajax({
        url: url,
        method: "GET",
        success: function(response) {
            let bookmarks = [];
            if (response.success) {
                bookmarks = response.data;
            } else if (response.length > 0) {
                // 处理旧格式的响应
                bookmarks = response.map(link => ({
                    bookmark_id: link.link_id,
                    bookmark_name: link.link_name,
                    bookmark_url: link.link_url,
                    bookmark_icon: link.link_icon,
                    bookmark_description: link.link_desc,
                    category_id: link.category_id,
                    sort: link.sort
                }));
            }
            
            $("#link-list").empty();
            bookmarks.forEach(bookmark => {
                const row = "<tr data-id=\"" + bookmark.bookmark_id + "\"><td class=\"py-3 px-4 text-center\"><i class=\"drag-handle fa fa-bars cursor-move text-gray-500\"></i></td><td class=\"py-3 px-4\">" + bookmark.bookmark_id + "</td><td class=\"py-3 px-4\">" + bookmark.bookmark_name + "</td><td class=\"py-3 px-4 truncate\"><a href=\"" + bookmark.bookmark_url + "\" target=\"_blank\">" + bookmark.bookmark_url + "</a></td><td class=\"py-3 px-4\"><i class=\"" + bookmark.bookmark_icon + "\"></i></td><td class=\"py-3 px-4 text-right\"><button class=\"edit-link-btn bg-primary text-white px-3 py-1 rounded-lg mr-2\" data-id=\"" + bookmark.bookmark_id + "\">编辑</button><button class=\"delete-link-btn bg-red-500 text-white px-3 py-1 rounded-lg\" data-id=\"" + bookmark.bookmark_id + "\">删除</button></td></tr>";
                $("#link-list").append(row);
            });
            bindBookmarkActions();
        },
        error: function(xhr) {
            let errorMsg = "加载书签失败";
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) {}
            alert(errorMsg);
        }
    });
}

// 绑定分类选择事件
function bindCategoryFilter() {
    $("#select-category").on("change", function() {
        const categoryId = $(this).val();
        loadBookmarks(categoryId || null);
    });
}


// 绑定书签操作事件
function bindBookmarkActions() {
    // 移除事件委托绑定，移到initEventListeners()中
}


// 初始化拖拽排序功能
function initSortable() {
    // 初始化分类拖拽排序
    $("#category-list").sortable({
        handle: ".drag-handle",
        axis: "y",
        update: function(event, ui) {
            // 获取排序后的分类ID数组
            const categoryIds = $("#category-list").sortable("toArray", { attribute: "data-id" });
            
            // 更新每个分类的排序值
            categoryIds.forEach((id, index) => {
                $.ajax({
                    url: "/api/categories/" + id + "/sort",
                    method: "PUT",
                    data: JSON.stringify({ sort: index + 1 }),
                    contentType: "application/json",
                    success: function(response) {
                        // 排序已保存，无需更新页面显示
                    },
                    error: function(xhr) {
                        let errorMsg = "更新分类排序失败";
                        try {
                            const response = JSON.parse(xhr.responseText);
                            errorMsg = response.message || errorMsg;
                        } catch (e) {}
                        alert(errorMsg);
                        // 恢复原始排序
                        $("#category-list").sortable("cancel");
                    }
                });
            });
        }
    });
    
    // 初始化书签拖拽排序
    $("#link-list").sortable({
        handle: ".drag-handle",
        axis: "y",
        update: function(event, ui) {
            // 获取排序后的书签ID数组
            const bookmarkIds = $("#link-list").sortable("toArray", { attribute: "data-id" });
            
            // 更新每个书签的排序值
            bookmarkIds.forEach((id, index) => {
                $.ajax({
                    url: "/api/links/" + id + "/sort",
                    method: "PUT",
                    data: JSON.stringify({ sort: index + 1 }),
                    contentType: "application/json",
                    success: function(response) {
                        // 排序已保存，无需更新页面显示
                    },
                    error: function(xhr) {
                        let errorMsg = "更新书签排序失败";
                        try {
                            const response = JSON.parse(xhr.responseText);
                            errorMsg = response.message || errorMsg;
                        } catch (e) {}
                        alert(errorMsg);
                        // 恢复原始排序
                        $("#link-list").sortable("cancel");
                    }
                });
            });
        }
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 初始化拖拽排序
    initSortable();
    
    // 分类表单保存按钮点击
    $("#save-category-btn").on("click", function(e) {
        const id = $("#category-id").val();
        const data = {
            category_name: $("#category-name").val(),
            category_icon: $("#category-icon").val(),
            sort: $("#category-sort").val()
        };
        
        const url = id ? "/api/categories/" + id : "/api/categories";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadCategories();
                    alert(id ? "分类更新成功" : "分类创建成功");
                    $("#category-form").addClass("hidden");
                    $("#category-form input").val("");
                    $("#category-id").val("");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新分类失败" : "创建分类失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 书签表单保存按钮点击
    $("#save-link-btn").on("click", function(e) {
        const id = $("#link-id").val();
        const data = {
            bookmark_name: $("#link-name").val(),
            bookmark_url: $("#link-url").val(),
            bookmark_icon: $("#link-icon").val(),
            category_id: $("#select-category").val(),
            bookmark_description: $("#link-desc").val(),
            sort: $("#link-sort").val()
        };
        
        const url = id ? "/api/bookmarks/" + id : "/api/bookmarks";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadBookmarks();
                    alert(id ? "书签更新成功" : "书签创建成功");
                    $("#link-form").addClass("hidden");
                    $("#link-form input").val("");
                    $("#link-id").val("");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新书签失败" : "创建书签失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 关闭分类表单
    $("#cancel-category-btn").on("click", function() {
        $("#category-form").addClass("hidden");
        $("#category-form input").val("");
        $("#category-id").val("");
    });
    
    // 关闭书签表单
    $("#cancel-link-btn").on("click", function() {
        $("#link-form").addClass("hidden");
        $("#link-form input").val("");
        $("#link-id").val("");
    });
    
    // 添加新分类按钮
    $("#add-category-btn").on("click", function() {
        $("#category-form").removeClass("hidden");
        $("#category-form input").val("");
        $("#category-id").val("");
    });
    
    // 添加新书签按钮
    $("#add-link-btn").on("click", function() {
        $("#link-form").removeClass("hidden");
        $("#link-form input").val("");
        $("#link-id").val("");
    });
    
    // 退出登录按钮
    $("#logout-btn").on("click", function() {
        $.ajax({
            url: "/api/logout",
            method: "POST",
            success: function(response) {
                if (response.success) {
                    window.location.href = "/login.html";
                }
            },
            error: function(xhr) {
                let errorMsg = "退出登录失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 移除所有现有的删除事件监听器，使用更彻底的方式
    $(document).off("click");
    
    // 重新绑定所有需要的事件监听器，但确保删除事件监听器是唯一的
    
    // 分类表单保存按钮点击
    $("#save-category-btn").on("click", function(e) {
        const id = $("#category-id").val();
        const data = {
            category_name: $("#category-name").val(),
            category_icon: $("#category-icon").val(),
            sort: $("#category-sort").val()
        };
        
        const url = id ? "/api/categories/" + id : "/api/categories";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadCategories();
                    alert(id ? "分类更新成功" : "分类创建成功");
                    $("#category-form").addClass("hidden");
                    $("#category-form input").val("");
                    $("#category-id").val("");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新分类失败" : "创建分类失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 书签表单保存按钮点击
    $("#save-link-btn").on("click", function(e) {
        const id = $("#link-id").val();
        const data = {
            bookmark_name: $("#link-name").val(),
            bookmark_url: $("#link-url").val(),
            bookmark_icon: $("#link-icon").val(),
            category_id: $("#select-category").val(),
            bookmark_description: $("#link-desc").val(),
            sort: $("#link-sort").val()
        };
        
        const url = id ? "/api/bookmarks/" + id : "/api/bookmarks";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadBookmarks();
                    alert(id ? "书签更新成功" : "书签创建成功");
                    $("#link-form").addClass("hidden");
                    $("#link-form input, #link-form textarea").val("");
                    $("#link-id").val("");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新书签失败" : "创建书签失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 图片源表单保存按钮点击
    $("#save-image-source-btn").on("click", function(e) {
        const id = $("#image-source-id").val();
        const data = {
            name: $("#image-source-name").val(),
            url: $("#image-source-url").val(),
            desc: $("#image-source-desc").val()
        };
        
        const url = id ? "/api/image-sources/" + id : "/api/image-sources";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadImageSources();
                    alert(id ? "图片源更新成功" : "图片源创建成功");
                    $("#image-source-form").addClass("hidden");
                    $("#image-source-form input, #image-source-form textarea").val("");
                    $("#image-source-id").val("");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新图片源失败" : "创建图片源失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 公告表单保存按钮点击
    $("#save-announcement-btn").on("click", function(e) {
        const id = $("#announcement-id").val();
        const data = {
            title: $("#announcement-title").val(),
            content: $("#announcement-content").val(),
            is_active: $("#announcement-is-active").is(":checked") ? 1 : 0
        };
        
        const url = id ? "/api/announcements/" + id : "/api/announcements";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadAnnouncements();
                    alert(id ? "公告更新成功" : "公告添加成功");
                    $("#announcement-form").addClass("hidden");
                    $("#announcement-form input, #announcement-form textarea").val("");
                    $("#announcement-is-active").prop("checked", false);
                    $("#announcement-id").val("");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新公告失败" : "创建公告失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 退出登录按钮
    $("#logout-btn").on("click", function() {
        $.ajax({
            url: "/api/logout",
            method: "POST",
            success: function(response) {
                if (response.success) {
                    window.location.href = "/login.html";
                }
            },
            error: function(xhr) {
                let errorMsg = "退出登录失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 编辑分类按钮
    $(document).on("click", ".edit-category-btn", function(e) {
        e.stopPropagation();
        const id = $(this).data("id");
        // 根据id获取分类详情并填充表单
        $.ajax({
            url: "/api/categories/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const category = response.data;
                    $("#category-id").val(category.category_id);
                    $("#category-name").val(category.category_name);
                    $("#category-icon").val(category.category_icon);
                    $("#category-sort").val(category.sort);
                    $("#category-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取分类详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 编辑书签按钮
    $(document).on("click", ".edit-link-btn", function(e) {
        e.stopPropagation();
        const id = $(this).data("id");
        // 根据id获取书签详情并填充表单
        $.ajax({
            url: "/api/bookmarks/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const bookmark = response.data;
                    $("#link-id").val(bookmark.bookmark_id);
                    $("#link-name").val(bookmark.bookmark_name);
                    $("#link-url").val(bookmark.bookmark_url);
                    $("#link-icon").val(bookmark.bookmark_icon);
                    $("#link-desc").val(bookmark.bookmark_description);
                    $("#select-category").val(bookmark.category_id);
                    $("#link-sort").val(bookmark.sort);
                    $("#link-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取书签详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 编辑图片源按钮
    $(document).on("click", ".edit-image-source-btn", function(e) {
        e.stopPropagation();
        const id = $(this).data("id");
        // 根据id获取图片源详情并填充表单
        $.ajax({
            url: "/api/image-sources/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const source = response.data;
                    $("#image-source-id").val(source.id);
                    $("#image-source-name").val(source.name);
                    $("#image-source-url").val(source.url);
                    $("#image-source-desc").val(source.desc);
                    $("#image-source-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取图片源详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 编辑公告按钮
    $(document).on("click", ".edit-announcement-btn", function(e) {
        e.stopPropagation();
        const id = $(this).data("id");
        // 根据id获取公告详情并填充表单
        $.ajax({
            url: "/api/announcements/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const announcement = response.data;
                    $("#announcement-id").val(announcement.id);
                    $("#announcement-title").val(announcement.title);
                    $("#announcement-content").html(announcement.content);
                    $("#announcement-is-active").prop("checked", announcement.is_active);
                    $("#announcement-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取公告详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });

    // 只保留这一个统一的删除事件监听器
    $(document).on("click", ".delete-category-btn, .delete-link-btn, .delete-image-source-btn, .delete-announcement-btn", function(e) {
        // 必须先阻止所有默认行为和事件冒泡
        e.preventDefault();
        e.stopPropagation();
        
        // 获取按钮信息
        const $this = $(this);
        const id = $this.data('id');
        
        // 确定删除类型和确认消息
        let confirmMessage = "确定要删除此项目吗？此操作不可恢复！";
        let apiUrl = "";
        let reloadFunction = function() {};
        
        if ($this.hasClass('delete-category-btn')) {
            confirmMessage = "确定要删除此分类吗？此操作将同时删除该分类下的所有书签，不可恢复！";
            apiUrl = `/api/categories/${id}`;
            reloadFunction = loadCategories;
        } else if ($this.hasClass('delete-link-btn')) {
            confirmMessage = "确定要删除此书签吗？此操作不可恢复！";
            apiUrl = `/api/bookmarks/${id}`;
            reloadFunction = loadBookmarks;
        } else if ($this.hasClass('delete-image-source-btn')) {
            confirmMessage = "确定要删除此图片源吗？此操作不可恢复！";
            apiUrl = `/api/image-sources/${id}`;
            reloadFunction = loadImageSources;
        } else if ($this.hasClass('delete-announcement-btn')) {
            confirmMessage = "确定要删除此公告吗？此操作不可恢复！";
            apiUrl = `/api/announcements/${id}`;
            reloadFunction = loadAnnouncements;
        }
        
        // 使用setTimeout确保确认框在事件循环的下一个周期执行
        setTimeout(function() {
            // 显示确认对话框
            if (confirm(confirmMessage)) {
                // 用户确认后才执行AJAX请求
                $.ajax({
                    url: apiUrl,
                    method: 'DELETE',
                    success: function(response) {
                        if (response.success) {
                            reloadFunction();
                            alert('删除成功！');
                        }
                    },
                    error: function(xhr) {
                        let errorMsg = '删除失败！';
                        try {
                            const resp = JSON.parse(xhr.responseText);
                            errorMsg = resp.message || errorMsg;
                        } catch (e) {}
                        alert(errorMsg);
                    }
                });
            }
        }, 0);
    });
    
    // 清空所有数据按钮 - 重新实现，确保先确认后执行
    $("#clear-all-data-btn").off("click").on("click", function(e) {
        // 防止任何默认行为
        e.preventDefault();
        
        console.log("清空数据按钮被点击，准备弹出确认框...");
        
        // 使用setTimeout确保确认框在事件循环的下一个周期执行，避免任何可能的同步执行问题
        setTimeout(function() {
            // 先弹出确认框
            const userConfirmed = confirm("警告：此操作将删除所有分类和书签数据，且无法恢复！\n\n确定要继续吗？");
            console.log("用户确认结果:", userConfirmed);
            
            if (userConfirmed) {
                // 用户确认后才执行删除操作
                console.log("用户已确认，开始执行删除操作...");
                $.ajax({
                    url: "/api/clear-all-data",
                    method: "DELETE",
                    success: function(response) {
                        if (response.success) {
                            alert("所有数据已成功清空！");
                            // 重新加载分类和书签列表
                            loadCategories();
                            loadBookmarks();
                        }
                    },
                    error: function(xhr) {
                        let errorMsg = "清空数据失败";
                        try {
                            const response = JSON.parse(xhr.responseText);
                            errorMsg = response.message || errorMsg;
                        } catch (e) {}
                        alert(errorMsg);
                    }
                });
            } else {
                console.log("用户取消了删除操作");
            }
        }, 0);
    });
    
    // 图标选择器按钮
    $("#icon-selector-btn").on("click", function() {
        $("#icon-selector-modal").removeClass("hidden").addClass("flex");
    });
    
    // 关闭图标选择器
    $("#icon-selector-close, #icon-selector-cancel").on("click", function() {
        $("#icon-selector-modal").addClass("hidden").removeClass("flex");
    });
    
    // 导出书签按钮
    $("#export-bookmarks-btn").on("click", function() {
        // 获取所有书签数据
        $.ajax({
            url: "/api/bookmarks",
            method: "GET",
            success: function(response) {
                if (response.success) {
                    // 将书签数据转换为JSON格式
                    const bookmarks = response.data;
                    const jsonData = JSON.stringify(bookmarks, null, 2);
                    
                    // 创建下载链接
                    const blob = new Blob([jsonData], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
                    
                    // 触发下载
                    document.body.appendChild(a);
                    a.click();
                    
                    // 清理
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            },
            error: function(xhr) {
                let errorMsg = "导出书签失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 解析HTML书签文件，包含分类结构
    function parseHtmlBookmarks(htmlContent) {
        const result = {
            categories: [], // 提取的分类列表
            bookmarks: [] // 提取的书签列表
        };
        
        console.log('=== 开始解析HTML书签文件 ===');
        console.log('文件内容长度:', htmlContent.length);
        console.log('文件内容开头:', htmlContent.substring(0, 200));
        
        // 创建一个临时DOM元素来解析HTML内容
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // 1. 首先提取所有分类（H3标签）
        console.log('=== 提取分类 ===');
        const allH3s = tempDiv.querySelectorAll('h3, H3');
        console.log('找到H3标签数量:', allH3s.length);
        
        allH3s.forEach(h3 => {
            // 忽略浏览器书签栏
            if (h3.getAttribute('PERSONAL_TOOLBAR_FOLDER') === 'true') {
                console.log('忽略浏览器书签栏:', h3.textContent.trim());
                return;
            }
            
            const categoryName = h3.textContent.trim();
            if (categoryName && !result.categories.includes(categoryName)) {
                result.categories.push(categoryName);
                console.log('添加分类:', categoryName);
            }
        });
        
        console.log('提取到的分类:', result.categories);
        
        // 2. 然后提取所有书签
        console.log('\n=== 提取书签 ===');
        const allBookmarkAs = tempDiv.querySelectorAll('a, A');
        console.log('找到A标签数量:', allBookmarkAs.length);
        
        allBookmarkAs.forEach((bookmarkA, index) => {
            // 获取书签URL
            const url = bookmarkA.getAttribute('href');
            console.log(`处理A标签 ${index + 1}:`, bookmarkA.textContent.trim(), 'URL:', url);
            
            // 跳过无效URL
            if (!url) {
                console.log('跳过无效URL');
                return;
            }
            
            // 跳过非HTTP/HTTPS URL
            if (!(url.startsWith('http://') || url.startsWith('https://'))) {
                console.log('跳过非HTTP/HTTPS URL');
                return;
            }
            
            // 排除特定书签
            if (url === 'http://znl.tupojingyang.top/Web/mine.html') {
                console.log('排除特定书签');
                return;
            }
            
            // 3. 查找书签所属的分类
            let categoryName = '未分类';
            
            // 查找包含该书签的DT元素
            let current = bookmarkA;
            while (current && current.tagName !== 'HTML') {
                // 查找当前元素或其父元素是否在一个DL中
                const dl = current.closest('dl, DL');
                if (dl) {
                    // 查找这个DL之前的兄弟DT元素，里面包含分类名称
                    let prevSibling = dl.previousElementSibling;
                    while (prevSibling) {
                        if (prevSibling.tagName === 'DT' || prevSibling.tagName === 'dt') {
                            const folderH3 = prevSibling.querySelector('h3, H3');
                            if (folderH3) {
                                // 检查是否是浏览器书签栏
                                if (folderH3.getAttribute('PERSONAL_TOOLBAR_FOLDER') !== 'true') {
                                    categoryName = folderH3.textContent.trim();
                                    console.log('找到分类:', categoryName);
                                    break;
                                }
                            }
                        }
                        prevSibling = prevSibling.previousElementSibling;
                    }
                    break;
                }
                current = current.parentElement;
            }
            
            // 4. 创建书签对象
            const bookmark = {
                bookmark_name: bookmarkA.textContent.trim() || `未命名书签${index + 1}`,
                bookmark_url: url,
                bookmark_icon: 'fa fa-link',
                category_name: categoryName,
                bookmark_description: bookmarkA.getAttribute('title') || '',
                sort: result.bookmarks.length
            };
            
            result.bookmarks.push(bookmark);
            console.log('添加书签:', bookmark.bookmark_name, '分类:', bookmark.category_name);
        });
        
        // 5. 清理分类列表，移除重复项
        result.categories = [...new Set(result.categories)];
        
        console.log('\n=== 解析完成 ===');
        console.log('最终分类列表:', result.categories);
        console.log('最终书签数量:', result.bookmarks.length);
        
        return result;
    }
    
    // 导入书签文件选择
    $("#import-bookmarks-file").on("change", function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // 读取文件内容
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let parsedData = { categories: [], bookmarks: [] };
                const fileContent = e.target.result;
                
                console.log('文件内容开头:', fileContent.substring(0, 100));
                
                // 检测文件类型并解析
                if (fileContent.trim().startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>') || 
                    fileContent.includes('<DT><A HREF=')) {
                    // HTML书签格式
                    console.log('检测到HTML书签格式');
                    parsedData = parseHtmlBookmarks(fileContent);
                    console.log('解析到的分类数量:', parsedData.categories.length);
                    console.log('解析到的书签数量:', parsedData.bookmarks.length);
                    if (parsedData.bookmarks.length === 0) {
                        alert('未从HTML文件中解析到有效的书签');
                        $("#import-bookmarks-file").val(""); // 重置文件选择
                        return;
                    }
                } else {
                    // JSON书签格式
                    console.log('检测到JSON书签格式');
                    const jsonBookmarks = JSON.parse(fileContent);
                    
                    // 验证JSON数据格式
                    if (!Array.isArray(jsonBookmarks)) {
                        throw new Error('无效的书签数据格式');
                    }
                    parsedData.bookmarks = jsonBookmarks;
                }
                
                // 获取现有分类和书签，用于去重
                let existingCategories = {};
                let existingBookmarks = new Set();
                
                // 先获取所有分类
                $.ajax({
                    url: '/api/categories',
                    method: 'GET',
                    async: false, // 同步获取分类列表
                    success: function(response) {
                        if (response.success && response.data.length > 0) {
                            response.data.forEach(category => {
                                existingCategories[category.category_name] = category.category_id;
                            });
                        }
                    },
                    error: function(xhr) {
                        console.error('获取分类列表失败:', xhr);
                    }
                });
                
                // 获取所有书签URL，用于去重
                $.ajax({
                    url: '/api/bookmarks',
                    method: 'GET',
                    async: false, // 同步获取书签列表
                    success: function(response) {
                        if (response.success && response.data.length > 0) {
                            response.data.forEach(bookmark => {
                                existingBookmarks.add(bookmark.bookmark_url);
                            });
                        }
                    },
                    error: function(xhr) {
                        console.error('获取书签列表失败:', xhr);
                    }
                });
                
                // 创建新分类
                let categoryIdMap = { ...existingCategories };
                let createdCategories = 0;
                
                // 先处理分类创建，确保所有解析到的分类都被创建
                parsedData.categories.forEach((categoryName, index) => {
                    if (!categoryIdMap[categoryName]) {
                        // 创建新分类
                        $.ajax({
                            url: '/api/categories',
                            method: 'POST',
                            data: JSON.stringify({
                                category_name: categoryName,
                                category_icon: 'fa fa-folder',
                                sort: Object.keys(categoryIdMap).length + index + 1
                            }),
                            contentType: 'application/json',
                            async: false, // 同步创建分类
                            success: function(response) {
                                if (response.success) {
                                    categoryIdMap[categoryName] = response.data.category_id;
                                    createdCategories++;
                                    console.log('创建分类成功:', categoryName, response.data.category_id);
                                }
                            },
                            error: function(xhr, status, error) {
                                console.error('创建分类失败:', categoryName, xhr.responseText || error);
                            }
                        });
                    }
                });
                
                // 确保所有分类都被添加到 categoryIdMap 中
                console.log('现有分类映射:', categoryIdMap);
                console.log('解析到的分类:', parsedData.categories);
                
                // 如果没有未分类，创建一个
                if (!categoryIdMap['未分类']) {
                    $.ajax({
                        url: '/api/categories',
                        method: 'POST',
                        data: JSON.stringify({
                            category_name: '未分类',
                            category_icon: 'fa fa-folder',
                            sort: Object.keys(categoryIdMap).length + 1
                        }),
                        contentType: 'application/json',
                        async: false, // 同步创建分类
                        success: function(response) {
                            if (response.success) {
                                categoryIdMap['未分类'] = response.data.category_id;
                                createdCategories++;
                                console.log('创建默认分类成功:', response.data.category_id);
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('创建默认分类失败:', xhr.responseText || error);
                        }
                    });
                }
                
                // 调试：输出最终的分类映射
                console.log('最终分类映射:', categoryIdMap);
                
                // 批量导入书签，跳过重复项
                let importedCount = 0;
                let failedCount = 0;
                let skippedCount = 0;
                
                // 过滤掉重复的书签
                const uniqueBookmarks = parsedData.bookmarks.filter(bookmark => {
                    if (existingBookmarks.has(bookmark.bookmark_url)) {
                        skippedCount++;
                        return false;
                    }
                    existingBookmarks.add(bookmark.bookmark_url);
                    return true;
                });
                
                console.log('去重后书签数量:', uniqueBookmarks.length);
                
                // 遍历书签数据，逐个导入
                uniqueBookmarks.forEach((bookmark, index) => {
                    // 调试：输出书签信息
                    console.log('处理书签:', bookmark.bookmark_name, '预期分类:', bookmark.category_name);
                    console.log('分类映射:', categoryIdMap);
                    
                    // 获取分类ID，使用更严格的检查
                    let categoryId = null;
                    
                    // 首先，检查书签是否有category_id
                    if (bookmark.category_id) {
                        categoryId = bookmark.category_id;
                        console.log('使用书签自带的category_id:', categoryId);
                    } 
                    // 其次，检查书签是否有category_name，并且该分类存在于映射中
                    else if (bookmark.category_name && categoryIdMap[bookmark.category_name]) {
                        categoryId = categoryIdMap[bookmark.category_name];
                        console.log('通过category_name找到分类ID:', bookmark.category_name, '->', categoryId);
                    } 
                    // 再次，尝试将category_name转换为字符串并查找
                    else if (bookmark.category_name) {
                        const categoryNameStr = String(bookmark.category_name).trim();
                        if (categoryIdMap[categoryNameStr]) {
                            categoryId = categoryIdMap[categoryNameStr];
                            console.log('通过转换后的category_name找到分类ID:', categoryNameStr, '->', categoryId);
                        } else {
                            // 如果分类不存在，创建它
                            console.log('分类不存在，需要创建:', categoryNameStr);
                            $.ajax({
                                url: '/api/categories',
                                method: 'POST',
                                data: JSON.stringify({
                                    category_name: categoryNameStr,
                                    category_icon: 'fa fa-folder',
                                    sort: Object.keys(categoryIdMap).length + 1
                                }),
                                contentType: 'application/json',
                                async: false, // 同步创建分类
                                success: function(response) {
                                    if (response.success) {
                                        categoryIdMap[categoryNameStr] = response.data.category_id;
                                        categoryId = response.data.category_id;
                                        createdCategories++;
                                        console.log('创建分类成功:', categoryNameStr, response.data.category_id);
                                    }
                                },
                                error: function(xhr, status, error) {
                                    console.error('创建分类失败:', categoryNameStr, xhr.responseText || error);
                                }
                            });
                        }
                    }
                    
                    // 最后，如果还是没有分类ID，使用未分类
                    if (!categoryId) {
                        categoryId = categoryIdMap['未分类'];
                        console.log('使用默认分类:', categoryId);
                    }
                    
                    // 为书签添加默认分类（如果没有指定）
                    const bookmarkData = {
                        bookmark_name: bookmark.bookmark_name || `未命名书签${index + 1}`,
                        bookmark_url: bookmark.bookmark_url,
                        bookmark_icon: bookmark.bookmark_icon || 'fa fa-link',
                        category_id: categoryId,
                        bookmark_description: bookmark.bookmark_description || '',
                        sort: bookmark.sort || index
                    };
                    
                    console.log('最终导入书签数据:', bookmarkData);
                    
                    $.ajax({
                        url: '/api/bookmarks',
                        method: 'POST',
                        data: JSON.stringify(bookmarkData),
                        contentType: 'application/json',
                        success: function(response) {
                            console.log('书签导入成功:', response);
                            importedCount++;
                            // 所有书签导入完成后显示结果
                            if (importedCount + failedCount === uniqueBookmarks.length) {
                                let resultMsg = `书签导入完成：\n`;
                                resultMsg += `成功导入书签：${importedCount} 个\n`;
                                resultMsg += `创建分类：${createdCategories} 个\n`;
                                resultMsg += `跳过重复书签：${skippedCount} 个\n`;
                                resultMsg += `导入失败：${failedCount} 个`;
                                
                                alert(resultMsg);
                                loadCategories(); // 重新加载分类列表
                                loadBookmarks(); // 重新加载书签列表
                                $("#import-bookmarks-file").val(""); // 重置文件选择
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('书签导入失败:', bookmarkData.bookmark_name, xhr.responseText || error);
                            failedCount++;
                            // 所有书签导入完成后显示结果
                            if (importedCount + failedCount === uniqueBookmarks.length) {
                                let resultMsg = `书签导入完成：\n`;
                                resultMsg += `成功导入书签：${importedCount} 个\n`;
                                resultMsg += `创建分类：${createdCategories} 个\n`;
                                resultMsg += `跳过重复书签：${skippedCount} 个\n`;
                                resultMsg += `导入失败：${failedCount} 个`;
                                
                                alert(resultMsg);
                                loadCategories(); // 重新加载分类列表
                                loadBookmarks(); // 重新加载书签列表
                                $("#import-bookmarks-file").val(""); // 重置文件选择
                            }
                        }
                    });
                });
                
                // 如果所有书签都被跳过
                if (uniqueBookmarks.length === 0 && skippedCount > 0) {
                    alert(`书签导入完成：所有 ${skippedCount} 个书签都是重复的，已跳过`);
                    $("#import-bookmarks-file").val(""); // 重置文件选择
                }
            } catch (error) {
                console.error('导入过程发生错误:', error);
                alert(`导入书签失败：${error.message}\n\n详细错误信息请查看浏览器控制台`);
                $("#import-bookmarks-file").val(""); // 重置文件选择
            }
        };
        
        reader.onerror = function() {
            console.error('文件读取失败');
            alert('读取文件失败，请检查文件是否损坏');
            $("#import-bookmarks-file").val(""); // 重置文件选择
        };
        
        // 开始读取文件
        reader.readAsText(file);
    });
    
    // ------------------------
    // 主题设置功能
    // ------------------------
    
    // 主题选择
    $("input[name='theme']").on("change", function() {
        const theme = $(this).val();
        localStorage.setItem("theme", theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
    });
    
    // 背景图启用/禁用
    $("#bg-image-enabled").on("change", function() {
        const enabled = $(this).prop("checked");
        if (enabled) {
            $("#bg-image-api-container, #bg-image-url-container").removeClass("hidden");
        } else {
            $("#bg-image-api-container, #bg-image-url-container").addClass("hidden");
        }
    });
    
    // 背景图类型切换
    $("input[name='bg-image-type']").on("change", function() {
        const type = $(this).val();
        if (type === "random") {
            $("#bg-image-api-container").removeClass("hidden");
            $("#bg-image-url-container").addClass("hidden");
        } else {
            $("#bg-image-api-container").addClass("hidden");
            $("#bg-image-url-container").removeClass("hidden");
        }
    });
    
    // 保存主题设置
    $("#save-theme-settings").on("click", function() {
        const settings = {
            theme: $("input[name='theme']:checked").val(),
            bgImageEnabled: $("#bg-image-enabled").prop("checked"),
            bgImageType: $("input[name='bg-image-type']:checked").val(),
            bgImageApi: $("#bg-image-api").val(),
            bgImageUrl: $("#bg-image-url").val()
        };
        localStorage.setItem("themeSettings", JSON.stringify(settings));
        alert("主题设置已保存");
    });
    
    // 预览主题效果
    $("#preview-theme").on("click", function() {
        alert("预览功能即将实现");
    });
    
    // 添加图片源按钮
    $("#add-image-source-btn").on("click", function() {
        $("#image-source-form-title").text("添加图片源");
        $("#image-source-name").val("");
        $("#image-source-url").val("");
        $("#image-source-desc").val("");
        $("#image-source-id").val("");
        $("#image-source-form").removeClass("hidden");
    });
    
    // 保存图片源
    $("#save-image-source-btn").on("click", function() {
        const id = $("#image-source-id").val();
        const data = {
            name: $("#image-source-name").val(),
            url: $("#image-source-url").val(),
            desc: $("#image-source-desc").val()
        };
        
        const url = id ? "/api/image-sources/" + id : "/api/image-sources";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    alert(id ? "图片源更新成功" : "图片源添加成功");
                    $("#image-source-form").addClass("hidden");
                    loadImageSources();
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新图片源失败" : "添加图片源失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 取消图片源操作
    $("#cancel-image-source-btn").on("click", function() {
        $("#image-source-form").addClass("hidden");
    });
    
    // 预览图片源
    $("#preview-image-source-btn").on("click", function() {
        const url = $("#image-source-url").val();
        if (url) {
            $("#image-preview").html(`<img src="${url}" alt="预览" class="w-full h-full object-cover">`);
            $("#image-preview-container").removeClass("hidden");
        }
    });
    
    // 添加公告按钮
    $("#add-announcement-btn").on("click", function() {
        $("#announcement-form-title").text("添加公告");
        $("#announcement-title").val("");
        $("#announcement-content").html("");
        $("#announcement-is-active").prop("checked", false);
        $("#announcement-id").val("");
        $("#announcement-form").removeClass("hidden");
    });
    
    // 保存公告
    $("#save-announcement-btn").on("click", function() {
        const id = $("#announcement-id").val();
        const data = {
            title: $("#announcement-title").val(),
            content: $("#announcement-content").html(),
            is_active: $("#announcement-is-active").prop("checked")
        };
        const url = id ? "/api/announcements/" + id : "/api/announcements";
        const method = id ? "PUT" : "POST";
        
        $.ajax({
            url: url,
            method: method,
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                if (response.success) {
                    loadAnnouncements();
                    alert(id ? "公告更新成功" : "公告添加成功");
                    $("#announcement-form").addClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = id ? "更新公告失败" : "创建公告失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 取消公告操作
    $("#cancel-announcement-btn").on("click", function() {
        $("#announcement-form").addClass("hidden");
    });
    
    // ------------------------
    // 事件委托绑定 - 编辑按钮
    // ------------------------
    
    // 编辑分类
    $(document).on("click", ".edit-category-btn", function() {
        const id = $(this).data("id");
        // 根据id获取分类详情并填充表单
        $.ajax({
            url: "/api/categories/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const category = response.data;
                    $("#category-id").val(category.category_id);
                    $("#category-name").val(category.category_name);
                    $("#category-icon").val(category.category_icon);
                    $("#category-sort").val(category.sort);
                    $("#category-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取分类详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 编辑书签
    $(document).on("click", ".edit-link-btn", function() {
        const id = $(this).data("id");
        // 根据id获取书签详情并填充表单
        $.ajax({
            url: "/api/bookmarks/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const bookmark = response.data;
                    $("#link-id").val(bookmark.bookmark_id);
                    $("#link-name").val(bookmark.bookmark_name);
                    $("#link-url").val(bookmark.bookmark_url);
                    $("#link-icon").val(bookmark.bookmark_icon);
                    $("#link-desc").val(bookmark.bookmark_description);
                    $("#select-category").val(bookmark.category_id);
                    $("#link-sort").val(bookmark.sort);
                    $("#link-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取书签详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 编辑图片源
    $(document).on("click", ".edit-image-source-btn", function() {
        const id = $(this).data("id");
        // 根据id获取图片源详情并填充表单
        $.ajax({
            url: "/api/image-sources/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const source = response.data;
                    $("#image-source-id").val(source.id);
                    $("#image-source-name").val(source.name);
                    $("#image-source-url").val(source.url);
                    $("#image-source-desc").val(source.desc);
                    $("#image-source-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取图片源详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
    
    // 编辑公告
    $(document).on("click", ".edit-announcement-btn", function() {
        const id = $(this).data("id");
        // 根据id获取公告详情并填充表单
        $.ajax({
            url: "/api/announcements/" + id,
            method: "GET",
            success: function(response) {
                if (response.success) {
                    const announcement = response.data;
                    $("#announcement-id").val(announcement.id);
                    $("#announcement-title").val(announcement.title);
                    $("#announcement-content").html(announcement.content);
                    $("#announcement-is-active").prop("checked", announcement.is_active);
                    $("#announcement-form").removeClass("hidden");
                }
            },
            error: function(xhr) {
                let errorMsg = "获取公告详情失败";
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorMsg = response.message || errorMsg;
                } catch (e) {}
                alert(errorMsg);
            }
        });
    });
}


// 初始化移动端菜单
function initAdminMobileMenu() {
    $("#admin-mobile-menu-btn").on("click", function() {
        $("#admin-sidebar").toggleClass("hidden");
    });
}


// 绑定导航菜单事件
function bindNavigationEvents() {
    $("#admin-sidebar a").on("click", function(e) {
        e.preventDefault();
        $("#admin-sidebar a").removeClass("bg-primary text-white");
        $(this).addClass("bg-primary text-white");
        
        // 隐藏所有内容区域
        $("#dashboard, #category-management, #link-management, #theme-settings, #image-sources, #announcement-management").addClass("hidden");
        
        // 显示对应的内容区域
        const target = $(this).attr("href").substring(1);
        if (target) {
            $("#" + target).removeClass("hidden");
        }
    });
}


// ------------------------
// 主题设置功能
// ------------------------

// 初始化主题设置
function initThemeSettings() {
    const savedSettings = JSON.parse(localStorage.getItem("themeSettings"));
    if (savedSettings) {
        // 恢复主题
        $(`input[name='theme'][value='${savedSettings.theme}']`).prop("checked", true);
        document.documentElement.classList.toggle("dark", savedSettings.theme === "dark");
        
        // 恢复背景图设置
        $("#bg-image-enabled").prop("checked", savedSettings.bgImageEnabled);
        if (savedSettings.bgImageEnabled) {
            $("#bg-image-api-container, #bg-image-url-container").removeClass("hidden");
        }
        
        // 恢复背景图类型
        $(`input[name='bg-image-type'][value='${savedSettings.bgImageType}']`).prop("checked", true);
        if (savedSettings.bgImageType === "random") {
            $("#bg-image-api-container").removeClass("hidden");
            $("#bg-image-url-container").addClass("hidden");
        } else {
            $("#bg-image-api-container").addClass("hidden");
            $("#bg-image-url-container").removeClass("hidden");
        }
        
        // 恢复其他设置
        $("#bg-image-api").val(savedSettings.bgImageApi);
        $("#bg-image-url").val(savedSettings.bgImageUrl);
    } else {
        // 默认设置
        $("#theme-light").prop("checked", true);
        $("#bg-image-random").prop("checked", true);
    }
    
    // 填充分图源选项
    const imageSources = [
        { id: 1, name: "Unsplash随机图", url: "https://source.unsplash.com/random/1920x1080" },
        { id: 2, name: "Pexels随机图", url: "https://images.pexels.com/photos/random" },
        { id: 3, name: "Pixabay随机图", url: "https://pixabay.com/zh/photos/random" }
    ];
    $("#bg-image-api").empty();
    imageSources.forEach(source => {
        $("#bg-image-api").append(`<option value="${source.url}">${source.name}</option>`);
    });
}


// ------------------------
// 图片源管理功能
// ------------------------

// 初始化图片源管理
function initImageSourceManagement() {
    loadImageSources();
}

// 加载图片源列表
function loadImageSources() {
    $.ajax({
        url: "/api/image-sources",
        method: "GET",
        success: function(response) {
            $("#image-source-list").empty();
            if (response.success && response.data) {
                response.data.forEach(source => {
                    const row = `<tr><td class="py-3 px-4">${source.id}</td><td class="py-3 px-4">${source.name}</td><td class="py-3 px-4 truncate">${source.url}</td><td class="py-3 px-4">${source.desc}</td><td class="py-3 px-4 text-right"><button class="edit-image-source-btn bg-primary text-white px-3 py-1 rounded-lg mr-2" data-id="${source.id}">编辑</button><button class="delete-image-source-btn bg-red-500 text-white px-3 py-1 rounded-lg" data-id="${source.id}">删除</button></td></tr>`;
                    $("#image-source-list").append(row);
                });
            } else {
                // 如果没有数据，显示空状态
                const emptyRow = `<tr><td colspan="5" class="py-4 text-center text-gray-500">暂无图片源数据</td></tr>`;
                $("#image-source-list").append(emptyRow);
            }
            bindImageSourceActions();
        },
        error: function(xhr) {
            let errorMsg = "加载图片源失败";
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) {}
            alert(errorMsg);
            
            // 显示错误状态
            const errorRow = `<tr><td colspan="5" class="py-4 text-center text-red-500">加载图片源失败：${errorMsg}</td></tr>`;
            $("#image-source-list").empty().append(errorRow);
        }
    });
}

// 绑定图片源操作事件
function bindImageSourceActions() {
    // 移除事件委托绑定，移到initEventListeners()中
}


// ------------------------
// 公告管理功能
// ------------------------

// 初始化公告管理
function initAnnouncementManagement() {
    loadAnnouncements();
}

// 加载公告列表
function loadAnnouncements() {
    $.ajax({
        url: "/api/announcements",
        method: "GET",
        success: function(response) {
            $("#announcement-list").empty();
            response.forEach(announcement => {
                const status = announcement.is_active ? "启用" : "禁用";
                const statusClass = announcement.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
                const row = `<tr><td class="py-3 px-4">${announcement.id}</td><td class="py-3 px-4">${announcement.title}</td><td class="py-3 px-4"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${status}</span></td><td class="py-3 px-4">${announcement.created_at}</td><td class="py-3 px-4">${announcement.updated_at}</td><td class="py-3 px-4 text-right"><button class="edit-announcement-btn bg-primary text-white px-3 py-1 rounded-lg mr-2" data-id="${announcement.id}">编辑</button><button class="delete-announcement-btn bg-red-500 text-white px-3 py-1 rounded-lg" data-id="${announcement.id}">删除</button></td></tr>`;
                $("#announcement-list").append(row);
            });
            bindAnnouncementActions();
        },
        error: function(xhr) {
            let errorMsg = "加载公告失败";
            try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || errorMsg;
            } catch (e) {}
            alert(errorMsg);
        }
    });
}

// 绑定公告操作事件
function bindAnnouncementActions() {
    // 移除事件委托绑定，移到initEventListeners()中
}