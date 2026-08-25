import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // tanstackRouter MUST be before react() plugin
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
  // Proxy de DESENVOLVIMENTO para o blog — espelha o que a Vercel faz em
  // produção (ver as duas regras de /blog em vercel.json).
  //
  // 🔴 Sem isto, o loop do blog não é testável local, e não por preguiça: em
  // produção o blog vive em /blog do MESMO origin da SPA, e é disso que
  // dependem as três peças que mais podem quebrar em silêncio —
  //
  //   1. o cookie `access_token` chegar ao servidor do WordPress;
  //   2. o `?redirect=` cair em `/blog/...`, que é a ÚNICA forma que
  //      `isSafeBlogReturn` aceita (rodando o blog solto em :8080 o caminho
  //      vira `/hello-world`, é recusado, e o teste passa longe do caminho real);
  //   3. o `rewrite` ter precedência sobre o catch-all da SPA.
  //
  // `rewrite` remove o prefixo /blog exatamente como a Vercel remove antes de
  // repassar para a origem — e o `config/application.php` do blog o reconstrói
  // (§4.10 do playbook). Se isto divergir da Vercel, o local mente.
  //
  // Só vale em `vite dev`. O build de produção não olha para esta seção.
  server: {
    proxy: {
      '^/blog(/.*)?$': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (caminho: string) => caminho.replace(/^\/blog/, '') || '/',
      },
    },
  },
  test: {
    // See test/setup/jsdom-storage.ts: works around Node's built-in
    // `localStorage` shadowing jsdom's real Storage implementation.
    setupFiles: ['./test/setup/jsdom-storage.ts'],
  },
});
