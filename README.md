# UI 设计资产库

基于 Next.js 14 和 SQLite 的局域网设计资产库，支持上传、分类、搜索、下载和后台管理。

## 首次安装

1. 安装 [Node.js 20+](https://nodejs.org/)。
2. 可选安装 PM2：`npm install -g pm2 pm2-windows-startup`。
3. 双击运行 `start.bat` 完成依赖安装、数据库初始化、目录创建、构建和启动。
4. 团队成员在浏览器访问 `http://你的内网IP:3000`。
5. 需要后台常驻和开机自启时，以管理员身份运行 `setup-startup.bat`。

首次初始化会自动创建默认账号：

- 管理员：`admin / admin123`
- 普通用户：`demo / demo123`

## 内网访问

`start.bat` 启动时会自动显示当前电脑的内网 IP。

如果你想手动查看，也可以在 Windows 命令行执行：

```powershell
ipconfig
```

通常查看当前正在使用网卡下的 IPv4 地址，例如 `192.168.1.25`。

团队成员访问地址示例：

```text
http://192.168.1.25:3000
```

如果其他电脑无法访问，请检查：

- 两台电脑是否在同一个局域网。
- Windows 防火墙是否放行 `3000` 端口。
- 当前电脑是否已经成功启动应用。

## 常用命令

```powershell
npm install
npm run db:init
npm run build
npm run start:lan
```

开发模式局域网启动：

```powershell
npm run dev:lan
```

## PM2 后台运行

启动应用：

```powershell
pm2 start ecosystem.config.js
```

查看状态：

```powershell
pm2 list
pm2 logs ui-library
```

保存当前进程列表：

```powershell
pm2 save
```

配置 Windows 开机自启：

```powershell
setup-startup.bat
```

说明：Windows 下通常通过 `pm2-windows-startup` 为 PM2 注册启动项，然后配合 `pm2 save` 恢复应用进程。

## 添加新用户

新增普通用户：

```powershell
npm run user:add -- alice 123456 user
```

新增管理员：

```powershell
npm run user:add -- bob 123456 admin
```

参数格式：

```text
npm run user:add -- 用户名 密码 角色
```

角色只能是 `admin` 或 `user`，省略时默认是 `user`。

## 数据与备份

数据库文件位于：

- `data/assets.db`
- `data/assets.db-wal`
- `data/assets.db-shm`

上传文件位于：

- `uploads/assets/`
- `uploads/thumbnails/original/`
- `uploads/thumbnails/large/`
- `uploads/thumbnails/medium/`
- `uploads/thumbnails/small/`

执行每周备份脚本：

```powershell
backup.bat
```

备份文件会生成到桌面目录：

```text
%USERPROFILE%\Desktop\UILibrary_Backup\
```

文件名格式示例：

```text
backup-2026-03-23.zip
```

建议至少每周执行一次备份，并在升级或迁移前先备份一次。
