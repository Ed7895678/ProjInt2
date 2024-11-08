const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise');
const UpdateDatabase = require('./UpdateDatabase');

processarEmpresas();

async function processarEmpresas() {
    try {
        // Conectar à base de dados e buscar todos os NIFs ordenados por ordem crescente
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'password', 
            database: 'projint2'
        });

        // Query para buscar todos os NIFs
        const query = 'SELECT nif FROM raciuslinks ORDER BY nif ASC';
        const [nifRows] = await connection.execute(query);
        await connection.end();

        // Extrair os NIFs da consulta
        const nifs = nifRows.map(row => row.nif);

        // Scraping e obtenção de informações da empresa
        for (const nif of nifs) {
            const url = `https://www.einforma.pt/servlet/app/portal/ENTP/prod/ETIQUETA_EMPRESA_CONTRIBUINTE/nif/${nif}`;

            try {
                const { data } = await axios.get(url);
                const $ = cheerio.load(data);
                const nome = $('span[itemprop="name"]').text().trim() || "N/A";

                // Verificar se empresas existem
                if (nome === "N/A") {
                    continue;
                }

                // Retirar empresas inativas
                const estadosInativos = ['(EXTINTA)', '(SEM ATIVIDADE)', '(FUSIONADA)', '(EM LIQUIDAÇÃO)', '(INSOLVENTE)'];
                if (estadosInativos.some(estado => nome.includes(estado))) {
                    continue;
                }

                // Scraping de informações
                const nifRecolhido = $('td:contains("NIF:") + td a').text().trim() || "N/A";
                const duns = $('td:contains("DUNS:") + td').text().trim() || "N/A";
                const morada = $('td:contains("Morada:") + td').text().trim() || "N/A";
                const codigoPostalFull = $('td:contains("Código Postal:") + td').text().trim() || "N/A";

                let codigoPostal = "N/A";
                let localizacao = "N/A";

                // Divisão do Código Postal (1234-567 - Lisboa)
                if (codigoPostalFull !== "N/A" && codigoPostalFull.includes('-')) {
                    const partesCodigoPostal = codigoPostalFull.split(' ');
                    codigoPostal = partesCodigoPostal[0].trim();
                    localizacao = partesCodigoPostal.slice(1).join(' ').trim();
                }

                // Array de CAE's
                const atividades = [];
                $('td:contains("Atividade (CAE):") + td').each((i, element) => {
                    const caeCode = $(element).text().split(' - ')[0].trim();
                    atividades.push(caeCode);
                });

                // Capturar email e website
                const email = $('td:contains("Email:") + td a').text().trim();
                const website = $('td:contains("Website:") + td a').attr('href');

                // Dados coletados
                const Data = {
                    // Fonte de Dados
                    Source: "EInforma",
                    VAT: nifRecolhido,
                    // Dados da Empresa (Companies)
                    NameCompany: nome,
                    DUNS: duns,
                    // Dados de CAEs (Caes)
                    Caes: atividades,
                    // Dados da Marca (Brands)
                    NameBrand: nome,
                    // Endereço (Addresses)
                    Address: morada,
                    Location: localizacao,
                    Zipcode: codigoPostal,
                    Country: 'Portugal',
                };

                // Adicionar dados de contato e link apenas se eles existirem e não forem 'N/A'
                if (email && email !== "N/A") {
                    Data.Contact = email;
                    Data.TypeContact = "E-mail";
                }
                if (website && website !== "N/A") {
                    Data.Url = website;
                    Data.TypeLink = "Website";
                }

                // Mostrar os dados coletados na consola
                console.log("Dados coletados para o NIF:", nif);

                // Enviar os dados para a função UpdateDatabase
                const response = await UpdateDatabase(Data);

            } catch (error) {
                console.error(`Erro ao processar o NIF ${nif}:`, error.message);
            }
        }
        console.log("Processamento das empresas concluído.");

    } catch (error) {
        console.error("Erro ao buscar NIFs da tabela RaciusLinks:", error.message);
    }
}
