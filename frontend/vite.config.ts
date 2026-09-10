import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: {
            // 后端 FastAPI 运行在 8000，前端 /api 全部代理过去（含 SSE，需关闭缓冲）
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
        allowedHosts: [
            'chengxiaohu.cn'
        ]
    },
    build: {
        rollupOptions: {
            output: {
                // 分离大型依赖，提升缓存命中与首屏加载
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    antd: ['antd', '@ant-design/icons'],
                },
            },
        },
    },
})
