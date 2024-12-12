// Eduardo Santos
// Funções de Atualização da Base de Dados

const { GetCaes } = require('./JS/GetCaes');
const { GetCategories } = require('./JS/GetCategories');
const { RaciusLinks } = require('./JS/RaciusLinksNifs');
const { EInforma } = require('./JS/ScrapEinforma');


// Função para atualizar os CAE's
async function atualizarCaes() { 
    try {
        console.log('A iniciar a atualização dos CAEs...');
        const caes = await GetCaes(); 
        console.log('CAEs atualizados:');
    } catch (erro) {
        console.error('Erro ao atualizar os CAEs:', erro);
    }
}

// Função para atualizar as categorias
async function atualizarCategorias() {
    try {
        console.log('A iniciar a atualização das categorias...');
        const categorias = await GetCategories(); 
        console.log('Categorias atualizadas:');
    } catch (erro) {
        console.error('Erro ao atualizar categorias:', erro);
    }
}

// Função para atualizar os links e nif's do Racius
async function atualizarLinksRacius() {
    try {
        console.log('A iniciar a atualização dos links do Racius...');
        const links = await RaciusLinks(); 
        console.log('Links do Racius atualizados:');
    } catch (erro) {
        console.error('Erro ao atualizar links do Racius:', erro);
    }
}

// Função para atualizar os dados do EInforma
async function atualizarEInforma() {
    try {
        console.log('A iniciar a atualização dos dados do EInforma...');
        const Einforma = await EInforma(); 
        console.log('Dados do EInforma atualizados:');
    } catch (erro) {
        console.error('Erro ao atualizar dados do EInforma:', erro);
    }
}

// Função para atualizar Caes e Categorias
async function atualizarCaeCat() {
    try {
        await atualizarCaes();
        await atualizarCategorias();
        console.log("Atualização de Cae's concluída!");
    } catch (erro) {
        console.error("Erro ao realizar a atualização de Cae's:", erro);
    }
}

// Função para atualizar tudo
async function atualizarEmpresas() {
    try {
        await atualizarEInforma();
        // await atualizarRacius();
        console.log('Atualização de empresas concluída!');
    } catch (erro) {
        console.error('Erro ao realizar a atualização de empresas:', erro);
    }
}

