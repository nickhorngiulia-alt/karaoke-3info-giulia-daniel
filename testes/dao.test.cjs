// Contrato dos DAOs com respostas simuladas do cliente Supabase, sem rede.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const chamadas = [];
let respostas = [];
const cliente = { from(tabela) {
    const operacao = { tabela, passos: [] }; chamadas.push(operacao);
    const consulta = {};
    for (const nome of ['select', 'order', 'eq', 'maybeSingle', 'single', 'insert', 'update', 'delete', 'limit']) {
        consulta[nome] = function (...args) { operacao.passos.push([nome, ...args]); return consulta; };
    }
    consulta.then = function (resolve, reject) {
        if (!respostas.length) return Promise.reject(new Error('Resposta de teste não preparada')).then(resolve, reject);
        return Promise.resolve(respostas.shift()).then(resolve, reject);
    };
    return consulta;
} };
const caminhoCliente = require.resolve('../supabaseClient');
const moduloCliente = new Module(caminhoCliente);
moduloCliente.exports = cliente; moduloCliente.loaded = true;
require.cache[caminhoCliente] = moduloCliente;
const musicaDAO = require('../karaoke/DAO/MusicaDAO');
const artistaDAO = require('../karaoke/DAO/ArtistaDAO');
const parteDAO = require('../karaoke/DAO/ParteDAO');
function preparar(...dados) { chamadas.length = 0; respostas = dados.map(data => ({ data, error: null })); }

test('listagem mapeia artista e contagem; seleção e ordenação são explícitas', async () => {
    preparar([{ id: 7, nome: 'Amostra', artista: { id: 3, nome: 'Turma' }, partes: [{ count: 2 }] }]);
    const lista = await musicaDAO.listarTodas();
    assert.equal(lista[0].artista.nome, 'Turma'); assert.equal(lista[0].totalPartes, 2);
    assert.ok(chamadas[0].passos.some(p => p[0] === 'select' && p[1].includes('partes(count)')));
    assert.ok(chamadas[0].passos.some(p => p[0] === 'order' && p[1] === 'id'));
});

test('busca usa ParteDAO e traduz tempo_espera para tempoEspera', async () => {
    preparar({ id: 7, nome: 'Amostra', artista: { id: 3, nome: 'Turma' } }, [{ id: 9, ordem: 0, letra: 'Texto', tempo_espera: 100, tag: 'verso' }]);
    const musica = await musicaDAO.buscarPorId(7);
    assert.equal(musica.partes[0].tempoEspera, 100); assert.equal(musica.partes[0].ordem, 0);
    assert.equal(chamadas[1].tabela, 'partes');
    assert.ok(chamadas[1].passos.some(p => p[0] === 'order' && p[1] === 'ordem'));
});

test('busca ausente retorna null; ID não numérico nem consulta', async () => {
    preparar(null); assert.equal(await musicaDAO.buscarPorId(999), null);
    preparar(); assert.equal(await musicaDAO.buscarPorId(NaN), null); assert.equal(chamadas.length, 0);
});

test('inserção reaproveita artista existente e aceita partes vazias', async () => {
    preparar({ id: 3, nome: 'Turma' }, { id: 7, nome: 'Nova' });
    const musica = await musicaDAO.inserir('Nova', 'Turma');
    assert.equal(musica.id, 7); assert.equal(musica.artista.id, 3); assert.deepEqual(musica.partes, []);
    assert.deepEqual(chamadas[1].passos.find(p => p[0] === 'insert')[1], { nome: 'Nova', artista_id: 3 });
});

test('artista inexistente é criado e mapeado', async () => {
    preparar(null, { id: 5, nome: 'Grupo' });
    const artista = await artistaDAO.buscarOuCriar('Grupo');
    assert.equal(artista.id, 5); assert.equal(artista.nome, 'Grupo');
});

test('parte usa maior ordem + 1 e escreve snake_case no banco', async () => {
    preparar({ ordem: 4 }, { id: 9, ordem: 5, letra: 'Texto', tempo_espera: 100, tag: 'verso' });
    const parte = await parteDAO.inserir(7, { letra: 'Texto', tempoEspera: 100, tag: 'verso' });
    assert.equal(parte.ordem, 5);
    const dados = chamadas[1].passos.find(p => p[0] === 'insert')[1];
    assert.deepEqual(dados, { musica_id: 7, ordem: 5, letra: 'Texto', tempo_espera: 100, tag: 'verso' });
});

test('falha retornada pelo cliente vira exceção no DAO', async () => {
    chamadas.length = 0; respostas = [{ data: null, error: { message: 'falha controlada' } }];
    await assert.rejects(musicaDAO.listarTodas(), /Erro ao listar músicas: falha controlada/);
});
