# 部署（GitHub Pages）

本仓库是纯静态站点，没有构建步骤，因此用 Pages 的「分支模式」最稳（不需要 Action 权限）。

## 一次性设置

1. 打开 `Settings → Pages`
2. Source 选 **Deploy from a branch**
3. Branch 选 `main`，目录选 `/ (root)`，保存
4. 等 1 分钟左右，站点出现在 `https://fnhiq23.github.io/agi-engine-v2/`

## 为什么不用 Actions 部署

`deploy-pages` 需要 Pages 站点已经存在，仓库内的 `GITHUB_TOKEN` 无法自动创建 Pages 站点；本仓库的 `ci.yml` 只负责跑测试，不碰部署，避免出现"每次 push 都红"的假失败。

## 自定义域名

在 Pages 页面填 Custom domain，并在 DNS 添加 CNAME 指向 `fnhiq23.github.io`；勾选 Enforce HTTPS。

## 本地预览

```bash
npx serve .      # 或 python3 -m http.server 8080
```

不要用 `file://` 打开：ES module 与 CSP 都需要 http 源。
