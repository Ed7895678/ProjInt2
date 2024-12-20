const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { atualizarLinksRacius, atualizarCaes, atualizarCategorias, atualizarEmails, atualizarNumeros, atualizarEInforma, atualizarRacius, resetStatus } = require('./EmprelisDB');

app.use(bodyParser.json());

// Rota para executar funções específicas
app.post('/execute_function', async (req, res) => {
    const { functionName } = req.body;

    try {
        // Mapear o nome da função para as funções disponíveis
        const functionsMap = {
            atualizarLinksRacius,
            atualizarCaes,
            atualizarCategorias,
            atualizarEmails,
            atualizarNumeros,
            atualizarEInforma,
            atualizarRacius,
            resetStatus,
        };

        if (functionsMap[functionName]) {
            await functionsMap[functionName](); // Executar a função correspondente
            return res.status(200).json({ success: true, message: `Função ${functionName} executada com sucesso.` });
        } else {
            return res.status(400).json({ success: false, message: `Função ${functionName} não encontrada.` });
        }
    } catch (error) {
        console.error(`Erro ao executar a função ${functionName}:`, error);
        return res.status(500).json({ success: false, message: 'Erro ao executar a função.', error });
    }
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
