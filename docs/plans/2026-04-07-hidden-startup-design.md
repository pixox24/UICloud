# Windows 静默后台启动设计

日期：2026-04-07

## 目标

- Windows 登录后自动启动项目
- 不弹出命令行窗口
- 不长期占用任务栏位置
- 保留可见的 `start.bat` 作为排错入口

## 方案

- 保留 `pm2-autostart.bat` 作为实际启动脚本
- 新增 `pm2-autostart.vbs`，使用 `WScript.Shell.Run(..., 0, False)` 隐藏运行批处理
- 计划任务不再直接指向 `.bat`
- 改为：
  - `wscript.exe`
  - 加载 `pm2-autostart.vbs`

## 手动静默启动

- 新增 `start-hidden.vbs`
- 适合手动双击后台拉起服务

## 取舍

- `start.bat` 依然保留前台输出，便于排查安装、构建、数据库初始化问题
- 隐藏版只适合稳定运行，不适合首轮排错
