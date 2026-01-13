// 主题管理器 - 负责主题切换和背景图管理
class ThemeManager {
    constructor() {
        this.themeToggleBtn = $('#theme-toggle-btn');
        this.body = $('body');
        this.bgImageContainer = $('#bg-image-container');
        this.init();
    }

    init() {
        // 创建背景图容器（必须先执行）
        this.createBgImageContainer();
        // 初始化主题设置
        this.loadThemeSettings();
        // 绑定主题切换事件
        this.bindEvents();
    }

    // 创建背景图容器
    createBgImageContainer() {
        if (!this.bgImageContainer.length) {
            this.bgImageContainer = $('<div id="bg-image-container"></div>');
            this.bgImageContainer.css({
                'position': 'fixed',
                'top': 0,
                'left': 0,
                'width': '100%',
                'height': '100%',
                'z-index': -1,
                'background-size': 'cover',
                'background-position': 'center',
                'opacity': 0.3,
                'transition': 'opacity 0.5s ease'
            });
            this.body.prepend(this.bgImageContainer);
        }
    }

    // 加载主题设置
    loadThemeSettings() {
        const themeSettings = this.getThemeSettings();
        
        // 应用主题
        if (themeSettings.theme === 'dark' || (!themeSettings.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.enableDarkMode();
        } else {
            this.enableLightMode();
        }

        // 应用背景图
        this.applyBackgroundImage(themeSettings);
    }

    // 绑定事件
    bindEvents() {
        // 主题切换按钮点击事件
        this.themeToggleBtn.on('click', () => {
            if (this.body.hasClass('dark')) {
                this.enableLightMode();
            } else {
                this.enableDarkMode();
            }
        });
    }

    // 启用夜间模式
    enableDarkMode() {
        this.body.addClass('dark');
        this.themeToggleBtn.find('i').removeClass('fa-moon-o').addClass('fa-sun-o');
        
        // 保存主题设置
        this.saveThemeSetting('theme', 'dark');
        console.log('切换到夜间模式');
    }

    // 启用白天模式
    enableLightMode() {
        this.body.removeClass('dark');
        this.themeToggleBtn.find('i').removeClass('fa-sun-o').addClass('fa-moon-o');
        
        // 保存主题设置
        this.saveThemeSetting('theme', 'light');
        console.log('切换到白天模式');
    }

    // 应用背景图
    applyBackgroundImage(settings) {
        if (!settings.bgImageEnabled) {
            this.bgImageContainer.hide();
            return;
        }

        this.bgImageContainer.show();

        if (settings.bgImageType === 'random') {
            // 使用随机图API
            this.loadRandomBackgroundImage(settings.bgImageApi);
        } else if (settings.bgImageType === 'custom' && settings.bgImageUrl) {
            // 使用自定义背景图
            this.bgImageContainer.css('background-image', `url(${settings.bgImageUrl})`);
        }
    }

    // 加载随机背景图
    loadRandomBackgroundImage(apiUrl) {
        if (!apiUrl) {
            // 默认使用unsplash随机图
            apiUrl = 'https://source.unsplash.com/random/1920x1080?nature,landscape';
        }

        // 创建图片对象预加载
        const img = new Image();
        img.onload = () => {
            this.bgImageContainer.css('background-image', `url(${img.src})`);
        };
        img.onerror = () => {
            console.error('背景图加载失败');
            this.bgImageContainer.hide();
        };
        img.src = apiUrl;
    }

    // 获取主题设置
    getThemeSettings() {
        const defaultSettings = {
            theme: 'light',
            bgImageEnabled: true,
            bgImageType: 'random',
            bgImageUrl: '',
            bgImageApi: 'https://source.unsplash.com/random/1920x1080?nature,landscape'
        };

        try {
            const savedSettings = JSON.parse(localStorage.getItem('themeSettings'));
            return { ...defaultSettings, ...savedSettings };
        } catch (error) {
            console.error('主题设置读取失败:', error);
            return defaultSettings;
        }
    }

    // 保存主题设置
    saveThemeSetting(key, value) {
        const settings = this.getThemeSettings();
        settings[key] = value;
        localStorage.setItem('themeSettings', JSON.stringify(settings));
    }

    // 保存所有主题设置
    saveAllSettings(settings) {
        localStorage.setItem('themeSettings', JSON.stringify(settings));
        // 重新应用设置
        this.loadThemeSettings();
    }

    // 更新背景图
    updateBackgroundImage() {
        const settings = this.getThemeSettings();
        this.applyBackgroundImage(settings);
    }
}

// 导出主题管理器
window.ThemeManager = ThemeManager;