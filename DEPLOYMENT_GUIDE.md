# 🚀 留言功能部署指南

本指南将帮助你部署留言功能到 Cloudflare Pages + Workers + D1 数据库。

## 📋 前提条件

1. ✅ Cloudflare 账户
2. ✅ Node.js 已安装（下载：https://nodejs.org/）
3. ✅ Git 已安装（用于推送代码到 GitHub）

---

## 第一步：安装 Wrangler CLI

Wrangler 是 Cloudflare Workers 的命令行工具。

```powershell
npm install -g wrangler
```

验证安装：
```powershell
wrangler --version
```

## 第二步：登录 Cloudflare

```powershell
wrangler login
```

这会打开浏览器，请登录你的 Cloudflare 账户并授权。

---

## 第三步：创建 D1 数据库

在项目目录运行：

```powershell
cd d:\Video-Tool\Pick-video
wrangler d1 create pick-video-comments
```

**重要**：执行后，Wrangler 会返回数据库 ID，类似于：
```
✅ Successfully created DB 'pick-video-comments'

[[d1_databases]]
binding = "DB"
database_name = "pick-video-comments"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

复制这个 `database_id`，然后打开 `wrangler.toml`，将 `YOUR_DATABASE_ID_HERE` 替换为你的实际 database_id。

---

## 第四步：初始化数据库表

运行 schema.sql 创建数据库表：

```powershell
wrangler d1 execute pick-video-comments --file=schema.sql
```

应该看到：
```
✅ Executed 2 commands
```

---

## 第五步：部署 Worker

```powershell
wrangler deploy
```

成功后，你会看到 Worker 的 URL，类似于：
```
✅ Published pick-video-api (X.XX sec)
   https://pick-video-api.your-subdomain.workers.dev
```

**复制这个 URL！**

---

## 第六步：更新前端代码

打开 `app.js`，找到第 6 行：

```javascript
const COMMENT_API_URL = 'YOUR_WORKER_URL_HERE/api/comments';
```

替换为：
```javascript
const COMMENT_API_URL = 'https://pick-video-api.your-subdomain.workers.dev/api/comments';
```

（用你在第五步得到的 Worker URL）

---

## 第七步：推送代码到 GitHub

```powershell
git add .
git commit -m "添加留言功能"
git push origin main
```

Cloudflare Pages 会自动检测到更新并重新部署！

---

## 第八步：配置路由（可选）

如果你想让 API 和网站使用同一个域名，需要在 Cloudflare Dashboard 配置：

1. 进入 Cloudflare Dashboard → Workers & Pages
2. 选择你刚部署的 Worker（pick-video-api）
3. 点击 "设置" → "触发器" → "添加路由"
4. 输入路由模式：`your-site.pages.dev/api/*`
5. 选择区域：your-site.pages.dev

这样你就可以用：
```javascript
const COMMENT_API_URL = '/api/comments';  // 相对路径
```

---

## ✅ 测试

1. 访问你的网站
2. 滚动到页面底部的留言板
3. 填写昵称和留言内容
4. 点击"发送留言"
5. 刷新页面，应该能看到刚才的留言

---

## 🔧 常见问题

### Worker 部署失败？
检查 `wrangler.toml` 中的 `database_id` 是否正确。

### 提交留言没反应？
1. 打开浏览器开发者工具（F12）查看控制台错误
2. 检查 `app.js` 中的 `COMMENT_API_URL` 是否正确
3. 确认 Worker 已成功部署

### CORS 错误？
Worker 代码已经包含了 CORS 头，如果还有问题，检查 Worker URL 是否正确。

---

## 📊 查看数据库内容

```powershell
wrangler d1 execute pick-video-comments --command="SELECT * FROM comments ORDER BY created_at DESC LIMIT 10"
```

## 🗑️ 删除测试数据（如需要）

```powershell
wrangler d1 execute pick-video-comments --command="DELETE FROM comments WHERE id > 0"
```

---

## 🎉 完成！

你的留言系统现在已经完全运行了！用户可以在你的网站上留言，所有数据都存储在 Cloudflare D1 数据库中。
