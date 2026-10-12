import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * 前端有两套"语言版本"，共用同一份代码：
 *   npm run dev / build            → 中文版（默认，端口 5173，产物 dist/）
 *   npm run dev:en / build:en      → 英文版（.env.en：VITE_LANG=en，端口 5174，产物 dist-en/）
 *
 * 语言切换在 src/i18n：`tr('中文')` 在中文模式下原样返回中文，英文模式查 src/i18n/en.ts。
 * 后端返回的数据（菜名、分类名、地址…）不经过 i18n，因此保持原样。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT || 5173)
  // 后端地址做成可配置：后端换端口 / 换机器时只改 .env，不用动代码
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8080'
  const wsTarget = env.VITE_WS_TARGET || 'ws://localhost:8080'

  /**
   * 代理配置（dev 与 preview 共用，所以构建产物也能挂在别的端口上直接连后端）：
   * 前端的路由也用 /admin、/user 前缀（如 /admin/login），因此用 bypass 区分：
   * 浏览器地址栏导航（Accept 含 text/html）交给前端路由，
   * 只有真正的接口请求（axios 发的 Accept 是 application/json 等）才代理到后端。
   * 否则直接访问/刷新 /admin/login 会被转发到 Spring Boot，得到 Whitelabel 404。
   */
  const proxy = {
    '/admin': {
      target: apiTarget,
      changeOrigin: true,
      bypass(req: { headers: { accept?: string } }) {
        if (req.headers.accept?.includes('text/html')) {
          return '/index.html'
        }
      },
    },
    '/user': {
      target: apiTarget,
      changeOrigin: true,
      bypass(req: { headers: { accept?: string } }) {
        if (req.headers.accept?.includes('text/html')) {
          return '/index.html'
        }
      },
    },
    // WebSocket 提醒（管理端实时消息）
    '/ws': {
      target: wsTarget,
      ws: true,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port,
      proxy,
      /**
       * Windows 上"原子写"（编辑器 / 工具先写 .xxx.tmpdir/xxx.tmp 再改名）会让 chokidar 抛
       * `EBUSY: resource busy or locked, watch ...` 直接把 dev server 干崩（我们踩过 3 次）。
       * 忽略这些临时文件，避免开发时莫名"dev server 自己没了"。
       */
      watch: {
        ignored: ['**/.git/**', '**/node_modules/**', '**/*.tmp', '**/*.tmpdir/**', '**/*.swp', '**/*~'],
      },
    },
    preview: { port, proxy },
    // 中英文产物分目录，可以同时 build、同时预览
    build: {
      outDir: env.VITE_LANG === 'en' ? 'dist-en' : 'dist',
    },
  }
})
