/**
 * blogReturn.ts — contrato do "voltar para o post" depois do login.
 *
 * POR QUE EXISTE:
 *   O blog (`/blog`, WordPress) é servido no mesmo domínio da SPA, mas está
 *   FORA do router. Quando um leitor deslogado clica em "Curtir" ou em
 *   "Entrar para comentar", o WordPress manda ele para `/login?redirect=/blog/...`
 *   (ver `bora_identidade_url_login()` no repo bora-blog). Sem isto, o efeito
 *   pós-auth de login.tsx/signup.tsx o largaria em `/home`, longe do post que
 *   ele estava lendo.
 *
 * POR QUE sessionStorage E NÃO SÓ O PARÂMETRO:
 *   Mesma razão do [pendingInvite]: o destino precisa sobreviver a uma navegação
 *   no meio do caminho. Quem chega em `/login` sem conta clica em "Criar conta"
 *   e vai para `/signup` — e o `?redirect=` ficaria para trás. Guardando na
 *   chegada, as duas telas terminam no mesmo lugar sem que nenhum <Link>
 *   precise repassar parâmetro.
 *
 * 🔴 A VALIDAÇÃO NÃO É FORMALIDADE:
 *   `redirect` vem da URL, ou seja, de qualquer um. Aceitar valor arbitrário
 *   transformaria a tela de login num redirecionador aberto — o golpe clássico
 *   de phishing: link que parece da Bora, login de verdade, e a vítima termina
 *   num site de terceiro logo depois de digitar a senha. Por isso só passa
 *   caminho interno começando em `/blog`.
 *
 * DOM-FREE BY DESIGN:
 *   O storage é injetado (padrão: sessionStorage do navegador quando existe),
 *   para este módulo e o teste rodarem sem jsdom.
 */

export const BLOG_RETURN_KEY = 'pendingBlogReturn';

/** O parâmetro que o WordPress usa em `/login?redirect=…`. */
export const BLOG_RETURN_PARAM = 'redirect';

type ReturnStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

function defaultStorage(): ReturnStorage | null {
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
}

/**
 * Um destino só é aceito se for um caminho interno do blog.
 *
 * Recusa, nesta ordem e por motivos diferentes:
 *   - vazio / ausente;
 *   - `//outro.site` e `/\outro.site` — protocol-relative, que o navegador
 *     trata como host externo apesar de começar com barra;
 *   - `https://…` e qualquer coisa com esquema;
 *   - caminho interno que não seja do blog (`/home`, `/admin`): o parâmetro
 *     existe para o blog, e ampliá-lo seria ampliar a superfície de graça;
 *   - `/blogueiro` — a barra depois de `/blog` é obrigatória, senão o prefixo
 *     casaria com qualquer rota que comece com essas cinco letras.
 */
export function isSafeBlogReturn(destino: string | null | undefined): destino is string {
  if (!destino) return false;

  // Barra invertida vira barra em vários navegadores: `/\evil.com` é tratado
  // como `//evil.com`. Normalizar antes de olhar o começo.
  const normalizado = destino.replace(/\\/g, '/');

  if (!normalizado.startsWith('/')) return false;
  if (normalizado.startsWith('//')) return false;

  return normalizado === '/blog' || normalizado.startsWith('/blog/');
}

/**
 * Lê o `?redirect=` de uma query string, já decodificado e validado.
 * Devolve null quando não há destino aceitável.
 */
export function readBlogReturn(search: string): string | null {
  let bruto: string | null;

  try {
    bruto = new URLSearchParams(search).get(BLOG_RETURN_PARAM);
  } catch {
    return null;
  }

  if (bruto === null) return null;

  // O WordPress manda com rawurlencode; `URLSearchParams` já decodifica uma
  // vez. O try existe para sequência percent inválida, que lança.
  let valor = bruto;
  try {
    valor = decodeURIComponent(bruto);
  } catch {
    // fica com o valor de uma decodificação só — a validação abaixo decide.
  }

  return isSafeBlogReturn(valor) ? valor : null;
}

/** Guarda o destino na chegada em /login ou /signup, se houver um válido. */
export function saveBlogReturn(
  search: string,
  storage: ReturnStorage | null = defaultStorage(),
): void {
  const destino = readBlogReturn(search);
  if (destino) storage?.setItem(BLOG_RETURN_KEY, destino);
}

/**
 * Lê e limpa o destino guardado.
 *
 * Revalida na saída: o que está no storage pode ter sido escrito por outra
 * coisa (o blog é o MESMO origin), então confiar nele sem checar recriaria o
 * redirecionador aberto que `isSafeBlogReturn` fecha.
 */
export function consumeBlogReturn(
  storage: ReturnStorage | null = defaultStorage(),
): string | null {
  if (!storage) return null;

  const destino = storage.getItem(BLOG_RETURN_KEY);
  if (destino) storage.removeItem(BLOG_RETURN_KEY);

  return isSafeBlogReturn(destino) ? destino : null;
}
