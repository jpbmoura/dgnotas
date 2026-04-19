/**
 * Força um `import()` dinâmico nativo em código compilado pra CommonJS.
 *
 * O tsc com `module: commonjs` transpila `await import('x')` para
 * `Promise.resolve().then(() => require('x'))` — o que quebra em módulos
 * ESM-only (ex: better-auth) com `ERR_REQUIRE_ESM`.
 *
 * Envolver `import()` num `new Function()` esconde a sintaxe do tsc, que passa
 * o texto adiante sem transformar — o Node.js executa um `import()` real no
 * runtime, que funciona pra CJS e ESM.
 */
export const dynamicImport = new Function(
  'spec',
  'return import(spec)',
) as <T = unknown>(spec: string) => Promise<T>;
