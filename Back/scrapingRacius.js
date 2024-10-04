const axios = require('axios');
const cheerio = require('cheerio');

// Função para fazer scraping da página
async function scrapeData(slug) {
    const url = 'https://www.racius.com/' + slug;
    try {
        // Faz o request da página
        const { data } = await axios.get(url);

        // Carrega o HTML para o cheerio
        const $ = cheerio.load(data);

        // Seleciona os elementos HTML que você deseja
        const companyName = $('.company__name').text().trim() || 'Nome não encontrado';
        const nif = $('.company-info__data').text().trim() || 'NIF não encontrado';

        // Corrigindo os seletores para extrair o endereço e o capital social
        const address = $('.detail__detail .t--d-blue').first().text().trim() || 'Endereço não encontrado';
        const district = $('.detail__detail .t--d-blue').eq(1).text().trim() || 'Distrito não encontrado';
        const council = $('.detail__key-info').eq(1).text().trim() || 'Concelho não encontrado';
        const capitalSocial = $('.detail__detail .t--d-blue').eq(3).text().trim() || 'Capital Social não encontrado';

        // CAE e Atividade
        let caeList = [];
        $('.t--d-blue li.d--flex').each((i, el) => {
            const caeCode = $(el).find('.t--orange.f--600').text().trim();
            caeList.push(caeCode); // Armazena apenas o código do CAE
        });

        const activity = $('#activity').text().trim() || 'Atividade não encontrada';

        const companyInfo = $('#about').text().trim() || 'Informações da empresa não encontradas';

        // Exibe as informações
        console.log();
        console.log(`Company Name: ${companyName}`);
        console.log(`NIF: ${nif}`);
        console.log(`Address: ${address}`);
        console.log(`District: ${district}`);
        console.log(`Council: ${council}`);
        console.log(`Capital Social: ${capitalSocial}`);
        console.log(`Atividade: ${activity}`);
        console.log(`Company Info: ${companyInfo}`);
        console.log('CAEs:');
        caeList.forEach(cae => console.log(cae));
        console.log();

    } catch (error) {
        console.error(`Erro ao realizar scraping: ${error.message}`);
    }
}

scrapeData('arj-madeiras-comercio-de-madeiras-lda');
scrapeData('optimus-telecomunicacoes-s-a');

