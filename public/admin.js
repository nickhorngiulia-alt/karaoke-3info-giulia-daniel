"use strict";

// Roteiro: implemente uma tarefa por vez e confira o resultado na interface.
// catalogo.js já oferece consultarApi(caminho, opcoes), carregarMusicas(),
// limparSelecao(), mostrarMensagem(id, texto, erro) e definirCatalogoOcupado(bool).
// consultarApi retorna o JSON em sucesso e lança Error em HTTP/rede inválidos.
// estadoCatalogo.musicaSelecionada contém o detalhe da música selecionada.
// O evento musica-selecionada entrega esse detalhe em evento.detail, ou null.
// IDs: formulario-musica, nome, artista, salvar-musica, excluir-musica,
// nova-musica, titulo-formulario e estado-formulario.
// Os controles de escrita ficam desabilitados no HTML enquanto são tarefas.
// Não basta habilitar um botão: integre a operação e trate sua resposta.

function impedirEnvioPendente(evento) {
  evento.preventDefault();
  mostrarMensagem("estado-formulario", "Cadastro e edição ainda precisam ser integrados nas tarefas.");
}

function apresentarSelecao(evento) {
  let musica = evento.detail;
  document.getElementById("nome").value = musica ? musica.nome : "";
  document.getElementById("artista").value = musica ? musica.artista.nome : "";
  mostrarMensagem("estado-formulario", musica ? "Dados consultados. Edição e exclusão pendentes de integração." : "");
}

// TODO 1 — CADASTRO: criar salvarMusica(evento), bloquear envio padrão e duplo
// envio, ler nome/artista com trim e validar vazios. Usar consultarApi com POST
// /api/musicas, Content-Type application/json e JSON.stringify({nome, artista}).
// Sucesso: HTTP 201 retorna {id,nome,artista:{id,nome},partes:[]}; partes vazias
// são válidas. Limpar seleção/formulário, await carregarMusicas() e informar
// o resultado. Falhas devem mostrar erro, preservar campos e nunca sucesso.
// Substituir o listener impedirEnvioPendente e habilitar salvar-musica quando
// a integração estiver pronta. A API e o DAO de apoio já estão disponíveis.

// TODO 2 — EDIÇÃO: aproveitar apresentarSelecao para guardar o ID em edição,
// preencher os campos e mudar título/botão. Em salvarMusica, selecionar PUT
// /api/musicas/:id para uma música em edição, com o mesmo JSON. HTTP 200
// retorna o detalhe atualizado. Criar prepararCadastro para limparSelecao(),
// limpar campos e voltar ao modo POST; ligar e habilitar nova-musica.
// Durante o envio, desabilitar controles e usar definirCatalogoOcupado(true).
// Restaurar controles no finally; não perder os campos quando ocorrer falha.

// TODO 3 — EXCLUSÃO: criar excluirMusica(), exigir seleção e window.confirm,
// e enviar DELETE /api/musicas/:id somente após confirmar. HTTP 200 retorna
// {mensagem,musica}. Limpar seleção/formulário, await carregarMusicas() e
// mostrar resultado. Ligar excluir-musica e habilitá-lo apenas com seleção.
// Cancelar a confirmação não altera dados. Tratar falhas e envio duplicado.

document.getElementById("formulario-musica").addEventListener("submit", impedirEnvioPendente);
document.addEventListener("musica-selecionada", apresentarSelecao);
