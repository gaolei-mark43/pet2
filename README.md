# PET2 — 可交互的 DevOps UI/UX Mock

PET2 是一个独立的 React + Mock API 演示项目：依据已获授权的可观察界面与操作资料，复现典型 DevOps 工作流中的可操作界面状态。它不包含 PET 的源代码、接口实现、登录信息、会话数据或真实业务数据，也不会连接原系统。

当前重点覆盖：项目入口、流水线配置/运行、插件创建与编排、用户与角色权限，以及与这些功能相关的本地 Mock 状态转换。

## 本地启动

环境要求：Node.js 20 或更高版本。

```powershell
git clone https://github.com/gaolei-mark43/pet2.git
cd pet2
npm install
npm run dev
```

浏览器访问：

- 项目首页：`http://127.0.0.1:4173/#projects`
- 流水线：`http://127.0.0.1:4173/#pipelines`
- 插件管理：`http://127.0.0.1:4173/#plugins`
- 用户与角色：`http://127.0.0.1:4173/#users`

## 构建

```powershell
npm run build
npm run preview
```

## 测试

```powershell
node --test tests/*.test.mjs
```

## 数据

- Mock 数据保存在浏览器 `localStorage` 的 `pet-full-replica-v2`。
- 流水线图形配置在共享 Mock 数据中持久化；构建会冻结阶段、步骤和参数快照。
- 凭证密码、SSH 私钥和登录密码不会写入持久化数据。
- 外部 Jenkins、GitLab、SSH、制品服务及真实构建产物均以可操作 Mock 行为代替。

## REA 复核资料

公开版的证据边界、复核流程和验收项见 [`docs/rea/`](docs/rea/README.md)。其中明确区分了“已观察”“操作资料佐证”和“待复核”项；只有通过 REA 的实际页面采证后，页面才会被标记为已观察。
