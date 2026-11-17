// Testes HTTP locais com DAO de teste. Não conectam ao Supabase.
const test = require('node:test');
const assert = require('node:assert/strict');
const criarApp = require('../app');

function criarDaoTeste() {
    let proximoId = 2;
    const registros = new Map([[1, { id: 1, nome: 'Amostra', artista: { id: 1, nome: 'Turma' }, partes: [] }]]);
    return {
        async listarTodas() { return [...registros.values()].map(m => ({ ...m, totalPartes: m.partes.length })); },
        async buscarPorId(id) { return registros.get(id) || null; },
        async inserir(nome, artista) {
            const m = { id: proximoId++, nome, artista: { id: 1, nome: artista }, partes: [] };
            registros.set(m.id, m); return m;
        },
        async atualizar(id, nome, artista) {
            const m = registros.get(id); if (!m) return null;
            m.nome = nome; m.artista.nome = artista; return m;
        },
        async remover(id) { const m = registros.get(id) || null; registros.delete(id); return m; },
        async adicionarPartes(id, parte) { registros.get(id).partes.push(parte); return true; }
    };
}

async function abrir(t, dao = criarDaoTeste()) {
    const server = criarApp(dao).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port;
    return async function req(method, caminho, body) {
        const opcoes = { method };
        if (body !== undefined) {
            opcoes.headers = { 'Content-Type': 'application/json' };
            opcoes.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
        const r = await fetch(base + caminho, opcoes);
        const text = await r.text();
        let data; try { data = JSON.parse(text); } catch { data = text; }
        return { status: r.status, data };
    };
}

test('CRUD HTTP completo mantém o contrato nome/artista e permite música sem partes', async t => {
    const req = await abrir(t);
    const lista = await req('GET', '/api/musicas');
    assert.equal(lista.status, 200); assert.equal(lista.data[0].totalPartes, 0);
    assert.equal(lista.data[0].artista.nome, 'Turma');
    const criada = await req('POST', '/api/musicas', { nome: ' Nova ', artista: ' Grupo ' });
    assert.equal(criada.status, 201); assert.equal(criada.data.nome, 'Nova');
    assert.deepEqual(criada.data.partes, []); assert.equal(criada.data.artista.nome, 'Grupo');
    const url = '/api/musicas/' + criada.data.id;
    assert.equal((await req('GET', url)).data.nome, 'Nova');
    const alterada = await req('PUT', url, { nome: 'Revisada', artista: 'Turma' });
    assert.equal(alterada.status, 200); assert.equal(alterada.data.nome, 'Revisada');
    assert.equal((await req('DELETE', url)).data.musica.id, criada.data.id);
    assert.equal((await req('GET', url)).status, 404);
});

test('campos vazios, tipos inesperados e JSON inválido retornam 400', async t => {
    const req = await abrir(t);
    for (const body of [{ nome: ' ', artista: 'X' }, { nome: 'A', artista: ' ' }, { nome: 1, artista: 'X' }, {}, [], null]) {
        assert.equal((await req('POST', '/api/musicas', body)).status, 400);
        assert.equal((await req('PUT', '/api/musicas/1', body)).status, 400);
    }
    assert.equal((await req('POST', '/api/musicas', '{ "nome":')).status, 400);
});

test('IDs inválidos ou ausentes e rotas desconhecidas retornam 404 JSON', async t => {
    const req = await abrir(t);
    for (const id of ['abc', '-1', '1.5', '999']) {
        assert.equal((await req('GET', '/api/musicas/' + id)).status, 404);
        assert.equal((await req('PUT', '/api/musicas/' + id, { nome: 'A', artista: 'B' })).status, 404);
        assert.equal((await req('DELETE', '/api/musicas/' + id)).status, 404);
    }
    assert.equal((await req('GET', '/api/desconhecida')).data.erro, 'Rota não encontrada');
});

test('falha do DAO não vaza detalhes na resposta nem aparenta sucesso', async t => {
    const req = await abrir(t, { async listarTodas() { throw new Error('banco de teste indisponível'); } });
    const r = await req('GET', '/api/musicas');
    assert.equal(r.status, 500);
    assert.equal(r.data.erro, 'Não foi possível concluir a operação');
    assert.equal(JSON.stringify(r.data).includes('banco de teste'), false);
});

test('rota de partes mantém o contrato da atividade anterior', async t => {
    const req = await abrir(t);
    const r = await req('POST', '/api/musicas/1/partes', { letra: 'Texto original', tag: 'verso', tempoEspera: 100 });
    assert.equal(r.status, 201); assert.equal(r.data.partes[0].tempoEspera, 100);
    assert.equal((await req('POST', '/api/musicas/1/partes', { letra: 'X', tag: 'verso', tempoEspera: 0 })).status, 400);
});

test('verificador de URL exercita a API e remove somente o registro que criou', async t => {
    const dao = criarDaoTeste();
    const server = criarApp(dao).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const { verificarUrl } = await import('./verificar_url.mjs');
    const mensagem = await verificarUrl('http://127.0.0.1:' + server.address().port);
    assert.match(mensagem, /CRUD da URL conferido/);
    assert.deepEqual((await dao.listarTodas()).map(m => m.id), [1]);
});

module.exports = { criarDaoTeste };
