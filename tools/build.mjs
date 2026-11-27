// 单文件构建：把 index.html + CSS + 全部 JS 模块压成一份可直接打开的 dist/index.html
// 用途：GitHub Pages 未开启时的备用分发（可直接发文件、或一键部署到任意静态托管）
// 用法：npm i --no-save esbuild && npm run build  →  dist/index.html
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.build');
await mkdir(tmp, { recursive: true });
await writeFile(join(tmp, 'entry.js'), "import '../js/app.js';\nimport '../js/toolkit.js';\n");

const out = await build({
  entryPoints: [join(tmp, 'entry.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'none',
  write: false,
  charset: 'utf8',
});
const js = out.outputFiles[0].text;

const appCss = await readFile(join(root, 'assets/app.css'), 'utf8');
const tkCss = await readFile(join(root, 'assets/toolkit.css'), 'utf8');
let html = await readFile(join(root, 'index.html'), 'utf8');

html = html
  .replace(/<link rel="stylesheet" href="\.\/assets\/app\.css">\s*/, `<style>\n${appCss}\n</style>\n`)
  .replace(/<link rel="stylesheet" href="\.\/assets\/toolkit\.css">\s*/, `<style>\n${tkCss}\n</style>\n`)
  .replace(/<script type="module" src="\.\/js\/app\.js"><\/script>\s*/, '')
  .replace(/<script type="module" src="\.\/js\/toolkit\.js"><\/script>\s*/, `<script>\n${js}\n</script>\n`)
  // 单文件版没有独立资源域，CSP 必须允许内联；此处的取舍已写入 README 的安全模型章节
  .replace("script-src 'self'", "script-src 'unsafe-inline'")
  .replace("style-src 'self'", "style-src 'unsafe-inline'");

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/index.html'), html);
await writeFile(
  join(root, 'dist/BUILD-INFO.txt'),
  `single-file build\ngenerated: ${new Date().toISOString()}\nbytes: ${Buffer.byteLength(html)}\nsource: index.html + assets/*.css + js/*.js (esbuild iife)\n`,
);
await rm(tmp, { recursive: true, force: true });
console.log(`built dist/index.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
