# 端口切换与开机自启动设计

日期：2026-04-07

## 目标

- 将项目统一切换到 `8000` 端口。
- 本机访问地址改为 `http://localhost:8000`。
- 局域网访问地址改为 `http://内网IP:8000`。
- Windows 登录后自动启动项目。

## 方案

- 将 `package.json` 中的 `dev`、`dev:lan`、`start`、`start:lan` 全部切换到 `8000`。
- 更新 `start.bat`、`ecosystem.config.js`、`README.md` 中的端口说明。
- 保留 PM2 作为常驻进程管理器。
- 不再依赖 `pm2-windows-startup`，改用 Windows 任务计划程序。

## 自启动实现

- 新增 `pm2-autostart.bat`
  - 设置项目级 `PM2_HOME`
  - 执行 `pm2 startOrRestart ecosystem.config.js --update-env`
  - 执行 `pm2 save`
- `setup-startup.bat`
  - 先调用 `pm2-autostart.bat`
  - 再创建一个 `ONLOGON` 计划任务
  - Windows 登录后自动运行 `pm2-autostart.bat`

## 取舍

- `ONLOGON` 比 `ONSTART` 更适合当前 Windows 桌面使用场景。
- 优点是实现简单、稳定、容易排查。
- 代价是必须在 Windows 登录后才会自动启动项目。
