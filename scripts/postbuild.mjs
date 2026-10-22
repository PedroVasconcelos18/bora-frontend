// Postbuild: coloca a landing page estática na raiz do site e move o shell do app.
//
// O Vite gera dist/index.html como shell da SPA. Como a LP precisa ocupar `/`,
// renomeamos o shell para dist/app.html e copiamos a LP (lp/) para a raiz do dist.
// Em produção (Vercel), `/` serve a LP como arquivo real; as rotas do app
// (/home, /login, ...) caem no rewrite para /app.html (ver vercel.json).
import { copyFileSync, renameSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const lp = resolve(root, 'lp');

const appShell = resolve(dist, 'index.html');
if (!existsSync(appShell)) {
  throw new Error(`postbuild: ${appShell} não encontrado — o build do Vite rodou?`);
}

// 1. Shell da SPA vira app.html (os assets referenciados são absolutos, /assets/...).
renameSync(appShell, resolve(dist, 'app.html'));

// 2. LP passa a ser o documento raiz, com as páginas internas (/como-funciona,
//    /contato, ...) e o 404.html ao lado. Tudo plano na raiz do dist: as páginas
//    referenciam /styles.css e /script.js por caminho absoluto, porque o 404.html
//    é servido em qualquer profundidade de URL.
const files = readdirSync(lp);
for (const file of files) {
  copyFileSync(resolve(lp, file), resolve(dist, file));
}

console.log(`postbuild: shell → app.html; LP (${files.join(', ')}) → raiz do dist`);
