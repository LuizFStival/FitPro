# FitPro no projeto Vercel atual

Decisão de 03/11/2026: hospedar a V2 em https://project-01anu.vercel.app/fitpro/, mantendo o aplicativo atual na raiz. Projeto Vercel: heavypulse, equipe figurinhas2026-s-projects. Não criar outro banco ou projeto.

## Arquitetura

- Código da V2 em fitpro/, copiado por lista explícita do piloto openGym-Pulse, com licença AGPL e atribuições MIT preservadas. Nenhuma conta, backup ou mídia licenciada de exercício foi copiada.
- Build raiz gera o app atual, instala dependências do FitPro pelo lockfile, gera a V2 e reúne tudo em dist/.
- /fitpro/api/hevy usa a Function api/fitpro-hevy.mjs, independente de /api/index. GET somente, chave por cabeçalho do navegador, no-store e host Hevy fixo.
- Manifesto, assets e worker FitPro usam /fitpro/. Worker legado ignora essa rota e remove apenas caches hevypulse-shell-*; FitPro só remove fitpro-pulse-*.
- Fonte correspondente disponível em /fitpro/source.tar.gz, gerada sem dados pessoais.

## Operação

Na raiz: npm run build, npm run lint e npm run test:fitpro.
Para desenvolver somente a V2: npm --prefix fitpro run dev:pulse -- --port 8184; abrir http://127.0.0.1:8184/fitpro/.
O piloto anterior em 8180/8183 permanece separado; mudanças futuras desta versão publicada devem ocorrer em fitpro/ neste repositório.

## Publicação e reversão

Publicar prévia no projeto heavypulse, conferir raiz, subpasta, JS, manifesto, worker e API; então publicar em produção. Preservar o deploy anterior para rollback pela Vercel. O endereço /fitpro redireciona para /fitpro/.
Não colocar chaves Hevy em variáveis VITE_* ou no Git. Configurações locais no PC não são migradas automaticamente à origem publicada.

## Evidências antes da produção

- Build dos dois apps concluído, TypeScript do app atual passou.
- 40 testes FitPro + 3 testes de isolamento passaram.
- Prévia Vercel READY, duas Functions geradas (API antiga e FitPro).
- HTML raiz preservado; HTML, JS e manifesto da V2 servidos em /fitpro/.
- Endpoint FitPro devolveu JSON 401 sem chave e Cache-Control private, no-store.

## Uso no iPhone

Abrir /fitpro/ no Safari, conectar a Hevy no próprio app e marcar Lembrar chave somente se desejar. Compartilhar → Adicionar à Tela de Início. Abrir o atalho e conferir última atualização, rotina atual e exercícios antes de treinar. Registrar e finalizar na Hevy; retornar ao FitPro para consultar.

## Pontos a complementar

Aceite físico no iPhone e consulta pós-treino. Filtros, agenda e nomes são locais por aparelho. Não há gravação de treino nesta versão.
