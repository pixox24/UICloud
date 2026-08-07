# 5 分钟巡检自动恢复方案

## 目标

在保留现有 `Windows 任务计划程序 + VBS 隐藏启动` 的前提下，为 `http://localhost:8000` 增加轻量级自动恢复能力，避免服务异常退出后必须人工重启。

## 方案

采用“两层职责分离”：

1. 启动层
   Windows 登录后，通过 `start-next-hidden.vbs` 延迟约 10 秒静默拉起 Next.js 服务。
2. 保活层
   Windows 计划任务每 5 分钟执行一次 `watchdog-hidden.vbs`，由 `watchdog.ps1` 检查本机 `http://localhost:8000`。

## 恢复逻辑

- 如果健康检查返回 `200`，立即退出，不做任何操作。
- 如果健康检查失败：
  - 查找当前机器上与 `next start --port 8000` 匹配的 `node.exe` 进程
  - 尝试结束这些旧进程
  - 调用 `start-next-now.vbs` 立即隐藏重启服务
- 为避免并发重复执行，看门狗使用全局互斥锁限制同一时间只运行一个实例。

## 设计理由

- 不把 PM2 放回开机关键链路，减少 Windows 自启动不稳定因素。
- 启动和保活解耦，问题更容易定位。
- 5 分钟巡检的资源占用极低，对本机影响可忽略，但足以覆盖日常异常退出场景。
- 保持全程无黑色命令行窗口，不影响桌面使用。

## 运维说明

- 开机自启动任务名：`UI Library Auto Start`
- 巡检恢复任务名：`UI Library Watchdog`
- 巡检日志：`logs/watchdog.log`
