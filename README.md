# Railway 3D Training (综合控制模块箱 3D 演示)

基于 **Three.js** 的铁路综合控制模块箱 3D 可视化交互演示项目。支持模块插槽弹出、详情弹窗展示、状态监控等交互功能。

## 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 | 前端框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Three.js | 3D 渲染引擎 |
| Element Plus | UI 组件库 |
| Vue Router | 路由管理 |
| Pinia | 状态管理 |

## 环境要求

- Node.js >= 18.0
- pnpm >= 8.0

## 安装 pnpm

### 方式一：使用 npm 安装（推荐）

```bash
npm install -g pnpm
```

### 方式二：使用独立安装脚本

**Windows (PowerShell):**
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

**macOS / Linux:**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 验证安装

```bash
pnpm --version
```

## 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd three.js-demo

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
```

启动后访问 http://localhost:5173 即可查看效果。

## 常用命令

```bash
# 启动开发服务器（热更新）
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建结果
pnpm preview
```

## 功能特性

- 8x5 模块插槽 3D 展示
- 点击插槽弹出卡片并显示详情
- 模块状态实时监控（正常/告警/故障）
- LED 状态指示灯动态闪烁
- 行级批量弹出操作
- 后处理轮廓高亮效果
- CSS2D 标签叠加层
