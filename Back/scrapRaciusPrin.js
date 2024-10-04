const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs'); // Módulo para manipular arquivos

// Função para fazer scraping de uma página específica
async function scrapeData(pageNumber) {
    const url = `https://www.racius.com/empresas-em-portugal/em-atividade/${pageNumber}/`;
    try {
        // Faz o request da página
        const { data } = await axios.get(url);

        // Carrega o HTML para o cheerio
        const $ = cheerio.load(data);

        // Seleciona todas as entradas dos resultados
        const companies = [];

        // Itera sobre os elementos com a classe de link da empresa
        $('a.results__col-link').each((i, element) => {
            // Obtém o link da empresa
            const companyLink = $(element).attr('href');

            // Armazena o link da empresa
            companies.push(`https://www.racius.com${companyLink}`);
        });

        // Retorna os links da página
        return companies;

    } catch (error) {
        console.error(`Erro ao realizar scraping na página ${pageNumber}: ${error.message}`);
        return [];
    }
}

// Função principal para iterar pelas páginas e coletar os links
async function getAllCompanyLinks() {
    let allLinks = [];
    let pageNumber = 75;
    let hasMorePages = true;

    while (hasMorePages) {
        console.log(`Processando página ${pageNumber}...`);
        const linksFromPage = await scrapeData(pageNumber);

        if (linksFromPage.length > 0) {
            allLinks = allLinks.concat(linksFromPage);
            pageNumber++; // Vai para a próxima página
        } else {
            hasMorePages = false; // Para o loop quando não houver mais links
        }
    }

    // Converte o array para uma string, com uma nova linha entre os links
    const fileContent = allLinks.join('\n');

    // Salva os links no ficheiro teste.txt
    fs.writeFile('teste.txt', fileContent, (err) => {
        if (err) {
            console.error('Erro ao salvar o arquivo:', err);
        } else {
            console.log('Links salvos com sucesso em teste.txt');
        }
    });
}

// Executa o scraping em todas as páginas até o fim
getAllCompanyLinks();
