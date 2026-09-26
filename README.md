# NiNA

Réplica local do [Chat Buddy AI](https://lovable.dev/projects/52994a4f-5b80-4348-9ccf-daa74b8a27a6): conversa no estilo WhatsApp com a NiNA, assistente de vendas técnicas da NITRO.

Pedidos, entregas, notas, crédito, cadastro, produção e estoque vêm de dados simulados. A interpretação da mensagem e a resposta em linguagem natural também são locais: o app não chama modelo externo e não precisa de chave de API.

## Uso

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Os atalhos acima do campo de mensagem disparam consultas de exemplo. O ícone de inseto abre o JSON da interpretação e dos sistemas consultados.

```bash
npm test
npm run build
```

## GitHub Pages

O endereço publicado é [https://anderson-figueiredo.github.io/nina/](https://anderson-figueiredo.github.io/nina/).

O Pages deste repositório serve a branch `main` direto, sem um passo de build no servidor. O navegador não executa `src/main.tsx`, então a página ficava em branco. O `npm run build` gera o site estático na raiz (`index.html`, `assets/` e `favicon.svg`) com os arquivos em `/nina/`. O workflow `.github/workflows/pages.yml` republica esse build a cada push na `main`.
