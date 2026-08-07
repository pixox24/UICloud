# Windows 直接隐藏启动 Next.js 设计

日期：2026-04-08

## 背景

- 原方案使用 `PM2 + VBS` 作为登录后静默启动链路。
- 在当前 Windows 环境下，PM2 这条启动链路存在不稳定情况：
  - 黑色命令行窗口偶发保留
  - 登录后任务执行成功，但 `8000` 端口未稳定拉起

## 调整目标

- 登录后静默启动
- 不显示黑色命令行窗口
- 启动链路尽量短，减少 Windows 兼容问题

## 新方案

- `start-next-hidden.vbs`
  - 直接执行 `node.exe`
  - 直接调用 `node_modules/next/dist/bin/next`
  - 参数固定为 `start --hostname 0.0.0.0 --port 8000`
  - 通过 `WScript.Shell.Run(..., 0, False)` 隐藏窗口
- `start-hidden.vbs`
  - 手动双击入口
- `setup-startup.bat`
  - Windows 登录计划任务改为调用 `start-next-hidden.vbs`

## 取舍

- 优点：更稳、更简单、避免 PM2 在 Windows 登录场景下的额外问题
- 代价：登录自动启动不再依赖 PM2 守护
- PM2 仍保留给手动调试或运维使用
