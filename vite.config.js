import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

// Обрабатываем .js в src/ как JSX до анализа импортов (чтобы не переименовывать все файлы)
function jsxInJsPlugin() {
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\/src\/.*\.js$/.test(id)) return null;
      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsx: 'automatic',
      });
    },
  };
}

export default defineConfig({
  plugins: [
    jsxInJsPlugin(),
    react({ include: /\.(jsx|js)$/ }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Статика загрузок (Express: app.use('/uploads', ...)) — при VITE_API_URL=/api иначе картинки шли на :3001 и не находились
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
