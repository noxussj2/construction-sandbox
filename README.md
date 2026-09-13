# 小小建造场 · Construction Sandbox

**本项目使用 GPT-6 Astra 辅助开发完成。**

一座放在深色实木工作桌上的交互式微缩建筑工地。项目通过 Three.js 在浏览器中实时绘制体素风格场景，让工人、车辆和施工机械持续运转，并提供昼夜、天气、扬尘和视角控制。

当前首页是持续运行的工地沙盘，适合场景展示、交互体验和程序化三维建模实验。场景逻辑在浏览器端执行，无需配置 API 密钥、登录服务或业务数据库；刷新页面会恢复初始状态。

## 功能介绍

- **微缩施工现场**：七个施工分区，包含基坑、建筑框架、材料和配套设施，以及执行绑扎、搬运、指挥等动作的工人。
- **机械协作动画**：两台挖掘机、两台塔吊、两台渣土车、一台搅拌车及一台装载机。运输车辆沿单向车道行驶，并循环执行装卸停靠。
- **交互视角**：拖拽环视、滚轮缩放；闲置约 7 秒后自动环绕，也可以关闭自动环绕或恢复默认视角。
- **运行控制**：暂停／启动设备，切换 0.5×、1×、2× 运行速度。
- **昼夜变化**：约 180 秒完成一轮昼夜循环，支持固定时段以及黎明、正午、黄昏、夜晚切换；夜晚会亮起工地灯光与板房窗户。
- **天气与扬尘**：切换暴雨，配合雨滴、路面材质和照明变化；扬尘提供关闭、轻微、浓厚三档。
- **状态展示**：显示当前时段、设备倍率和实时 FPS。
- **程序化生成**：场景几何体、木纹、蓝图、文字标牌与粒子效果均由代码生成，无需下载模型素材。

渲染使用 `InstancedMesh` 合并静态物体、Shader 驱动粒子，并将设备像素比限制为 1.6。页面隐藏时停止场景更新，卸载时释放 GPU 资源。实际帧率取决于设备、浏览器和窗口分辨率。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| React 19、TypeScript / JavaScript | 页面交互与场景逻辑 |
| Next.js 16 App Router 结构、Vinext、Vite 8 | 页面容器、开发服务器和构建 |
| Three.js | 三维场景、相机、灯光与动画 |
| Tailwind CSS 4、Lucide React | 样式与界面图标 |
| Cloudflare Vite Plugin、Wrangler | Workers 构建与本地运行环境 |

当前首页从 jsDelivr 动态加载 **Three.js 0.160.0（r160）**，具体地址见 `lib/construction/diorama.js`。它与 `package.json` 中供其他模块使用的 `three` 依赖版本不同；修改依赖版本不会自动改变首页的 CDN 版本。

## 环境要求

| 工具 | 版本要求 |
| --- | --- |
| Node.js | **>= 22.13.0**，由 `package.json` 的 `engines.node` 声明 |
| pnpm | **11.19.0**，由 `package.json` 的 `packageManager` 固定 |
| 浏览器 | 支持 WebGL、ES Modules，且已启用图形加速的现代浏览器 |

如需运行仓库中直接导入 TypeScript 的旧版离线脚本，可使用 **Node.js 24**。依赖安装需要访问包仓库；打开首页还需要能够访问 `cdn.jsdelivr.net`，当前不是完全离线应用。

## 安装与启动

### 1. 准备 Node.js

先安装满足要求的 Node.js。如果使用 nvm，可执行：

```sh
nvm install 24
nvm use 24
node --version
```

已有 Node.js 的情况下，确认版本至少为 `22.13.0`；`22.0.0` 不满足要求。

### 2. 安装指定版本的 pnpm

```sh
npm install --global pnpm@11.19.0
pnpm --version
```

版本输出应为 `11.19.0`。如果终端仍调用旧版 pnpm 或 Corepack 代理，请检查当前 Node.js 环境和 PATH，确保使用正确的包管理器版本。

### 3. 安装项目依赖

在项目根目录（包含 `package.json` 的目录）执行：

```sh
pnpm install --frozen-lockfile
```

项目使用 `pnpm-lock.yaml` 固定依赖，并在 `pnpm-workspace.yaml` 中配置安装策略。日常安装请使用 pnpm 并保留锁文件。

### 4. 启动开发服务

```sh
pnpm dev
```

普通本地环境默认使用 **5173** 端口，打开 [本地开发页面](http://localhost:5173)。若端口或执行环境不同，以终端实际输出的地址为准。

当前首页无需创建 `.env` 文件，也无需初始化数据库。仓库中的 D1、R2 和 Drizzle 文件是预留基础设施，当前配置未启用 D1、R2。

## 操作说明

| 操作 | 效果 |
| --- | --- |
| 在场景上拖拽 | 调整观察方位与俯仰角 |
| 鼠标滚轮 | 拉近或拉远视角 |
| 暂停／播放按钮 | 暂停设备动画，或以 1× 恢复运行 |
| 0.5× / 1× / 2× 按钮 | 设置设备运行倍率 |
| 昼夜循环按钮 | 切换自动昼夜与固定时段 |
| 点击右侧时段文字 | 切换时段，同时关闭自动昼夜循环 |
| 施工扬尘按钮 | 循环切换三档扬尘 |
| 天气按钮或空格键 | 切换暴雨；焦点在按钮、输入框等控件上时，空格保留控件行为 |
| 自动环绕按钮 | 开启或关闭闲置后的镜头环绕 |
| 恢复视角按钮 | 回到默认观察位置 |
| 点击场景桌面上的三个旋钮 | 分别控制速度、昼夜循环和扬尘 |

设备暂停或变速不会停止／改变昼夜循环和自动环绕，它们有各自的开关。页面隐藏时场景停止更新，重新显示后继续，不补算离线时间。

## 构建与本地预览

```sh
pnpm build
pnpm start
```

`pnpm build` 生成构建产物；`pnpm start` 使用 Wrangler 在本地运行构建后的 Worker，需要先完成构建。预览地址以终端输出为准。该命令不会发布到线上。

开发和构建入口会根据本地执行配置选择 Vinext 或托管环境的 Vite 流程；全新克隆默认采用 `portable` 模式。`pnpm install:ci` 是面向托管 Linux 环境的专用安装脚本，依赖 `flock`、GNU `timeout` 等工具，普通本地开发直接使用上述 `pnpm install --frozen-lockfile`。

## 常用命令与验证

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建项目 |
| `pnpm start` | 本地预览构建后的 Worker |
| `pnpm lint` | 运行项目 ESLint 检查 |
| `pnpm exec tsc --noEmit` | 检查 TypeScript 类型 |
| `node scripts/check-diorama.mjs` | 验证当前沙盘的车辆交通逻辑 |
| `pnpm db:generate` | 根据 Drizzle schema 生成迁移，当前首页无需运行 |

修改当前场景后，可按需执行：

```sh
node scripts/check-diorama.mjs
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

交通检查以 60 Hz 模拟 600 秒，验证车辆包围圆不相交、车辆位于围挡内，以及运输车辆能够重复装卸。它不验证整个三维场景的碰撞或画面效果；灯光、交互、天气与帧率仍需在浏览器中检查。

## 项目结构

```text
app/
  page.tsx                 首页与交互控制
  globals.css              全局样式及响应式布局
  layout.tsx               页面布局与元信息
lib/construction/
  diorama.js               当前首页的三维场景与动画入口
  traffic.js               当前车辆路线、跟车和装卸逻辑
  simulation.ts            旧版建房模拟引擎
  playback.ts              旧版预编排回放
  scene.ts                 旧版场景渲染
components/ui/             通用 UI 组件
public/                   静态资源与旧版回放数据
scripts/                  启动、构建及离线检查脚本
db/、drizzle/              预留数据库结构与迁移
build/                    构建插件
vite.config.ts            Vinext / Vite / Cloudflare 配置
pnpm-workspace.yaml       pnpm 安装策略
```

调整场景模型、灯光、粒子和相机时，修改 `lib/construction/diorama.js`；调整车辆路线与停靠时，修改 `lib/construction/traffic.js`；调整页面按钮、状态栏和排版时，修改 `app/page.tsx` 与 `app/globals.css`。

## 旧版建房模拟与回放

仓库保留了旧版五人工地的固定图纸施工模拟、库存调度与预编排回放，以及 `public/playback/house.json`。**当前首页没有接入这套流程**，因此旧版的完工时间、有限库存、任务进度和自动收工规则不适用于当前沙盘。

维护旧版模块时可运行以下命令；其中回放生成会更新 `public/playback/house.json`，不是启动当前首页的前置步骤：

```sh
# 验证旧版模拟与碰撞
node --experimental-strip-types scripts/check-simulation.mjs
node --experimental-strip-types scripts/check-collisions.mjs

# 使用 Node.js 24 生成并验证旧版回放
node scripts/bake-playback.mjs
node scripts/check-playback.mjs
```

## 常见问题

- **安装提示 Node.js 版本不支持**：执行 `node --version`，切换到 `22.13.0` 或更高版本，并确认终端 PATH 已更新。
- **pnpm 版本不一致**：执行 `pnpm --version`，使用项目固定的 `11.19.0`，避免不同版本修改锁文件或安装策略。
- **页面显示“场景加载失败”**：检查浏览器控制台、jsDelivr 的网络访问，以及 WebGL／硬件加速是否可用，然后点击“重新加载”。
- **画面卡顿**：关闭扬尘或暴雨、缩小窗口，并检查浏览器硬件加速设置；右侧 FPS 是实际采样值，不保证固定帧率。
- **`pnpm start` 找不到构建配置**：先执行 `pnpm build`，确认已生成 `dist/server/wrangler.json`。

## 开源许可

本项目采用 [MIT License](LICENSE)。仓库中附带的第三方代码及资源保留各自的许可证，见 `build/` 和 `vendor/` 下的许可文件。
