// Amostra de codigo

// Imports
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Conexão com a Base de Dados
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Ler o último NIF guardado no arquivo
function lerUltimoNif() {
    const arquivo = 'LastNIF';
    const NIF_MIN = 500000000;
    const NIF_MAX = 599999999;

    if (!fs.existsSync(arquivo)) {
        // Se o arquivo não existir, cria-o com um valor inicial
        fs.writeFileSync(arquivo, NIF_MIN.toString(), 'utf-8');
        console.log(`Arquivo ${arquivo} criado com valor inicial: ${NIF_MIN}`);
        return NIF_MIN;
    }
    
    try {
        let nifSalvo = parseInt(fs.readFileSync(arquivo, 'utf-8'), 10);
        console.log(`-------------------------------`);

        // Verifica se o NIF está fora dos limites permitidos
        if (nifSalvo < NIF_MIN || nifSalvo > NIF_MAX) {
            console.log(`NIF lido (${nifSalvo}) está fora do intervalo permitido. Definindo para ${NIF_MIN}.`);
            nifSalvo = NIF_MIN;
        }

        console.log(`Lendo o limite inferior do arquivo: ${nifSalvo}`);
        console.log(`-------------------------------`);
        return nifSalvo;

    } catch (error) {
        console.error(`Erro ao ler o arquivo ${arquivo}: ${error.message}`);
        console.log(`-------------------------------`);
        return NIF_MIN; // Valor padrão caso não consiga ler
    }
}

// Gerir NIF dentro dos intervalos Definidos
function generatePossibleNIFs(start, end) {
    let nifs = [];
    for (let i = start; i <= end; i++) {
        let nif = i.toString();
        if (nif.startsWith('5') && validaContribuinte(nif)) {
            nifs.push(nif);
        }
    }
    return nifs;
}

// Validação de NIF
function validaContribuinte(nif) {
    const checkArr = [9, 8, 7, 6, 5, 4, 3, 2];
    let total = 0;
    for (let i = 0; i < 8; i++) {
        total += nif[i] * checkArr[i];
    }
    const modulo11 = total % 11;
    const comparador = modulo11 < 2 ? 0 : 11 - modulo11;
    return nif[8] == comparador;
}

// Pesquisa do NIF
async function getCompanyInfo(nif) {
    const url = `https://www.einforma.pt/servlet/app/portal/ENTP/prod/ETIQUETA_EMPRESA_CONTRIBUINTE/nif/${nif}`;
    
    try {
        const { data } = await axios.get(url);
        console.log(`Buscando informações da empresa com NIF: ${nif}`);

        const $ = cheerio.load(data);
        const nomeEmpresa = $('span[itemprop="name"]').text().trim() || "N/A";

        if (nomeEmpresa === "N/A") {
            console.log(`Nenhum resultado para NIF: ${nif}`);
            console.log(`\n-------------------------------\n`);
            return;
        }

        // Verificar se a empresa está extinta, sem atividade, fusionada, em liquidação ou insolvente
        const estadosInativos = ['(EXTINTA)', '(SEM ATIVIDADE)', '(FUSIONADA)', '(EM LIQUIDAÇÃO)', '(INSOLVENTE)'];
        if (estadosInativos.some(estado => nomeEmpresa.includes(estado))) {
            console.log(`Empresa ${nomeEmpresa} está inativa.`);
            console.log(`\n-------------------------------\n`);
            return;
        }

        const nifValue = $('td:contains("NIF:") + td a').text().trim() || "N/A";
        const legal = $('td:contains("Forma Jurídica:") + td').text().trim() || "N/A";
        const description = $('td:contains("Descrição da Atividade:") + td').text().trim() || "N/A";

        // Inserindo os dados no MySQL
        try {
            const query = `INSERT INTO Companies (Name, Description, Legal, VAT, Created_at) VALUES (?, ?, ?, ?, NOW())`;
            await pool.execute(query, [nomeEmpresa, description, legal, nifValue]);
            console.log(`Empresa ${nomeEmpresa} inserida na Base de Dados.`);
        } catch (err) {
            console.error(`Erro ao inserir no MySQL para NIF ${nif}: ${err.message}`);
        }

        // Salvando o último NIF encontrado em um ficheiro
        salvarUltimoNif(nifValue);
        console.log(`\n-------------------------------\n`);

    } catch (error) {
        console.error(`Erro ao buscar informações da empresa com NIF ${nif}: ${error.message}`);
    }
}

// Guardar o último NIF processado
function salvarUltimoNif(nif) {
    fs.writeFileSync('LastNIF', nif.toString(), 'utf-8');
    console.log(`NIF ${nif} salvo no ficheiro LastNIF`);
}



// Executa a Função
(async () => {
    const limiteInferior = lerUltimoNif();
    const possibleNIFs = generatePossibleNIFs(limiteInferior, 599999999);

    for (const nif of possibleNIFs) {
        await getCompanyInfo(nif);
    }

    console.log("\nProcesso de busca de empresas concluído.\n");
})();
