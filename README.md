# Codex Toolkit

<p align="center">
  <strong>面向 Codex 用户的本地优先桌面增强工具：token 监控、中转站管理、路线切换与一键重启。</strong>
</p>

<p align="center">
  中文 | <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="./docs/images/relay-management.png" alt="Codex Toolkit 中转站管理面板" width="420" />
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> |
  <a href="#功能特性">功能特性</a> |
  <a href="#中转站管理">中转站管理</a> |
  <a href="#开发">开发</a>
</p>

Codex Toolkit 会读取本地 Codex 会话日志，把 token 使用情况整理成一个紧凑的桌面仪表盘。它也可以管理 Codex 的中转站/API 配置，让你不用手动编辑 `~/.codex/config.toml`，就能在官方路线和中转路线之间切换。

当前主要支持 Windows 和 macOS。

## 截图

<p>
  <img src="./docs/images/app-screenshot.png" alt="Codex Toolkit 深色仪表盘" width="24%" />
  <img src="./docs/images/dashboard-view.png" alt="Codex Toolkit 浅色仪表盘" width="24%" />
  <img src="./docs/images/settings-dark-view.png" alt="Codex Toolkit 深色设置面板" width="24%" />
  <img src="./docs/images/settings-view.png" alt="Codex Toolkit 浅色设置面板" width="24%" />
</p>

## 快速开始

```bash
npm install
npm run dev
```

构建桌面安装包：

```bash
npm run build
```

构建产物会生成在：

- `src-tauri/target/release/bundle/msi`
- `src-tauri/target/release/bundle/nsis`
- `src-tauri/target/release/bundle/dmg`
- `src-tauri/target/release/bundle/macos`

## 功能特性

| 模块 | 能力 |
| --- | --- |
| Token 仪表盘 | 当前会话总量、最近回复用量、趋势视图、上下文窗口大小 |
| 限额视图 | 基于本地 Codex 会话日志展示 5 小时和每周使用窗口 |
| 中转站管理 | Provider ID、API Base URL、API Key、应用配置、恢复官方、应用并重启 |
| 桌面体验 | 托盘最小化/恢复、开机自启、贴边吸附、隐私模式 |
| 界面 | 中英双语菜单切换、日间/夜间主题切换 |

## 中转站管理

Codex Toolkit 会先把中转站设置保存在本地，只有点击应用配置时才会写入 Codex 配置。

默认 Provider ID 为 `moapi`，生成的 Codex 配置示例：

```toml
model_provider = "moapi"

[model_providers.moapi]
name = "moapi"
wire_api = "responses"
requires_openai_auth = true
base_url = "https://your-relay.example.com/v1"
experimental_bearer_token = "sk-..."
```

Provider ID 可以自定义。比如设置为 `myrelay` 时，Codex Toolkit 会写入：

```toml
model_provider = "myrelay"

[model_providers.myrelay]
name = "myrelay"
wire_api = "responses"
requires_openai_auth = true
base_url = "https://your-relay.example.com/v1"
experimental_bearer_token = "sk-..."
```

写入前会自动备份原 Codex 配置：

```text
config.toml.codexviewer-backup-YYYYMMDD-HHMMSS
```

恢复官方会移除当前工具管理的 provider、默认 `moapi` provider，以及旧版本遗留的 `CodexViewerRelay` provider。

## 数据加载方式

应用会：

1. 解析 Codex 会话日志目录
2. 递归扫描 `.jsonl` 文件
3. 提取 `token_count` 事件
4. 读取当前工具管理的 Codex provider 状态
5. 生成最新 token 快照和趋势数据
6. 将用量标记为官方路线或中转路线
7. 渲染到桌面 UI

默认日志目录：

```text
~/.codex/sessions
```

你可以在设置面板里覆盖这个目录。

## 为什么做这个项目

OpenAI 的公开 API usage 接口主要面向组织账单和 API 用量，不适合直接还原本地 Codex 桌面会话的 token 使用情况。不同中转服务对用量数据的暴露方式也不一样。

Codex Toolkit 选择读取你机器上已经存在的本地 Codex 会话日志来重建使用情况，并根据当前 Codex 配置标记它来自官方路线还是中转路线。

## 开发

环境要求：

- Node.js 20+
- Rust toolchain with `cargo`
- Windows: Microsoft Visual Studio C++ Build Tools
- macOS: Xcode Command Line Tools

常用检查：

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

Windows 上只检查前端语法：

```powershell
$tmp = Join-Path $env:TEMP 'codex-toolkit-renderer-check.mjs'
Copy-Item src\renderer.js $tmp -Force
node --check $tmp
```

## 发布自动化

仓库包含两个 GitHub Actions workflow：

- `CI`：在 push 和 pull request 时运行测试并验证构建
- `Release`：推送类似 `v1.0.0` 的版本 tag 时构建 Windows/macOS 安装包，并上传到 GitHub Releases

发布示例：

```bash
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

## 平台说明

- Windows 产物为 `.msi` 和 `setup.exe`
- Windows release 可执行文件使用 GUI subsystem，启动时不会弹出控制台黑窗口
- macOS 产物为 `.dmg` 和 `.app`
- macOS 签名和 notarization 暂未配置，首次启动可能仍会出现 Gatekeeper 提示

## 隐私

Codex Toolkit 读取的是你本机的 Codex 会话日志，不会调用 OpenAI 公开组织用量 API 来填充仪表盘。

API Key 会保存在本地工具设置文件中，只有应用中转站配置时才会写入 Codex 配置。分享截图时请避免暴露完整本地路径或敏感中转站信息，也可以使用内置隐私开关。

## 贡献

提交 Pull Request 前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[MIT](./LICENSE)
