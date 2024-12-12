// Eduardo Santos
const axios = require('axios');
const cheerio = require('cheerio');
const { updateCompanies, updateBrands, updateAddresses, updateLinks } = require('./UpdateDatabase');
const mysql = require('mysql2/promise');

// Configuração da pool de conexões
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
});

async function EInforma() {
    try {
        // Conexão com a base de dados
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: 'projint2'
        });

        // Buscar NIFs da tabela RaciusLinks
        const [nifRows] = await connection.execute('SELECT nif FROM raciuslinks ORDER BY nif ASC');

        // Extrair os NIFs da consulta
        const nifs = nifRows.map(row => row.nif);

        // Processar cada NIF
        for (const nifConsulta of nifs) {  
            const url = `https://www.einforma.pt/servlet/app/portal/ENTP/prod/ETIQUETA_EMPRESA_CONTRIBUINTE/nif/${nifConsulta}`;

            try {
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);
            
                const getText = (selector) => {
                    const text = $(selector).text().trim();
                    return text !== '' ? text : 'N/A';
                };
            
                const getAttr = (selector, attr) => {
                    const attribute = $(selector).attr(attr);
                    return attribute ? attribute : 'N/A';
                };
            
                // Informações Recolhidas
                const nome = getText('span[itemprop="name"]');
                // Verificação
                if (nome === 'N/A' || ['(EXTINTA)', '(SEM ATIVIDADE)', '(FUSIONADA)', '(EM LIQUIDAÇÃO)', '(INSOLVENTE)'].some(status => nome.includes(status))) {
                    // Remover a entrada com NIF inválido
                    await connection.execute('DELETE FROM raciuslinks WHERE nif = ?', [nifConsulta]);
                    console.log(`Empresa com NIF ${nifConsulta} removida por ser inválida.\n`);
                    continue;
                }
            
                const nifEmpresa = getText('td:contains("NIF:") + td a'); 
                const duns = getText('td:contains("DUNS:") + td');
                const morada = getText('span[itemprop="streetaddress"]');
                const codigoPostalFull = getText('span[itemprop="postalcode"]');
                const [codigoPostal, ...localParts] = (codigoPostalFull ? codigoPostalFull.split(' ') : []);
                const localizacao = localParts.join(' ');

                const caes = $('td:contains("Atividade (CAE):") + td a')
                    .map((_, el) => {
                        const cae = $(el).text().trim();
                        const [numeroCae] = cae.split(' - ');
                        return numeroCae;
                    }).get() || null;
                    
                const website = getAttr('td:contains("Website:") + td a', 'href') || null;

                // Atualizar informações no banco de dados
                const CompanyData = {
                    Vat: nifEmpresa,  
                    Source: "EInforma",
                    NameCompany: nome,
                    DUNS: duns,
                    DescriptionCompany: 'N/A',
                    LegalCompany: 'N/A',
                    ScoreCompany: 0,
                    SentimentCompany: 'N/A'
                };
                await updateCompanies(CompanyData);
            
                const BrandData = {
                    Vat: nifEmpresa, 
                    Source: "EInforma",
                    NameBrand: nome,
                    DescriptionBrand: 'N/A',
                    Logo: 'N/A',
                    ScoreBrand: 0,
                    NumReviews: 0,
                    SentimentBrand: 'N/A',
                };
                await updateBrands(BrandData);
            
                const AddressData = {
                    Vat: nifEmpresa,  
                    Source: "EInforma",
                    Address: morada,
                    Location: localizacao,
                    Zipcode: codigoPostal,
                    County: 'N/A',
                    District: 'N/A',
                    Country: 'Portugal',
                    Parish: 'N/A',
                };
                await updateAddresses(AddressData);
            
                if (website !== 'N/A') {
                    const LinkData = {
                        Vat: nifEmpresa, 
                        Source: "EInforma",
                        Url: website,
                        TypeLink: "Website",
                    };
                    await updateLinks(LinkData);
                }
                console.log(" ")
            } catch (error) {
                console.error(`Erro ao processar o NIF ${nifConsulta}:`, error.message `\n`);
            }
        }

        await connection.end();
        console.log("Processamento das empresas no EInforma concluído.");
    } catch (error) {
        console.error("Erro ao buscar NIFs da tabela RaciusLinks:", error.message);
    }
}

EInforma();

// Exportação
module.exports = {
    EInforma
};