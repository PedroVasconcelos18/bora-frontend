import { describe, it, expect } from 'vitest';
import {
  BLOG_RETURN_KEY,
  isSafeBlogReturn,
  readBlogReturn,
  saveBlogReturn,
  consumeBlogReturn,
} from '../src/lib/blogReturn';

/** Storage de mentira — o módulo é DOM-free e recebe o storage injetado. */
function storageFake(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    removeItem: (k: string) => void dados.delete(k),
    _dados: dados,
  };
}

describe('isSafeBlogReturn', () => {
  it('aceita o post e a raiz do blog', () => {
    expect(isSafeBlogReturn('/blog')).toBe(true);
    expect(isSafeBlogReturn('/blog/')).toBe(true);
    expect(isSafeBlogReturn('/blog/como-manter-o-habito')).toBe(true);
    expect(isSafeBlogReturn('/blog/post?x=1')).toBe(true);
  });

  it('recusa vazio e ausente', () => {
    expect(isSafeBlogReturn('')).toBe(false);
    expect(isSafeBlogReturn(null)).toBe(false);
    expect(isSafeBlogReturn(undefined)).toBe(false);
  });

  // 🔴 O caso que transforma a tela de login num redirecionador aberto.
  it('recusa host externo, inclusive protocol-relative', () => {
    expect(isSafeBlogReturn('https://evil.com/blog')).toBe(false);
    expect(isSafeBlogReturn('//evil.com/blog')).toBe(false);
    expect(isSafeBlogReturn('/\\evil.com/blog')).toBe(false);
    expect(isSafeBlogReturn('\\\\evil.com')).toBe(false);
  });

  it('recusa rota interna que não é do blog', () => {
    expect(isSafeBlogReturn('/home')).toBe(false);
    expect(isSafeBlogReturn('/admin')).toBe(false);
  });

  // A barra depois de /blog é obrigatória: senão o prefixo casaria com
  // qualquer rota que comece com essas cinco letras.
  it('recusa prefixo que só parece o blog', () => {
    expect(isSafeBlogReturn('/blogueiro')).toBe(false);
    expect(isSafeBlogReturn('/blog-admin')).toBe(false);
  });
});

describe('readBlogReturn', () => {
  it('lê o parâmetro que o WordPress manda (rawurlencode)', () => {
    expect(readBlogReturn('?redirect=%2Fblog%2Fmeu-post')).toBe('/blog/meu-post');
  });

  it('funciona sem a interrogação e com outros parâmetros', () => {
    expect(readBlogReturn('a=1&redirect=%2Fblog%2Fx&b=2')).toBe('/blog/x');
  });

  it('devolve null sem o parâmetro', () => {
    expect(readBlogReturn('')).toBeNull();
    expect(readBlogReturn('?outra=coisa')).toBeNull();
  });

  it('devolve null para destino inseguro', () => {
    expect(readBlogReturn('?redirect=https%3A%2F%2Fevil.com')).toBeNull();
    expect(readBlogReturn('?redirect=%2Fhome')).toBeNull();
  });

  it('não estoura com sequência percent inválida', () => {
    expect(() => readBlogReturn('?redirect=%E0%A4%A')).not.toThrow();
  });
});

describe('saveBlogReturn / consumeBlogReturn', () => {
  it('guarda na chegada e devolve uma vez só', () => {
    const s = storageFake();
    saveBlogReturn('?redirect=%2Fblog%2Fmeu-post', s);
    expect(s._dados.get(BLOG_RETURN_KEY)).toBe('/blog/meu-post');
    expect(consumeBlogReturn(s)).toBe('/blog/meu-post');
    expect(consumeBlogReturn(s)).toBeNull();
  });

  it('não guarda destino inseguro', () => {
    const s = storageFake();
    saveBlogReturn('?redirect=https%3A%2F%2Fevil.com', s);
    expect(s._dados.has(BLOG_RETURN_KEY)).toBe(false);
  });

  // O blog é o MESMO origin da SPA, então esta chave é gravável de fora do
  // código da SPA. Revalidar na saída é o que impede que isso vire um vetor.
  it('revalida o que veio do storage', () => {
    const s = storageFake({ [BLOG_RETURN_KEY]: 'https://evil.com' });
    expect(consumeBlogReturn(s)).toBeNull();
    expect(s._dados.has(BLOG_RETURN_KEY)).toBe(false);
  });

  it('sem storage, devolve null em vez de estourar', () => {
    expect(consumeBlogReturn(null)).toBeNull();
    expect(() => saveBlogReturn('?redirect=%2Fblog%2Fx', null)).not.toThrow();
  });
});
