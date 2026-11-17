// Programação III — IFSul Passo Fundo. Rotas pedem dados ao DAO.
const express = require('express');
const path = require('node:path');
const { Parte } = require('./karaoke/parte');

function criarApp(musicaDAO) {
    const app = express();
    app.use(express.json({ limit: '64kb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    function camposMusica(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
        if (typeof body.nome !== 'string' || typeof body.artista !== 'string') return null;
        const nome = body.nome.trim();
        const artista = body.artista.trim();
        return nome && artista ? { nome, artista } : null;
    }

    function idValido(id) {
        return Number.isSafeInteger(id) && id > 0;
    }

    app.get('/api/musicas', async (req, res, next) => {
        try {
            const musicas = await musicaDAO.listarTodas();
            res.json(musicas.map(function (musica) {
                return { id: musica.id, nome: musica.nome, artista: musica.artista, totalPartes: musica.totalPartes };
            }));
        } catch (erro) { next(erro); }
    });

    app.get('/api/musicas/:id', async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            const musica = idValido(id) ? await musicaDAO.buscarPorId(id) : null;
            if (!musica) return res.status(404).json({ erro: 'Música não encontrada' });
            res.json(musica);
        } catch (erro) { next(erro); }
    });

    app.post('/api/musicas', async (req, res, next) => {
        try {
            const campos = camposMusica(req.body);
            if (!campos) return res.status(400).json({ erro: 'Informe nome e artista como textos não vazios' });
            const musica = await musicaDAO.inserir(campos.nome, campos.artista);
            res.status(201).json(musica);
        } catch (erro) { next(erro); }
    });

    app.put('/api/musicas/:id', async (req, res, next) => {
        try {
            const campos = camposMusica(req.body);
            if (!campos) return res.status(400).json({ erro: 'Informe nome e artista como textos não vazios' });
            const id = Number(req.params.id);
            const musica = idValido(id) ? await musicaDAO.atualizar(id, campos.nome, campos.artista) : null;
            if (!musica) return res.status(404).json({ erro: 'Música não encontrada' });
            res.json(musica);
        } catch (erro) { next(erro); }
    });

    app.delete('/api/musicas/:id', async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            const musica = idValido(id) ? await musicaDAO.remover(id) : null;
            if (!musica) return res.status(404).json({ erro: 'Música não encontrada' });
            res.json({ mensagem: 'Música removida', musica });
        } catch (erro) { next(erro); }
    });

    // Mantém o ponto de integração de partes já conhecido; não é tarefa do núcleo.
    app.post('/api/musicas/:id/partes', async (req, res, next) => {
        try {
            const body = req.body;
            if (!body || typeof body.letra !== 'string' || !body.letra.trim()
                || typeof body.tag !== 'string' || !body.tag.trim()
                || !Number.isInteger(body.tempoEspera) || body.tempoEspera <= 0) {
                return res.status(400).json({ erro: 'Informe letra, tag e tempoEspera inteiro positivo' });
            }
            const id = Number(req.params.id);
            if (!idValido(id) || !await musicaDAO.buscarPorId(id)) {
                return res.status(404).json({ erro: 'Música não encontrada' });
            }
            await musicaDAO.adicionarPartes(id, new Parte(body.letra, body.tempoEspera, body.tag));
            res.status(201).json(await musicaDAO.buscarPorId(id));
        } catch (erro) { next(erro); }
    });

    app.use('/api', function (req, res) {
        res.status(404).json({ erro: 'Rota não encontrada' });
    });

    app.use(function (erro, req, res, next) {
        if (erro.type === 'entity.parse.failed') {
            return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
        }
        if (erro.type === 'entity.too.large') {
            return res.status(413).json({ erro: 'Corpo da requisição muito grande' });
        }
        console.error('Falha na API:', erro.message);
        res.status(500).json({ erro: 'Não foi possível concluir a operação' });
    });
    return app;
}

// Importar criarApp nos testes não inicia servidor nem conecta ao banco.
if (require.main === module) {
    const musicaDAO = require('./karaoke/DAO/MusicaDAO');
    const app = criarApp(musicaDAO);
    const porta = process.env.PORT || 3000;
    app.listen(porta, function () { console.log('Karaokê disponível na porta ' + porta); });
}
module.exports = criarApp;
