const fs = require('fs');
const mysql = require('mysql2');

// Conexão com a Base de Dados usando Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
});

// Lê o ficheiro JSON
fs.readFile('ListaCAE.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Erro ao ler o ficheiro:', err);
        return;
    }

    try {
        // Converte o conteúdo para um array de objetos JSON
        const jsonData = JSON.parse(data);

        // Itera sobre cada objeto e verifica se os dados já existem antes de inserir
        jsonData.forEach((entry) => {
            const code = entry['Código'];
            const description = entry['Designação'];
            const status = 1; // Status padrão

            // Chama a função para verificar e inserir os dados
            verificarEInserirDados(code, description, status);
        });
    } catch (err) {
        console.error('Erro ao processar JSON:', err);
    }
});

// Função para verificar se o código já existe e inserir os dados se não existir
function verificarEInserirDados(code, description, status) {
    const checkSql = `SELECT COUNT(*) AS count FROM CAEs WHERE Code = ?`;
    pool.execute(checkSql, [code], (err, results) => {
        if (err) {
            console.error('Erro ao verificar o código:', err);
            return;
        }

        const count = results[0].count;
        if (count === 0) {
            // O código não existe, então inserimos os dados
            const insertSql = `INSERT INTO CAEs (Code, Description, Status) VALUES (?, ?, ?)`;
            pool.execute(insertSql, [code, description, status], (err, results) => {
                if (err) {
                    console.error('Erro ao inserir dados:', err);
                    return;
                }
                console.log(`Dados inseridos. Código: ${code}`);
            });
        } else {
            console.log(`Código ${code} já existe.`);
        }
    });
}

