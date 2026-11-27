# 部署说明（2026-11-27 更新）

## 当前线上地址（EdgeOne Pages，已可用）

**https://mcp.edgeone.site/share/Sc7rhlJ2Qu-Ef32mwdFMK**

实现方式：只部署一个 11 KB 的 `site/index.html`，CSS 与 JS 全部通过 jsDelivr 指向本仓库：

```
https://cdn.jsdelivr.net/gh/Fnhiq23/agi-engine-v2@main/js/app.js
https://cdn.jsdelivr.net/gh/Fnhiq23/agi-engine-v2@main/assets/app.css
```

因此：**改仓库就是改线上**（jsDelivr 缓存约 12 小时；要立即生效就把 `site/index.html` 重新部署一次）。

## GitHub Pages（可选，需仓库主人手动开启一次）

仓库内 `GITHUB_TOKEN` 无建站权限，workflow 里 `enable-pages` 无效（已试三次，18–20 秒失败）。手动路径：

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: `main` / folder: `/(root)`。

开启后地址为 `https://fnhiq23.github.io/agi-engine-v2/`，与 EdgeOne 版跑同一份代码。

## 单文件版（无托管也能用）

```bash
npm i --no-save esbuild
npm run build          # 产出 dist/index.html（约 67 KB，双击即用）
```

## CI

`.github/workflows/ci.yml`：Node 20 → `npm run check` → `npm test`。仓库内代码与本地逐字节一致，本地 23/23 通过。

## 已知限制

- 离线授权依赖 WebCrypto，需要安全上下文（https / localhost / 部分浏览器的 file:）。
- EdgeOne 会在页面尾部注入一个"部署按钮"脚本，本页 CSP 会拦掉它，不影响功能。
- `demo/` 下是演示私钥，任何人可签票；**发第一单前必须 `npm run keygen` 换公钥并删除 `demo/`**。
