// Eduardo Santos
// Funções de Atualização da Base de Dados
const mysql = require('mysql2/promise');

// Configuração da pool de conexões
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password', 
    database: 'projint2', 
});

const { GetCaes } = require('./JS/GetCaes');
const { GetCategories } = require('./JS/GetCategories');
const { RaciusLinks } = require('./JS/RaciusLinksNifs');
const { EInforma } = require('./JS/ScrapEinforma');

resetStatus()
atualizarLinksRacius();
atualizarCaeCat();
atualizarEmpresas();

// Função para atualizar os links e nif's do Racius
async function atualizarLinksRacius() {
    try {
        // Função começa
        await setFunctionStatus('RaciusLinksNifs', '1');

        // Funções de Update
        console.log('A iniciar a atualização dos links do Racius...');
        const links = await RaciusLinks(); 
        console.log('Links do Racius atualizados.\n');

        // Função acaba
        await setFunctionStatus('RaciusLinksNifs', '0');
    } catch (erro) {
        console.error('Erro ao atualizar links do Racius:', erro);
    }
}




// Função para atualizar os CAE's
async function atualizarCaes() { 
    try {
        // Função começa
        await setFunctionStatus('Caes', '1');

        // Funções de Update
        console.log("A iniciar a atualização dos CAE's...");
        const caes = await GetCaes(); 
        console.log('CAEs atualizados.\n');

        // Função acaba
        await setFunctionStatus('Caes', '0');
    } catch (erro) {
        console.error('Erro ao atualizar os CAEs:', erro);
    }
}




// Função para atualizar as categorias
async function atualizarCategorias() {
    try {
        // Função começa
        await setFunctionStatus('Categorias', '1');

        // Funções de Update
        console.log('A iniciar a atualização das categorias...');
        const categorias = await GetCategories(); 
        console.log('Categorias atualizadas.\n');

        // Função acaba
        await setFunctionStatus('Categorias', '0');
    } catch (erro) {
        console.error('Erro ao atualizar categorias:', erro);
    }
}




// Função para atualizar Caes e Categorias
async function atualizarCaeCat() {
    try {
        // Função começa
        await setFunctionStatus('CaeCat', '1');

        // Funções de Update
        await atualizarCaes();
        await atualizarCategorias();

        // Função acaba
        await setFunctionStatus('CaeCat', '1');
    } catch (erro) {
        console.error("Erro ao realizar a atualização de Cae's ou Categorias:", erro);
    }
}




// Função para atualizar os dados do EInforma
async function atualizarEInforma() {
    try {
        // Função começa
        await setFunctionStatus('EInforma', '1');

        // Funções de Update
        console.log('A iniciar a atualização dos dados do EInforma...');
        const Einforma = await EInforma(); 
        console.log('Dados do EInforma atualizados.\n');

        // Função Acaba
        await setFunctionStatus('EInforma', '0');
    } catch (erro) {
        console.error('Erro ao atualizar dados do EInforma:', erro);
    }
}




// Função para atualizar Racius
async function atualizarRacius() {
    try {
        // Função começa
        await setFunctionStatus('Racius', '1');

        // Funções de Update
        console.log('A iniciar a atualização dos dados do Racius...');
        // Função do racius
        console.log("Dados do Racius atualizados.\n");

        // Função acaba
        await setFunctionStatus('Racius', '1');
    } catch (erro) {
        console.error("Erro ao realizar a atualização do Racius:", erro);
    }
}



// Função para atualizar tudo
async function atualizarEmpresas() {
    try {
        // Função começa
        await setFunctionStatus('Empresas', '1');

        // Funções de Update
        await atualizarEInforma();
        await atualizarRacius();

        // Função acaba
        await setFunctionStatus('Empresas', '0');
    } catch (erro) {
        console.error('Erro ao realizar a atualização de empresas:', erro);
    }
}




// Função auxiliar para atualizar o status na base de dados
async function setFunctionStatus(functionName, status) {
    try {
        // Conexão com a base de dados
        const connection = await pool.getConnection();

        // Atualizar o status na base de dados (escapando 'function')
        const query = 'UPDATE function_status SET status = ? WHERE `function` = ?';
        await connection.execute(query, [status, functionName]);

        connection.release();
    } catch (error) {
        console.error(`Erro ao atualizar o status da função ${functionName}:`, error);
    }
}

// Função auxiliar para atualizar o status na base de dados
async function resetStatus() {
    try {
        // Conexão com a base de dados
        const connection = await pool.getConnection();

        // Atualizar o status na base de dados (escapando 'function')
        const query = 'UPDATE function_status SET status = 0';
        await connection.execute(query);

        connection.release();
        console.error(`Status das Funções Resetados`);
    } catch (error) {
        console.error(`Erro ao fazer reset dos status:`, error);
    }
}
