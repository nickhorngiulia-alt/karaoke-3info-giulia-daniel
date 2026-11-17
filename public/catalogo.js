"use strict";

// Contrato compartilhado com admin.js: consultarApi lança Error em falhas;
// carregarMusicas retorna true/false; limparSelecao cancela consulta e player;
// definirCatalogoOcupado bloqueia trocas durante uma gravação.
// O evento musica-selecionada entrega em detail a música completa ou null.
// GET /api/musicas: array {id, nome, artista:{id,nome}, totalPartes}.
// GET /api/musicas/:id: {id, nome, artista:{id,nome}, partes:[...]}.
let estadoCatalogo = {
  musicaSelecionada: null,
  idSelecionado: null,
  versaoSelecao: 0,
  versaoLista: 0,
  consultaDetalhe: null,
  temporizador: null,
  versaoPlayer: 0,
  reproduzindo: false,
  ocupado: false
};

async function consultarApi(caminho, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(caminho, opcoes);
  } catch (erro) {
    if (erro.name === "AbortError") throw erro;
    throw new Error("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.");
  }
  let dados;
  try {
    dados = await resposta.json();
  } catch (erro) {
    throw new Error("O servidor enviou uma resposta inválida. Tente novamente.");
  }
  if (!resposta.ok) {
    throw new Error(typeof dados.erro === "string" ? dados.erro : "Não foi possível concluir a solicitação.");
  }
  return dados;
}

function mostrarMensagem(id, mensagem, erro = false) {
  let elemento = document.getElementById(id);
  elemento.textContent = mensagem;
  elemento.classList.toggle("erro", erro);
}

function atualizarBotoesLista() {
  let botoes = document.querySelectorAll("#lista-musicas button");
  for (let botao of botoes) {
    botao.disabled = estadoCatalogo.ocupado;
    botao.setAttribute("aria-pressed", String(botao.dataset.id === String(estadoCatalogo.idSelecionado)));
  }
}

function definirCatalogoOcupado(ocupado) {
  estadoCatalogo.ocupado = ocupado;
  if (ocupado) {
    // Respostas iniciadas antes da gravação não devem repor dados antigos.
    estadoCatalogo.versaoLista++;
    document.getElementById("lista-musicas").setAttribute("aria-busy", "false");
    if (estadoCatalogo.consultaDetalhe) {
      estadoCatalogo.versaoSelecao++;
      estadoCatalogo.consultaDetalhe.abort();
      estadoCatalogo.consultaDetalhe = null;
      estadoCatalogo.idSelecionado = null;
      mostrarMensagem("estado-detalhe", "");
    }
  }
  document.getElementById("atualizar-lista").disabled = ocupado;
  atualizarBotoesLista();
}

async function carregarMusicas() {
  let versao = ++estadoCatalogo.versaoLista;
  mostrarMensagem("estado-lista", "Carregando catálogo…");
  document.getElementById("lista-musicas").setAttribute("aria-busy", "true");
  try {
    let musicas = await consultarApi("/api/musicas");
    if (versao !== estadoCatalogo.versaoLista) return false;
    if (!Array.isArray(musicas)) throw new Error("Não foi possível ler o catálogo recebido.");
    let lista = document.getElementById("lista-musicas");
    lista.replaceChildren();
    for (let musica of musicas) {
      let item = document.createElement("li");
      let botao = document.createElement("button");
      botao.type = "button";
      botao.className = "musica";
      botao.dataset.id = musica.id;
      let nome = document.createElement("strong");
      nome.textContent = musica.nome;
      let artista = document.createElement("span");
      artista.textContent = musica.artista.nome;
      let partes = document.createElement("span");
      partes.textContent = musica.totalPartes > 0 ? "Com letra" : "Sem partes para reprodução";
      botao.append(nome, artista, partes);
      botao.addEventListener("click", function abrirMusica() {
        selecionarMusica(musica.id);
      });
      item.append(botao);
      lista.append(item);
    }
    if (estadoCatalogo.idSelecionado !== null && !musicas.some(function corresponde(musica) {
      return String(musica.id) === String(estadoCatalogo.idSelecionado);
    })) limparSelecao();
    atualizarBotoesLista();
    mostrarMensagem("estado-lista", musicas.length === 0 ? "Nenhuma música cadastrada." : "Selecione uma música para consultar.");
    return true;
  } catch (erro) {
    if (versao !== estadoCatalogo.versaoLista) return false;
    document.getElementById("lista-musicas").replaceChildren();
    limparSelecao();
    mostrarMensagem("estado-lista", erro.message + " Use Atualizar para tentar novamente.", true);
    return false;
  } finally {
    if (versao === estadoCatalogo.versaoLista) document.getElementById("lista-musicas").setAttribute("aria-busy", "false");
  }
}

function avisarSelecao() {
  document.dispatchEvent(new CustomEvent("musica-selecionada", { detail: estadoCatalogo.musicaSelecionada }));
}

function limparSelecao() {
  estadoCatalogo.versaoSelecao++;
  if (estadoCatalogo.consultaDetalhe) estadoCatalogo.consultaDetalhe.abort();
  estadoCatalogo.consultaDetalhe = null;
  pararReproducao(false);
  estadoCatalogo.musicaSelecionada = null;
  estadoCatalogo.idSelecionado = null;
  document.getElementById("titulo-musica").textContent = "Selecione uma música";
  document.getElementById("artista-musica").textContent = "Escolha um item do catálogo para consultar.";
  document.getElementById("parte-atual").textContent = "Aguardando seleção";
  document.getElementById("letra-atual").textContent = "A letra aparecerá aqui.";
  document.getElementById("tocar").disabled = true;
  mostrarMensagem("estado-detalhe", "");
  atualizarBotoesLista();
  avisarSelecao();
}

async function selecionarMusica(id) {
  if (estadoCatalogo.ocupado) return;
  limparSelecao();
  estadoCatalogo.idSelecionado = id;
  let versao = estadoCatalogo.versaoSelecao;
  let controle = new AbortController();
  estadoCatalogo.consultaDetalhe = controle;
  atualizarBotoesLista();
  mostrarMensagem("estado-detalhe", "Carregando música…");
  try {
    let musica = await consultarApi("/api/musicas/" + encodeURIComponent(id), { signal: controle.signal });
    if (versao !== estadoCatalogo.versaoSelecao) return;
    if (!Array.isArray(musica.partes)) throw new Error("Não foi possível ler as partes desta música.");
    musica.partes.sort(function ordenarPartes(a, b) { return a.ordem - b.ordem; });
    estadoCatalogo.musicaSelecionada = musica;
    document.getElementById("titulo-musica").textContent = musica.nome;
    document.getElementById("artista-musica").textContent = musica.artista.nome;
    document.getElementById("parte-atual").textContent = musica.partes.length ? "Pronta para tocar" : "Sem letra";
    document.getElementById("letra-atual").textContent = musica.partes.length ? "Use Tocar para acompanhar a letra." : "Esta música ainda não tem partes para reprodução.";
    document.getElementById("tocar").disabled = musica.partes.length === 0;
    mostrarMensagem("estado-detalhe", musica.partes.length ? "" : "Esta música ainda não tem partes para reprodução.");
    avisarSelecao();
  } catch (erro) {
    if (erro.name === "AbortError" || versao !== estadoCatalogo.versaoSelecao) return;
    limparSelecao();
    mostrarMensagem("estado-detalhe", erro.message, true);
  } finally {
    if (versao === estadoCatalogo.versaoSelecao) estadoCatalogo.consultaDetalhe = null;
  }
}

function pararReproducao(informar = true) {
  clearTimeout(estadoCatalogo.temporizador);
  estadoCatalogo.temporizador = null;
  estadoCatalogo.versaoPlayer++;
  estadoCatalogo.reproduzindo = false;
  let musica = estadoCatalogo.musicaSelecionada;
  document.getElementById("tocar").disabled = !musica || musica.partes.length === 0;
  document.getElementById("parar").disabled = true;
  mostrarMensagem("estado-player", informar ? "Reprodução interrompida. Tocar reinicia a sequência." : "");
}

function mostrarParte(indice, versao) {
  if (versao !== estadoCatalogo.versaoPlayer || !estadoCatalogo.reproduzindo) return;
  let musica = estadoCatalogo.musicaSelecionada;
  if (!musica) return;
  if (indice >= musica.partes.length) {
    estadoCatalogo.reproduzindo = false;
    estadoCatalogo.temporizador = null;
    document.getElementById("tocar").disabled = false;
    document.getElementById("parar").disabled = true;
    mostrarMensagem("estado-player", "Reprodução concluída.");
    return;
  }
  let parte = musica.partes[indice];
  document.getElementById("parte-atual").textContent = "Parte " + (indice + 1) + " de " + musica.partes.length + (parte.tag ? " · " + parte.tag : "");
  document.getElementById("letra-atual").textContent = parte.letra;
  let espera = Number(parte.tempoEspera);
  if (!Number.isFinite(espera) || espera < 0) espera = 0;
  estadoCatalogo.temporizador = setTimeout(function avancarParte() {
    mostrarParte(indice + 1, versao);
  }, espera);
}

function tocarMusica() {
  let musica = estadoCatalogo.musicaSelecionada;
  if (!musica || musica.partes.length === 0 || estadoCatalogo.reproduzindo) return;
  pararReproducao(false);
  estadoCatalogo.reproduzindo = true;
  document.getElementById("tocar").disabled = true;
  document.getElementById("parar").disabled = false;
  mostrarMensagem("estado-player", "Reproduzindo a sequência da letra.");
  mostrarParte(0, estadoCatalogo.versaoPlayer);
}

function atualizarCatalogo() {
  if (!estadoCatalogo.ocupado) carregarMusicas();
}

function interromperPlayer() {
  pararReproducao();
}

document.getElementById("atualizar-lista").addEventListener("click", atualizarCatalogo);
document.getElementById("tocar").addEventListener("click", tocarMusica);
document.getElementById("parar").addEventListener("click", interromperPlayer);
carregarMusicas();
