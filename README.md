# UI 设计资产库

基于 Next.js 14 和 SQLite 的局域网设计资产库，支持上传、分类、搜索、下载和后台管理。

## 首次安装

1. 安装 [Node.js 20+](https://nodejs.org/)。
2. 双击运行 `start.bat`，自动安装依赖、初始化数据库、创建目录并启动项目。
3. 浏览器打开 `http://localhost:9000`，确认本机可访问。
4. 需要开机自动运行、静默后台启动和自动配置防火墙时，以管理员身份运行 `setup-startup.bat`。
5. 如需手动静默启动，双击 `start-hidden.vbs`。

首次初始化会自动创建默认账号：

- 管理员：`admin / admin123`
- 普通用户：`demo / demo123`

## 局域网访问

`start.bat` 启动时会自动显示当前电脑的内网 IP。

如果要手动查看，在 Windows 命令行执行：

```powershell
ipconfig
```

找到当前正在使用网卡下的 `IPv4 地址`，例如 `192.168.1.25`。

团队成员在浏览器输入：

```text
http://192.168.1.25:9000
```

如果其他电脑无法访问，请检查：

- 两台电脑是否在同一局域网
- Windows 防火墙是否放行 `9000` 端口
- 当前电脑是否已经启动项目

## 常用命令

```powershell
npm install
npm run db:init
npm run build
npm run start
npm run start:lan
```

开发模式局域网启动：

```powershell
npm run dev:lan
```

## 静默后台启动

当前推荐方案是 `Windows 任务计划程序 + VBS 隐藏启动`。

- `start-next-hidden.vbs`
  直接隐藏启动 `node + next start --hostname 0.0.0.0 --port 9000`
- `start-next-now.vbs`
  立即隐藏启动 `node + next start --hostname 0.0.0.0 --port 9000`，供看门狗自动恢复使用
- `start-hidden.vbs`
  手动静默后台启动入口，双击即可后台拉起服务
- `watchdog.ps1`
  每次巡检时检查 `http://localhost:9000`，异常时自动恢复
- `watchdog-launcher.js`
  通过 `wscript.exe` 隐藏调用 `watchdog.ps1`，避免计划任务直接拉起 PowerShell 窗口
- `setup-firewall.bat`
  负责添加 `9000` 端口的 Windows 防火墙入站规则
- `setup-startup.bat`
  负责创建 Windows 登录后自动执行的隐藏计划任务、5 分钟巡检任务，并调用防火墙配置

执行一次：

```powershell
setup-startup.bat
```

说明：

- 需要用管理员身份运行一次
- 配置完成后，Windows 登录约 180 秒后会静默后台启动项目
- 如果服务中途异常退出，看门狗会每 5 分钟巡检一次并自动尝试恢复
- 不会再弹出黑色命令行窗口占用任务栏
- 会自动添加局域网访问 `9000` 端口的防火墙规则
- 默认访问地址是 `http://localhost:9000`

看门狗日志位置：

```text
logs\watchdog.log
```

如果你想手动静默启动：

```text
双击 start-hidden.vbs
```

## PM2

项目仍保留 `ecosystem.config.js` 和 `pm2-autostart.bat`，便于手动维护或调试，但开机自动启动不再依赖 PM2。

如需手动查看 PM2 状态：

```powershell
pm2 list
pm2 logs ui-library
```

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

角色只能是 `admin` 或 `user`，省略时默认为 `user`。

## 数据与备份

数据库文件位置：

- `data/assets.db`
- `data/assets.db-wal`
- `data/assets.db-shm`

上传文件位置：

- `uploads/assets/`
- `uploads/thumbnails/original/`
- `uploads/thumbnails/large/`
- `uploads/thumbnails/medium/`
- `uploads/thumbnails/small/`

执行备份脚本：

```powershell
backup.bat
```

备份文件会生成到桌面目录：

```text
%USERPROFILE%\Desktop\UILibrary_Backup\
```

文件名示例：

```text
backup-2026-03-23.zip
```
