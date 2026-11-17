// Executar somente na aplicação de demonstração da própria dupla.
// Cria um registro identificado e remove apenas esse registro no final.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function verificarUrl(endereco) {
    const base = new URL(endereco);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
        throw new Error('Informe uma URL HTTP/HTTPS sem credenciais');
    }
    let idCriado = null;
    async function requisitar(metodo, caminho, corpo) {
        const resposta = await fetch(new URL(caminho, base), {
            method: metodo,
            headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
            body: corpo === undefined ? undefined : JSON.stringify(corpo),
            signal: AbortSignal.timeout(15000)
        });
        return { status: resposta.status, dados: await resposta.json() };
    }
    try {
        const lista = await requisitar('GET', '/api/musicas');
        assert.equal(lista.status, 200);
        assert.ok(Array.isArray(lista.dados), 'A listagem precisa ser um array');
        const artista = lista.dados[0]?.artista?.nome;
        assert.ok(artista, 'Prepare primeiro a amostra de demonstração: o teste reutiliza um artista existente');
        const nome = 'Teste integrador ' + randomUUID();
        const criada = await requisitar('POST', '/api/musicas', { nome, artista });
        assert.equal(criada.status, 201);
        idCriado = criada.dados.id;
        assert.ok(Number.isSafeInteger(idCriado));
        assert.equal(criada.dados.nome, nome);
        assert.deepEqual(criada.dados.partes, []);
        const caminho = '/api/musicas/' + idCriado;
        assert.equal((await requisitar('GET', caminho)).dados.nome, nome);
        const alterada = await requisitar('PUT', caminho, { nome: nome + ' revisado', artista });
        assert.equal(alterada.status, 200);
        assert.equal((await requisitar('GET', caminho)).dados.nome, nome + ' revisado');
        assert.equal((await requisitar('POST', '/api/musicas', { nome: ' ', artista })).status, 400);
        const removida = await requisitar('DELETE', caminho);
        assert.equal(removida.status, 200);
        assert.equal((await requisitar('GET', caminho)).status, 404);
        idCriado = null;
        return 'CRUD da URL conferido. Persistência após reinício e interface exigem verificações próprias.';
    } finally {
        if (idCriado !== null) {
            const limpeza = await requisitar('DELETE', '/api/musicas/' + idCriado);
            if (![200, 404].includes(limpeza.status)) throw new Error('Não foi possível remover o registro de teste ' + idCriado);
        }
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        if (!process.argv[2]) throw new Error('Uso: npm run verificar-url -- https://SUA-APLICACAO');
        console.log(await verificarUrl(process.argv[2]));
    } catch (erro) {
        console.error('Verificação não concluída:', erro.message);
        process.exitCode = 1;
    }
}
