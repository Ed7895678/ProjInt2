// Imports
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Scrapping
async function getCompanyInfo(nif) {
    const url = `https://www.einforma.pt/servlet/app/portal/ENTP/prod/ETIQUETA_EMPRESA_CONTRIBUINTE/nif/${nif}`;
    
    try {
        // Pesquisa com o NIF aprovado
        const { data } = await axios.get(url);
        console.log(`Buscando informações da empresa com NIF: ${nif}`);

        const $ = cheerio.load(data);
        const nomeEmpresa = $('span[itemprop="name"]').text().trim() || "N/A";

        // Se não existir nome, Empresa não existe
        if (nomeEmpresa === "N/A") {
            console.log(`Nenhum resultado para NIF: ${nif}`);
            console.log(`\n-------------------------------\n`);
            return;
        }

        // Retira empresas que não estejam em atividade
        const estadosInativos = ['(EXTINTA)', '(SEM ATIVIDADE)', '(FUSIONADA)', '(EM LIQUIDAÇÃO)', '(INSOLVENTE)'];
        if (estadosInativos.some(estado => nomeEmpresa.includes(estado))) {
            console.log(`Empresa ${nomeEmpresa} está inativa.`);
            console.log(`\n-------------------------------\n`);
            return;
        }

        // Obtém NIF
        const nifValue = $('td:contains("NIF:") + td a').text().trim() || "N/A";

        // Obtém DUNS
        const dunsValue = $('td:contains("DUNS:") + td').text().trim() || "N/A";

        // Obtém Morada
        const moradaEmpresa = $('td:contains("Morada:") + td').text().trim() || "N/A";

        // Obtém "Codigo Postal" em inteiro
        const codigoPostalFull = $('td:contains("Código Postal:") + td').text().trim() || "N/A";

        // Declaração de partes separados do Codigo Postal
        let codigoPostalNumerico = "N/A";
        let localizacaoCodigoPostal = "N/A";

        // Divide o Valor inteiro de "Codigo Postal" em duas partes: Zipcode e Location
        if (codigoPostalFull !== "N/A" && codigoPostalFull.includes('-')) {

            // Divide o Valor Inteiro
            const partesCodigoPostal = codigoPostalFull.split(' ');
            // Obtém Codigo Postal
            codigoPostalNumerico = partesCodigoPostal[0].trim();
            // Obtém Localização
            localizacaoCodigoPostal = partesCodigoPostal.slice(1).join(' ').trim();
        }

        // Inserção de dados na tabela Companies
        let idCompany;
        try {
            // Query de criação para tabelas
            const query = `INSERT INTO Companies (Name, DUNS, VAT, Created_at, Updated_at) VALUES (?, ?, ?, NOW(), NOW())`;
            const [result] = await pool.execute(query, [nomeEmpresa, dunsValue, nifValue]); 

            // Procura id da empresa na base de dados recém criada para usar de seguida
            idCompany = result.insertId;

            // Consola
            console.log(`Companies: Dados inseridos com sucesso.`);
        } catch (err) {
            console.error(`Erro ao inserir na tabela Companies: ${err.message}`);
            return; 
        }

        // Inserção de dados na tabela Brands
        let idBrand;
        try {
            // Query de criação para tabelas
            const query = `INSERT INTO Brands (Name, VAT, Created_at, Updated_at, IDCompany) VALUES (?, ?, NOW(), NOW(), ?)`;
            const [result] = await pool.execute(query, [nomeEmpresa, nifValue, idCompany]);

            // Procura id da marca na base de dados recém criada para usar de seguida
            idBrand = result.insertId;

            console.log(`Brands: Dados inseridos com sucesso.`);
        } catch (err) {
            console.error(`Erro ao inserir na tabela Brands: ${err.message}`);
            return;
        }

        // Verificar se IDBrand foi inserido corretamente
        if (!idBrand) {
            console.error('Erro ao buscar o IDBrand.');
            return;
        }

        // Inserção de dados na tabela Addresses 
        try {
            // Query de criação para tabelas
            const addressQuery = `INSERT INTO addresses 
            (Address, Zipcode, Location, Country, Status, Created_at, Updated_at, IDBrand) 
            VALUES (?, ?, ?, 'Portugal', 1, NOW(), NOW(), ?)`;
            await pool.execute(addressQuery, [moradaEmpresa, codigoPostalNumerico, localizacaoCodigoPostal, idBrand]);

            // Consola
            console.log(`Addresses: Dados inseridos com sucesso.`);
        } catch (err) {
            console.error(`Erro ao inserir na tabela Addresses: ${err.message}`);
        }

        // CAE //

        // Obter CAE 
        const atividades = [];
        $('td:contains("Atividade (CAE):") + td').each((i, element) => {

            // Captura o código do CAE sem designação
            const CaeCode = $(element).text().split(' - ')[0].trim();
            atividades.push(CaeCode);
        });

        // Para cada código CAE, obtém-se o ID correspondente na tabela Caes para inserir na tabela caes_companies em conjunto com o ID de empresa
        for (const CaeCode of atividades) {
            try {
                // Query de busca
                const query = `SELECT id FROM Caes WHERE code = ?`;
                const [rows] = await pool.execute(query, [CaeCode]);

                if (rows.length > 0) {
                    const caeId = rows[0].id;

                    // Inserir na tabela caes_companies
                    try {
                        // Query de criação para tabelas
                        const insertQuery = `INSERT INTO caes_companies (IDCompany, IDCae) VALUES (?, ?)`;
                        await pool.execute(insertQuery, [idCompany, caeId]);

                        console.log(`Caes_Companies: Coneção da empresa ${idCompany} e CAE ${caeId} completa.`);
                    } catch (err) {
                        console.error(`Erro ao inserir na tabela caes_companies: ${err.message}`);
                    }
                } else {
                    // CAE não existe na base de Dados
                    console.log(`Código CAE: ${CaeCode} não existe na tabela Caes.`);
                }
            } catch (err) {
                console.error(`Erro ao buscar o ID do CAE da Base de Dados ${CaeCode}: ${err.message}`);
            }
        }

        // Guardar ultimo NIF para continuar depois
        salvarUltimoNif(nifValue);
        console.log(`\n-------------------------------\n`);

    } catch (error) {
        // Erro na pesquisa do NIF
        console.error(`Erro ao buscar informações da empresa com NIF ${nif}: ${error.message}`);
    }
}



// Executa a Função
(async () => {
    const limiteInferior = lerUltimoNif();
    const possibleNIFs = generatePossibleNIFs(limiteInferior, 599999999);

    for (const nif of possibleNIFs) {
        await getCompanyInfo(nif);
    }

    // Processo Completo
    console.log("\nProcesso de busca de empresas concluído.\n");
})();

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

// Guardar o último NIF processado
function salvarUltimoNif(nif) {
    fs.writeFileSync('LastNIF', nif.toString(), 'utf-8');
}












