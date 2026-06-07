# Deploy na Vercel — War Room

## Opção 1: CLI (mais rápido)

```bash
cd warroom
npm install
npx vercel login       # faz login com sua conta Vercel
npx vercel --prod      # deploy direto
```

## Opção 2: GitHub + Vercel (recomendado para atualizações)

1. Crie um repositório no GitHub e faça push deste projeto
2. Acesse vercel.com → New Project → Import Git Repository
3. Selecione o repositório
4. Vercel detecta Vite automaticamente:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Clique em Deploy

## Opção 3: Drag & Drop (mais simples, sem conta GitHub)

1. Rode `npm install && npm run build` localmente
2. Acesse vercel.com → New Project → Browse
3. Arraste a pasta `dist/` direto na interface da Vercel

## Resultado dos testes

- 88 testes funcionais: 88 ✅ / 0 ❌
- Build: 263 KB JS (79 KB gzipped)
- Todas as 15 correções de auditoria validadas
