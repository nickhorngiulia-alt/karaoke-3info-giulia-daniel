# Karaokê — Integrador de Programação III

**IFSul — Campus Passo Fundo · Ensino Médio Integrado — Técnico em Informática**
**Professor:** Élder F. F. Bernardi
**Tutor da atividade:** Prof. Leonardo Constantin  

**Base de retomada opcional. Consulta e player prontos; as tarefas de integração estão em `public/admin.js`. Receber esta base não reduz a nota.**

## Preparar e executar

1. Use **Node.js 22 ou superior** (confira com `node --version`). As versões das dependências existentes estão fixadas no lockfile.
2. No terminal, entre nesta pasta e execute `npm ci`.
3. Use um projeto Supabase de demonstração da própria dupla. Se for novo, execute `sql/schema.sql` no SQL Editor uma vez. Se as tabelas da atividade anterior já existem, rodem `sql/diagnostico.sql` no SQL Editor; se alguma linha vier `ajustar`, rodem `sql/ajustes.sql` (não apaga dados) e o diagnóstico de novo. Não tente recriar as tabelas nem apague seus dados.
4. Execute `sql/seed.sql` para incluir a amostra original. Ele não apaga o catálogo e pode ser repetido. A amostra dura cerca de 2,4 segundos; o player apresenta texto, sem áudio.
5. Copie `.env.example` para `.env` e preencha `SUPABASE_URL` e `SUPABASE_SECRET_KEY` do projeto. No Windows ou no VS Code, a cópia também pode ser feita pelo explorador de arquivos. A chave secreta fica apenas no servidor; não enviar `.env` ao Git nem ao navegador.
6. Execute `npm start` e abra `http://localhost:3000`. Para outra porta, configure `PORT` no `.env`.

O servidor usa o caminho da própria pasta para localizar `public/` e `.env`. Não é preciso instalar ferramentas adicionais de frontend.

## Onde acompanhar o caminho dos dados

```text
public/index.html → public/catalogo.js ou public/admin.js
                  → app.js → karaoke/DAO/ → supabaseClient.js → banco
```

- `catalogo.js`: consulta, seleção, feedback e player.
- `admin.js`: eventos dos formulários e requisições de escrita.
- `app.js`: rotas, validação e respostas HTTP; não contém consultas ao banco.
- `MusicaDAO`, `ArtistaDAO` e `ParteDAO`: consultas e mapeamento entre linhas e objetos.
- Classes em `karaoke/`: objetos usados na aplicação.

POST e PUT enviam `{ "nome": "Título", "artista": "Nome do artista" }`. A resposta traz artista como objeto `{id, nome}`. Músicas sem partes são válidas para o catálogo; Tocar fica indisponível até que existam partes. Não é obrigatório criar um editor de letras.

## Testes e publicação

- `npm test`: testes HTTP e de contrato dos DAOs com dados simulados. **Não usa rede nem comprova conexão ou persistência no Supabase.**
- `npm run verificar-url -- http://localhost:3000`: teste da API configurada. Execute somente na aplicação de demonstração da própria dupla. Cria um registro identificado, usa artista existente e remove apenas o registro criado. Não apaga o catálogo. Exige seed ou algum artista já relacionado a uma música.
- Para verificar persistência: crie uma música pela interface, anote o ID, reinicie o servidor e consulte novamente pela API e pela tela. Recarregar apenas a página não substitui esse teste.
- Para publicar: use o "Guia de deploy na Render", disponível no Classroom da disciplina, Node >=22, instalação `npm ci` e inicialização `npm start`; configure as mesmas variáveis no ambiente do serviço. Teste novamente pela URL pública e registre-a no README da dupla.
- Mantenha dados de demonstração. O exercício não implementa login ou autorização de usuários; os endpoints de escrita atendem quem alcançar a aplicação.

## Agente de IA como tutor

O arquivo `AGENTS.md`, na raiz desta pasta, orienta o agente de IA (Codex, Copilot, Gemini, Claude e outros) a agir como tutor: ele explica, faz perguntas e indica onde olhar, sem entregar a solução das partes avaliadas. Os agentes que leem esse arquivo costumam usá-lo sozinhos; se o seu não usar, peça que o leia. A etapa 0 do "Guia passo a passo do Supabase", disponível no Classroom da disciplina, explica como isso funciona.

## Antes de entregar

Conferir cadastro, consulta, edição e exclusão pela tela; entradas vazias; mensagem de falha; música sem partes; reprodução da amostra; persistência após reinício e funcionamento pela URL publicada. Registrar resultado e uma dificuldade resolvida; ambos devem conseguir seguir o percurso interface/API/DAO/banco.

## Tarefas de integração

Comece executando a consulta pronta. Em `public/admin.js`, complete TODO 1 (cadastro), TODO 2 (edição) e TODO 3 (exclusão). Use as funções e os IDs que já aparecem no arquivo. Para cada tarefa: faça uma operação, confira a resposta, consulte novamente e explique ao colega o que mudou. Os controles de escrita começam indisponíveis; habilite-os ao concluir a tarefa correspondente. O submit já é interceptado para não recarregar a página nem simular cadastro pronto.

A referência completa é material do professor. O roteiro e o enunciado serão fornecidos separadamente; esta pasta contém apenas a base de código.
