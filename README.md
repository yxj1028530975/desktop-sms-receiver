# 桌面短信接收器

这个项目用于接收 iPhone 快捷指令上报的短信内容，写入独立后端服务，并按手机号路由实时推送到桌面客户端。

## 项目结构

- `apps/backend`
  FastAPI + SQLite + WebSocket 后端
- `apps/desktop`
  Electron + React + TypeScript 桌面客户端

## 工作流

1. 管理员登录 `/admin`
2. 创建桌面客户端令牌
3. 将一个或多个手机号绑定到目标客户端
4. 桌面端使用 `后端地址 + 客户端令牌` 建立连接
5. 只有命中路由规则的短信会被推送到对应客户端

## 本地启动后端

```powershell
Set-Location D:\项目\项目文件\桌面通讯\apps\backend
Copy-Item .env.example .env
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

默认本地地址：

- `http://127.0.0.1:8000`

默认后台账号：

- 用户名：`admin`
- 密码：`admin123`

## Docker 部署后端

先准备环境变量：

```powershell
Set-Location D:\项目\项目文件\桌面通讯\apps\backend
Copy-Item .env.docker.example .env
```

然后按需修改 `.env`，至少建议改掉这几个默认值：

- `INBOUND_API_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

启动容器：

```powershell
docker compose up -d --build
```

查看状态：

```powershell
docker compose ps
docker compose logs -f
```

部署完成后：

- 后端地址：`http://你的服务器IP:8000`
- 后台地址：`http://你的服务器IP:8000/admin`

### Docker 文件

- Docker 镜像定义：[Dockerfile](D:/项目/项目文件/桌面通讯/apps/backend/Dockerfile)
- Compose 配置：[docker-compose.yml](D:/项目/项目文件/桌面通讯/apps/backend/docker-compose.yml)
- 生产环境变量示例：[.env.docker.example](D:/项目/项目文件/桌面通讯/apps/backend/.env.docker.example)

### 持久化

Compose 默认会把下面两个目录挂载到宿主机：

- [apps/backend/data](D:/项目/项目文件/桌面通讯/apps/backend/data)
- [apps/backend/logs](D:/项目/项目文件/桌面通讯/apps/backend/logs)

其中：

- `data` 保存 SQLite 数据库
- `logs` 保存请求日志和错误日志

### 部署注意

- 当前 WebSocket 在线客户端状态保存在进程内存里，所以后端必须以单实例运行，不要开多个副本。
- 如果你前面还有 Nginx、Caddy 或 FRP，记得放行 WebSocket 升级。
- Docker 容器内部固定监听 `8000`，对外端口可以自行映射。

## 本地启动桌面端

```powershell
Set-Location D:\项目\项目文件\桌面通讯\apps\desktop
npm.cmd install
npm.cmd run build
npm.cmd run start
```

桌面端需要填写：

- 后端地址：`http://127.0.0.1:8000`
- 客户端令牌：从后台创建客户端后复制

## 后台管理台

打开：

- `http://127.0.0.1:8000/admin`

用于：

- 创建桌面客户端
- 复制或重置客户端令牌
- 启用或停用客户端
- 绑定手机号到客户端
- 查看请求日志与错误详情

## 短信上报接口

`POST /api/sms/inbound`

请求头：

- `X-API-Key: your-inbound-api-key`

请求体示例：

```json
{
  "sender": "106926662034679",
  "content": "【联调测试】您的验证码是 123456，5 分钟内有效。",
  "dev": "iphone-shortcut",
  "receiver": "+8618120691526"
}
```

## 桌面端接口

历史消息：

```http
GET /api/messages?limit=50
X-Desktop-Token: your-client-token
```

消息确认：

```http
POST /api/messages/{id}/ack
X-Desktop-Token: your-client-token
```

实时连接：

```text
ws://127.0.0.1:8000/api/ws/desktop?token=your-client-token
```

## 冒烟测试

在仓库根目录运行：

```powershell
npm run smoke:sms
npm run smoke:targeted
npm run smoke:desktop
```

这三条测试会验证：

- 后台创建客户端令牌
- 手机号路由
- 短信入站存储
- WebSocket 推送
- 历史查询
- 已读确认
- 桌面通知与剪贴板流程
