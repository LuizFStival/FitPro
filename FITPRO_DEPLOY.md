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
- Ficha de treino: botão Ver execução, vídeo sob demanda e detalhes de histórico/identificação recolhidos. Fechar a ficha ou trocar de tela desmonta o player. Idioma e observações de variantes aparecem; fontes permanecem no catálogo do código.
- Os vídeos são incorporados pelo player oficial YouTube (youtube-nocookie.com), sem download/cópia de mídia. Precisam de internet e podem ser indisponibilizados pelo autor. Desde 11/11, a ficha usa somente o player incorporado, sem links externos de autor/YouTube. Sem vídeo confirmado, a ficha informa isso.
- CSP libera somente esse host para `frame-src` em `/fitpro/`. O iframe envia apenas a origem como referer para evitar erro 153; não inclui chave Hevy, histórico ou nomes personalizados na URL. Nenhuma API ou armazenamento novo.
- Fontes por demonstração estão no catálogo: biblioteca pública de Leandro Twin, PureGym e vídeos dos autores. Aviso de mídia openGym consultado em 09/11/2026: https://raw.githubusercontent.com/DuarteSantos8/openGym/main/catalogue/media/NOTICE.md. As animações Gym visual não foram copiadas.

## Publicação confirmada — 04/11/2026

- Commit de implementação 5f16dfc enviado a origin/main (LuizFStival/FitPro).
- Deploy de produção 4Uq8TMqpMfpbxNYuRjuYA3dcLbe4, estado READY, associado a project-01anu.vercel.app.
- Acesso público sem bypass: raiz e /fitpro/ responderam 200; manifesto e worker responderam com seus tipos corretos; API sem chave respondeu JSON 401 e no-store.
- Consulta real pelo formulário da URL de produção concluída e rotinas exibidas no navegador. Nenhuma chave foi incluída no repositório ou persistida pelo agente.
- A instalação e o teste físico no iPhone continuam a cargo do usuário; o ensaio no navegador desktop não substitui esse aceite.

## Atualização publicada — 10/11/2026

- Commit `acc65e7`: nomes pt-BR, 24 associações de guias de execução, player sob demanda e ficha com detalhes recolhidos. Enviado a `origin/main`.
- Build concluído; 44 testes FitPro e 3 de isolamento passaram. O happy-dom informa que não carrega iframes externos nos testes, conforme configurado; o player foi conferido separadamente no navegador.
- Prévia `BRD1jNXZpUmVGXivkjGZdsmdkrs9` e produção `ACywUoV8ZDfAbUEr3QECNi6rbmyM`, ambas READY. Domínio público preservado: https://project-01anu.vercel.app/fitpro/.
- HTTP público: raiz, FitPro, manifesto e worker 200; API sem chave 401. Bundle publicado `index-DCY7O90P.js` contém os nomes pt-BR e o player.
- Prévia local com dados fictícios: ficha B traduzida, vídeo de panturrilha carregado, viewport 375 px e conteúdo 375 px (sem overflow). Não representa aceite em um iPhone físico nem revisão profissional de técnica de todos os vídeos.


## Treino e evolução visual — 11/11/2026

- Rotinas ordenadas alfabeticamente em `analyze`, compartilhadas por Plano, Treino e Estatísticas. A sequência de exercícios dentro de cada rotina continua sendo a da Hevy. Snapshot original não é alterado.
- Ficha prioriza status, faixa visual de 0/3/6 sessões sem progresso, comparação anterior/última (carga, reps e séries), recomendação conforme status e próxima sessão. Pausa, histórico antigo e falta de dados ficam neutros, sem faixa de estagnação atual.
- A regra de progressão permanece por rotina + template. Aumento de carga, repetições na mesma carga ou volume reinicia a contagem; retornos e sessões antigas mantêm as proteções existentes.
- Execução aparece depois da evolução; removidos os links externos do autor e de abertura no YouTube. Vídeo carrega sob demanda no player incorporado e requer internet. GIF offline não implementado: ainda não temos animações com licença de redistribuição; as mídias restritas do openGym não foram copiadas.
- Estatísticas: seleção A/B/C, nome completo do exercício, valor/data da última sessão e gráfico de carga/repetições. Bloco de esforço removido da interface. Estagnação por treino mostra contagem por rotina com acesso direto à ficha.
- Validação: 46 testes FitPro + 3 de isolamento passaram. Revisão visual com dados fictícios em 390 × 844 e 1366 × 900, sem overflow horizontal. Não substitui teste em iPhone físico.
- Publicado: commit `e0e404f` em `origin/main`; prévia `A8sGfEXZ1g1Nzxs3GcprLrSTae2r` e produção `CcAWg1dStvEpf6HrdtXNMroRi6AG` READY. Domínio: https://project-01anu.vercel.app/fitpro/.
- Verificação pública: raiz, FitPro, manifesto e worker 200; API sem chave 401. Bundle `index-CfhUWYos.js` contém a nova progressão e não contém o painel de esforço.

## Treino, histórico e distribuição muscular — 18/11/2026

- Última carga máxima e repetições totais visíveis na ficha recolhida. Ficha aberta mostra carga/reps de cada série normal e avisa quando carga máxima cresce mas volume total diminui. Regra continua por sessão e rotina, sem comparação posicional de séries; aquecimentos/drop sets excluídos.
- Nomes e IDs movidos exclusivamente para Config > Nomes dos exercícios. Preferência local por template, compartilhada entre rotinas, sem alterar identidade/histórico.
- Apenas um exercício aberto por vez, com fechamento do player anterior. Detalhes internos não fecham o exercício.
- Zoom mobile limitado via viewport, touch-action e prevenção de gestos multitoque dentro do app; rolagem com um dedo preservada e campos com fonte de 16 px. Preferências de acessibilidade do navegador/SO podem prevalecer. Aceite em iPhone físico pendente.
- Duração real da Hevy (fim menos início, incluindo descanso), última duração no treino e total/média por semana/30/90 dias nas estatísticas. Sem data final válida, não há duração estimada; média usa só sessões com duração válida.
- Histórico da rotina: total de sessões, número/data de cada sessão, duração, séries e reps totais, detalhamento dos exercícios e cargas/reps por série; paginação de 5 em 5. Histórico vinculado por ID ou título único, nunca só pela letra A/B/C.
- Radar muscular com oito grupos fixos, soma da mesma carga muscular do mapa (primário 1, secundário 0,4), filtros de período, agrupamentos e escala explicitados. Sem metas inventadas de equilíbrio/hipertrofia. Mapa corporal preservado como alternativa.
- Validação: 53 testes FitPro + 3 isolamento, build e conferência visual em 390 × 844 e 1366 × 900. Expansão exclusiva, histórico e configurações conferidos com dados fictícios; sem overflow horizontal.
- Publicação confirmada após envio do commit `51aaa2e` a `origin/main`: domínio público serviu o bundle `index-Dkp34kXQ.js`, igual ao build local, contendo radar, duração, histórico, nomes nas configurações e séries da última sessão. Viewport com limite de zoom confirmado no HTML.
- Raiz, FitPro, manifesto e worker responderam 200; API FitPro sem chave respondeu 401. O CLI pediu renovação de login, mas a versão nova já estava pública após o push; a tentativa de login/deploy manual foi cancelada. Nenhuma chave ou credencial foi necessária para a conferência.

## Ficha prática para a academia — 21/11/2026

- Treino usa cartões A/B/C com seleção explícita, mapa corporal e até três grupos musculares identificados na rotina da Hevy. Sem metadados, exibe quantidade de exercícios; não inventa grupos. A ordem dos exercícios e os IDs continuam preservados.
- Ficha aberta prioriza última execução, mudança em carga/reps/volume e um foco curto para a próxima sessão. Séries uniformes são agrupadas (ex.: 4 × 12 · 45 kg); séries diferentes preservam cada carga e repetição.
- Eliminados a duplicação da última carga, o status repetido, a escala sempre visível e o aviso “0 sem progresso”. Alertas reais mantêm status, cor e número de sessões sem progresso.
- Linha do tempo, tabela e explicação da regra ficam em “Histórico e detalhes”, fechado inicialmente. Treinos passados, duração e detalhamento por série seguem disponíveis em uma seção recolhida.
- Vídeo continua incorporado e só carrega ao tocar em “Ver execução”. Apenas um exercício fica aberto; trocar de rotina fecha o anterior. Nomes/IDs continuam nas configurações.
- Nenhuma mudança na regra de estagnação ou nos dados: comparação permanece por exercício + rotina; pausa, dados antigos e falta de histórico não recebem comparação artificial.
- Validação automatizada: 54 testes FitPro e 3 testes de isolamento; build de produção. Conferência com dados fictícios no navegador (não equivale a teste físico em iPhone).
- Revisão visual: 390 × 844 e 1366 × 900, sem overflow horizontal. Ficha aberta com cerca de 409–420 px no celular; histórico permanece recolhido. Graphify atualizado: 538 nós e 1.098 relações.
- Ajuste de usabilidade: régua 0/3/6 restaurada diretamente na ficha aberta. Exibe a contagem atual de sessões sem progresso e os limites “evoluiu”, “atenção” e “persistente”; a linha do tempo com datas continua recolhida em “Histórico e detalhes”.
- Cardio Hevy: séries com `duration_seconds` e `distance_meters` passam a ser comparáveis. Spinning/duração mostra tempo; Esteira/distância+duração mostra quilômetros, tempo e velocidade média calculada. Mais tempo em exercício apenas por duração, mais distância ou maior velocidade reinicia a contagem de estagnação.
- Ficha, histórico e “Evolução por exercício” compartilham as métricas de cardio; o gráfico oferece Distância, Tempo e Velocidade conforme os dados existentes. A identidade continua rotina + template, portanto o mesmo exercício em A e C não mistura sessões.
