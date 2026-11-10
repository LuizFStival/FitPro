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

## Nomes e execução — 09/11/2026

- `fitpro/src/pulse/exercisePresentation.js` centraliza nomes pt-BR para movimentos/variantes reconhecidos e associações explícitas de demonstrações. Alertas, treino e gráficos consomem a mesma apresentação de `analyze`. Identidade continua rotina + template; renomear não muda histórico ou vídeo.
- Nomes desconhecidos e exercícios personalizados são preservados. Não traduzir removendo qualificadores desconhecidos nem buscar vídeos por semelhança textual. Acrescentar novas variantes ao catálogo após conferência.
- Ficha de treino: botão Ver execução, vídeo sob demanda e detalhes de histórico/identificação recolhidos. Fechar a ficha ou trocar de tela desmonta o player. Fonte e idioma aparecem; aulas gerais ou com variações são identificadas.
- Os vídeos são incorporados pelo player oficial YouTube (youtube-nocookie.com), sem download/cópia de mídia. Precisam de internet e podem ser indisponibilizados pelo autor; link externo sempre disponível. Sem vídeo confirmado, a ficha informa isso.
- CSP libera somente esse host para `frame-src` em `/fitpro/`. O iframe envia apenas a origem como referer para evitar erro 153; não inclui chave Hevy, histórico ou nomes personalizados na URL. Nenhuma API ou armazenamento novo.
- Fontes por demonstração estão no catálogo: biblioteca pública de Leandro Twin, PureGym e vídeos dos autores. Aviso de mídia openGym consultado em 09/11/2026: https://raw.githubusercontent.com/DuarteSantos8/openGym/main/catalogue/media/NOTICE.md. As animações Gym visual não foram copiadas.

## Publicação confirmada — 04/11/2026

- Commit de implementação 5f16dfc enviado a origin/main (LuizFStival/FitPro).
- Deploy de produção 4Uq8TMqpMfpbxNYuRjuYA3dcLbe4, estado READY, associado a project-01anu.vercel.app.
- Acesso público sem bypass: raiz e /fitpro/ responderam 200; manifesto e worker responderam com seus tipos corretos; API sem chave respondeu JSON 401 e no-store.
- Consulta real pelo formulário da URL de produção concluída e rotinas exibidas no navegador. Nenhuma chave foi incluída no repositório ou persistida pelo agente.
- A instalação e o teste físico no iPhone continuam a cargo do usuário; o ensaio no navegador desktop não substitui esse aceite.
