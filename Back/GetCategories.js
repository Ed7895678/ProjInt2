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
    const sqlSelect = `SELECT Code AS ID, Description AS Name FROM caes WHERE LENGTH(Code) = 3`;
    const sqlCheck = `SELECT COUNT(*) AS count FROM categories WHERE ID = ?`;
    const sqlInsert = `INSERT INTO categories (ID, Name, Status, Source) VALUES (?, ?, 1, NULL)`;

    pool.query(sqlSelect, (err, results) => {
        if (err) {
            console.error('Erro ao buscar dados:', err);
            return;
        }

        results.forEach((entry) => {
            const { ID, Name } = entry;

            // Verifica se o ID já existe na tabela categories
            pool.execute(sqlCheck, [ID], (err, checkResults) => {
                if (err) {
                    console.error('Erro ao verificar duplicata:', err);
                    return;
                }

                const isDuplicate = checkResults[0].count > 0;
                if (!isDuplicate) {
                    // Insere na tabela categories caso o ID ainda não exista
                    pool.execute(sqlInsert, [ID, Name], (err) => {
                        if (err) {
                            console.error('Erro ao inserir dados:', err);
                            return;
                        }
                        console.log(`Dados inseridos com sucesso! ID: ${ID}.`);
                    });
                } else {
                    console.log(`Registro ignorado (duplicado).`);
                }
            });
        });
    });
}

// Chama a função para iniciar o processo
GetCategories();
