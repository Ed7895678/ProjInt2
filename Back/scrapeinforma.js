// "node scrapeinforma.js" na consola para correr

const axios = require('axios');
const cheerio = require('cheerio');

// Variáveis para contar o número de empresas encontradas e NIFs sem resultados
let empresasEncontradas = 0;
let semResultados = 0;

// Função para buscar informações de uma empresa pelo NIF
async function getCompanyInfo(nif) {
    const url = `https://www.einforma.pt/servlet/app/portal/ENTP/prod/ETIQUETA_EMPRESA_CONTRIBUINTE/nif/${nif}`;
    
    try {
        // Fazer uma requisição para o site
        const { data } = await axios.get(url);

        // Carregar o conteúdo HTML com cheerio
        const $ = cheerio.load(data);

        // Selecionar e extrair as informações desejadas
        const nomeEmpresa = $('span[itemprop="name"]').text().trim() || "N/A";
        
        // Se o nome da empresa for "N/A", significa que o NIF não tem resultados, então contar como "sem resultados"
        if (nomeEmpresa === "N/A") {
            console.log(`Nenhuma empresa encontrada para o NIF: ${nif}`);
            semResultados++; // Incrementa o contador de NIFs sem resultados
        } else {
            const nifValue = $('td:contains("NIF:") + td a').text().trim() || "N/A";
            const dunsValue = $('td:contains("DUNS:") + td a').text().trim() || "N/A";
            const morada = $('span[itemprop="streetaddress"]').text().trim() || "N/A";
            const codigoPostal = $('span[itemprop="postalcode"]').text().trim() || "N/A";
            const atividade = $('td:contains("Atividade (CAE):") + td a').text().trim() || "N/A";
            const telefone = $('span[itemprop="telephone"] .value').text().trim() || "N/A";
            const balancoDisponivel = $('td:contains("Balanço disponível:") + td').text().trim() || "N/A";

            // Incrementa o contador de empresas encontradas
            empresasEncontradas++;

            // Exibir todas as informações, mesmo que ausentes, no terminal
            //console.log("Informações da Empresa:");
            console.log(`NIF: ${nifValue}`);
            //console.log(`DUNS: ${dunsValue}`);
            console.log(`Nome da Empresa: ${nomeEmpresa}`);
            //console.log(`Morada: ${morada}`);
            //console.log(`Código Postal: ${codigoPostal}`);
            //console.log(`Atividade (CAE): ${atividade}`);
            //console.log(`Telefone: ${telefone}`);
            //console.log(`Balanço Disponível: ${balancoDisponivel}`);

            // Adicionar duas linhas de espaço entre cada registro
            console.log("---");
        }

        // Mostrar o número de empresas encontradas e sem resultados após cada pesquisa
        console.log(`${empresasEncontradas} / ${semResultados}`);
        //console.log(`Total de NIFs sem resultados: ${semResultados}`);

    } catch (error) {
        console.error(`Erro ao buscar informações da empresa com NIF ${nif}: ${error.message}`);
    }
}

// Função para validar NIF de empresas ou pessoas coletivas
function validaContribuinte(contribuinte) {
    if (contribuinte.substr(0, 1) !== '5') {
        return false; // Apenas NIFs que começam com '5' são válidos para empresas/pessoas coletivas
    }

    var check1 = contribuinte.substr(0, 1) * 9;
    var check2 = contribuinte.substr(1, 1) * 8;
    var check3 = contribuinte.substr(2, 1) * 7;
    var check4 = contribuinte.substr(3, 1) * 6;
    var check5 = contribuinte.substr(4, 1) * 5;
    var check6 = contribuinte.substr(5, 1) * 4;
    var check7 = contribuinte.substr(6, 1) * 3;
    var check8 = contribuinte.substr(7, 1) * 2;

    var total = check1 + check2 + check3 + check4 + check5 + check6 + check7 + check8;
    var modulo11 = total % 11;
    var comparador = (modulo11 === 0 || modulo11 === 1) ? 0 : 11 - modulo11;

    var ultimoDigito = contribuinte.substr(8, 1) * 1;

    return ultimoDigito === comparador;
}

// Função para gerar NIFs possíveis para empresas/pessoas coletivas (começando com 5)
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

// Definir o intervalo de NIFs para pesquisar (apenas empresas e pessoas coletivas)
const possibleNIFs = generatePossibleNIFs(500000000, 599999999);

// Chamar a função getCompanyInfo para cada NIF gerado e validado
(async () => {
    for (const nif of possibleNIFs) {
        await getCompanyInfo(nif);
    }

    // Mostrar o número de empresas encontradas e NIFs sem resultados no final
    console.log(`Total final de empresas encontradas: ${empresasEncontradas}`);
    console.log(`Total final de NIFs sem resultados: ${semResultados}`);
})();
