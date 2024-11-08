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

// Função para carregar e inserir os CAEs de 3 dígitos como categorias, evitando duplicatas
function GetCategories() {
    const sqlSelect = `SELECT Code, Description AS Name FROM caes WHERE LENGTH(Code) = 3`;
    const sqlCheck = `SELECT COUNT(*) AS count FROM categories WHERE Code = ?`;
    const sqlInsert = `INSERT INTO categories (Description, Status, Source, Code) VALUES (?, 1, NULL, ?)`;

    pool.query(sqlSelect, (err, results) => {
        if (err) {
            console.error('Erro ao buscar dados:', err);
            return;
        }

        results.forEach((entry) => {
            const { Code, Name } = entry; // Code e Name agora referem-se ao campo de código e descrição

            // Verifica se o Code já existe na tabela categories
            pool.execute(sqlCheck, [Code], (err, checkResults) => {
                if (err) {
                    console.error('Erro ao verificar duplicata:', err);
                    return;
                }

                const isDuplicate = checkResults[0].count > 0;
                if (!isDuplicate) {
                    // Insere na tabela categories caso o Code ainda não exista
                    pool.execute(sqlInsert, [Name, Code], (err) => {
                        if (err) {
                            console.error('Erro ao inserir dados:', err);
                            return;
                        }
                        console.log(`Dados inseridos com sucesso! Code: ${Code}, Nome: ${Name}`);
                    });
                } else {
                    console.log(`Registro ignorado (duplicado). Code: ${Code}, Nome: ${Name}`);
                }
            });
        });
    });
}

// Chama a função para iniciar o processo
GetCategories();
