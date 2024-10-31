const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

// Função para verificar se o NIF já existe
async function nifExists(nif, connection) {
  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM raciuslinks WHERE NIF = ?', [nif]);
    return rows[0].count > 0;
  } catch (err) {
    console.error('Erro ao verificar o NIF no banco de dados:', err);
    return false;
  }
}

// Função para inserir os dados no MySQL
async function insertIntoDatabase(nif, link, connection) {
  try {
    const exists = await nifExists(nif, connection);

    if (exists) {
      console.log(`NIF ${nif} já existe na base de dados.`);
    } else {
      const query = 'INSERT INTO raciuslinks (NIF, URL, Type) VALUES (?, ?, ?)';
      await connection.execute(query, [nif, link, 1]); // Type fixado em 1
      console.log(`Inserido com sucesso: NIF ${nif}, Link ${link}`);
    }
  } catch (err) {
    console.error('Erro ao inserir no banco de dados:', err);
  }
}

// Função para processar o arquivo e enviar os dados para o MySQL
async function processFile(inputFile) {
  // Conectar ao banco de dados MySQL
  const connection = await mysql.createConnection({
    host: 'localhost', // Seu host do MySQL
    user: 'root',      // Seu usuário do MySQL
    password: '',      // Sua senha do MySQL (se houver)
    database: 'projint2' // Nome do banco de dados
  });

  // Lê o arquivo de entrada
  fs.readFile(inputFile, 'utf8', async (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo:', err);
      return;
    }

    // Divide as linhas do arquivo de texto
    const lines = data.split('\n').filter(line => line.trim() !== '');

    // Processa cada par de linhas (link e NIF)
    for (let i = 0; i < lines.length; i += 2) {
      const link = lines[i];         // A primeira linha é o link
      const nif = lines[i + 1];      // A linha seguinte é o NIF

      if (link && nif) {
        // Insere no banco de dados com Type fixado em 1
        await insertIntoDatabase(nif.trim(), link.trim(), connection);
      } else {
        console.log('Dados incompletos encontrados, pulando...');
      }
    }

    // Fecha a conexão com o banco de dados
    await connection.end();
    console.log('Conexão com o banco de dados encerrada.');
  });
}

// Chama a função passando o arquivo de entrada
const inputFilePath = path.join(__dirname, 'raciusLinks.txt'); // Caminho para o arquivo de entrada
processFile(inputFilePath);
