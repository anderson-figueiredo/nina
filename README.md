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
