# 静态导航网站部署文档

## 1. 项目简介

这是一个基于 Node.js 的静态导航网站，包含前端页面和后台管理功能。

**主要功能：**
- 首页导航搜索
- 后台管理系统
- 分类管理
- 链接管理
- 搜索引擎管理
- 公告管理

## 2. 环境准备

### 2.1 安装 Node.js

**Windows 系统：**
1. 访问 Node.js 官方网站：https://nodejs.org/
2. 下载最新的 LTS（长期支持）版本
3. 双击安装包，按照提示完成安装
4. 安装完成后，打开命令提示符（CMD）或 PowerShell，输入 `node -v` 和 `npm -v` 检查是否安装成功

**Linux 系统：**
```bash
# Ubuntu/Debian 系统
sudo apt update
sudo apt install nodejs npm

# CentOS/RHEL 系统
sudo yum install nodejs npm
```

**MacOS 系统：**
```bash
# 使用 Homebrew 安装
brew install node
```

### 2.2 安装 Git（可选）

如果需要从 GitHub 克隆项目，可以安装 Git：

**Windows 系统：**
1. 访问 Git 官方网站：https://git-scm.com/
2. 下载安装包并安装

**Linux 系统：**
```bash
# Ubuntu/Debian 系统
sudo apt install git

# CentOS/RHEL 系统
sudo yum install git
```

## 3. 项目获取

### 3.1 克隆项目（推荐）

打开命令行工具，执行以下命令：

```bash
git clone https://github.com/xy-bin/navxybintop.git
cd navxybintop
```

### 3.2 直接下载

1. 访问项目 GitHub 地址：https://github.com/xy-bin/navxybintop.git
2. 点击 "Code" 按钮，选择 "Download ZIP"
3. 解压下载的 ZIP 文件
4. 进入解压后的目录

## 4. 安装依赖

在项目根目录下执行以下命令：

```bash
npm install
```

这个命令会安装项目所需的所有依赖包，包括 Express、SQLite、jQuery 等。

## 5. 项目配置

### 5.1 端口配置（可选）

默认情况下，项目会使用 3000 端口。如果需要修改端口，可以编辑 `server.js` 文件：

```javascript
// 找到以下代码并修改端口号
const port = process.env.PORT || 3000; // 修改 3000 为你想要的端口号
```

### 5.2 管理员账户

首次运行时，系统会自动创建一个默认管理员账户：
- 用户名：`xybin`
- 密码：`zxcvbnm...`

建议登录后及时修改密码。

## 6. 启动项目

### 6.1 开发模式

开发模式下，代码修改后会自动重启服务器：

```bash
npm run dev
```

### 6.2 生产模式

生产模式下，服务器会稳定运行：

```bash
npm start
```

### 6.3 后台运行（Linux/MacOS）

如果需要在后台运行项目，可以使用 `nohup` 命令：

```bash
nohup npm start > server.log 2>&1 &
```

## 7. 访问项目

项目启动成功后，可以通过以下地址访问：

- **前端首页：** http://localhost:3000
- **后台管理：** http://localhost:3000/admin.html

## 8. 常用操作

### 8.1 停止项目

**Windows 系统：**
在命令行中按 `Ctrl + C` 停止服务器。

**Linux/MacOS 系统：**
1. 查看进程 ID：`ps aux | grep node`
2. 停止进程：`kill <进程ID>`

### 8.2 重启项目

**开发模式：**
修改代码后自动重启。

**生产模式：**
```bash
# 先停止项目（参考 8.1）
# 再重新启动
npm start
```

## 9. 数据库管理

### 9.1 数据库文件

项目使用 SQLite 数据库，数据库文件位于：`data/navxybintop.db`

### 9.2 备份数据库

定期备份数据库文件可以防止数据丢失：

```bash
# Windows 系统
copy data\navxybintop.db data\navxybintop_backup_$(date +%Y%m%d).db

# Linux/MacOS 系统
cp data/navxybintop.db data/navxybintop_backup_$(date +%Y%m%d).db
```

### 9.3 恢复数据库

如果需要恢复数据库，可以将备份文件复制回原位置：

```bash
# Windows 系统
copy data\navxybintop_backup_20231201.db data\navxybintop.db

# Linux/MacOS 系统
cp data/navxybintop_backup_20231201.db data/navxybintop.db
```

## 10. 常见问题

### 10.1 端口被占用

**错误信息：** `Error: listen EADDRINUSE :::3000`

**解决方法：**
1. 关闭占用端口的程序
2. 或修改项目端口（参考 5.1 节）

### 10.2 依赖安装失败

**错误信息：** `npm ERR! ...`

**解决方法：**
1. 检查网络连接
2. 清除 npm 缓存：`npm cache clean --force`
3. 重新安装依赖：`npm install`

### 10.3 无法访问管理页面

**错误信息：** 显示 "请先登录"

**解决方法：**
1. 确保已登录管理员账户
2. 检查登录信息是否正确
3. 清除浏览器缓存后重试

## 11. 升级项目

如果需要更新项目代码：

```bash
# 拉取最新代码
git pull

# 重新安装依赖（如果有新的依赖）
npm install

# 重启项目
npm start
```

## 12. 安全建议

1. 定期备份数据库
2. 及时修改默认管理员密码
3. 不要在代码中存储敏感信息
4. 定期更新依赖包：`npm update`
5. 生产环境中使用 HTTPS 协议

## 13. 技术支持

如果遇到问题，可以：
1. 查看项目文档
2. 检查服务器日志
3. 访问 GitHub 项目页面提交 Issue

---

**文档版本：** 1.0
**更新日期：** 2026-01-17