const fs = require('fs');
const mysql = require('mysql2');

// Conexão com a Base de Dados usando Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Função para inserir dados na tabela CAEs (sem o campo ID)
function inserirDados(code, description, status) {
    const sql = `INSERT INTO CAEs (Code, Description, Status) VALUES (?, ?, ?)`;
    pool.execute(sql, [code, description, status], (err, results) => {
        if (err) {
            console.error('Erro ao inserir dados:', err);
            return;
        }
        console.log(`Dados inseridos com sucesso! Código: ${code}`);
    });
}

// Lê o ficheiro JSON
fs.readFile('listaCAE.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Erro ao ler o ficheiro:', err);
        return;
    }
    
    try {
        // Converte o conteúdo para um array de objetos JSON
        const jsonData = JSON.parse(data);

        // Itera sobre cada objeto e insere os dados na tabela
        jsonData.forEach((entry) => {
            const code = entry['Código'];
            const description = entry['Designação'];
            const status = 1; 

            // Chama a função para inserir os dados na tabela
            inserirDados(code, description, status);
        });
    } catch (err) {
        console.error('Erro ao processar JSON:', err);
    }
});
