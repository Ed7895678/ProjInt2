// Importa o módulo 'puppeteer' para automatizar ações num browser sem interface gráfica
const puppeteer = require('puppeteer');

// Importa funções de fs (sistema de ficheiros) e utiliza a versão com 'promises'
// para poder usar async/await em operações de ficheiros
const fs = require('fs').promises;

// Importa o módulo 'path' para lidar com caminhos de ficheiros e diretórios
const path = require('path');

// Importa o módulo 'mysql2' para estabelecer ligação com uma base de dados MySQL
const mysql = require('mysql2');

// Importa a função 'updateContacts' do ficheiro 'functions.js', situada na mesma pasta
const { updateContacts } = require('./functions')

// Cria um "pool" de conexões MySQL. O pool permite gerir várias ligações à BD,
// evitando o overhead de abrir e fechar ligações constantemente.
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '88158815!P',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Array de possíveis substrings comuns em URL's ou páginas que normalmente contêm contactos.
// Isto será usado para encontrar páginas que potencialmente contêm números de telefone.
const commonPages = [
    'contactos', 'contacts', 'contact', 'contato', 'contacto',
    'fale-conosco', 'fale-connosco', 'contact-us', 'contacte-nos',
    'suporte', 'support', 'atendimento', 'customer-service',
    'apoio-cliente', 'customer-support', 'sobre', 'about', 
    'about-us', 'quem-somos', 'who-we-are', 'empresa', 'company',
    'about-company', 'rodape', 'footer', 'informacoes', 'information'
];

// Função para "limpar" um número de telefone, removendo todos os caracteres não numéricos
// e, se começar com o indicativo 351 (Portugal), remove-o para ficar apenas com os 9 dígitos.
function cleanPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('351')) {
        cleaned = cleaned.slice(3);
    }
    return cleaned;
}

// Função que verifica se um número de telefone é potencialmente válido em Portugal.
// Primeiro limpa o número. Depois verifica:
// - Se tem 9 dígitos
// - Se começa com 2, 3 ou 9
// - Se começar por 9, verifica se o segundo dígito é típico dos telemóveis portugueses (1,2,3,4,5,6,9).
function isValidPortuguesePhone(phone) {
    const cleaned = cleanPhoneNumber(phone);
    if (cleaned.length !== 9) return false;
    if (!['2', '3', '9'].includes(cleaned[0])) return false;
    if (cleaned[0] === '9') {
        if (!['1','2','3','4','5','6','9'].includes(cleaned[1])) return false;
    }
    return true;
}

// Função que obtém URLs da base de dados. Estes URLs pertencem a marcas, empresas, etc.
// Seleciona as colunas 'Url' e 'VAT' da tabela 'links', fazendo joins com outras tabelas
// para obter a informação completa.
async function getUrlsFromDatabase() {
    try {
        const [rows] = await pool.query(
            `SELECT l.Url, c.VAT
             FROM links l 
             JOIN brands b ON l.IDBrand = b.ID
             JOIN companies c ON b.IDCompany = c.ID
             WHERE l.Type = "website" 
             ORDER BY l.ID ASC`
        );
        return rows;
    } catch (error) {
        console.error('Erro ao obter URLs:', error);
        return [];
    }
}

// Função que extrai números de telefone de uma página já carregada pelo Puppeteer.
// Dentro da página, usa a função page.evaluate para executar código no contexto do browser.
// Procura padrões de telefone usando uma regex e devolve uma lista única (sem repetições).
// Depois filtra apenas os que são válidos e devolve no máximo 2 resultados.
async function extractPhoneFromPage(page) {
    try {
        const phoneNumbers = await page.evaluate(() => {
            const text = document.body.innerText;
            const phonePattern = /(?:(?:\+|00)?351[ .-]?)?(?:2|3|9)[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}/g;
            return Array.from(new Set(text.match(phonePattern) || []));
        });

        return phoneNumbers
            .map(phone => cleanPhoneNumber(phone))
            .filter(phone => isValidPortuguesePhone(phone))
            .slice(0, 2);
    } catch (error) {
        console.error('Erro ao extrair números de telefone:', error);
        return [];
    }
}

// Função que guarda os números de telefone encontrados na base de dados, chamando a função updateContacts
// para cada telefone encontrado.
async function savePhoneToDatabase(phones, vat) {
    try {
        for (const phone of phones) {
            await updateContacts({
                Vat: vat,
                Contact: phone,
                TypeContact: 'telemovel',
                Source: 'website'
            });
            console.log(`Guardado número: ${phone} para o VAT: ${vat}`);
        }
    } catch (error) {
        console.error(`Erro ao guardar números para o VAT ${vat}:`, error);
    }
}

// Função auxiliar de atraso, útil para pausas entre operações (por exemplo, esperar que a página carregue).
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para "scrollar" automaticamente a página até ao fundo,
// garantindo que todo o conteúdo lazy-loaded é carregado.
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// Função principal que tenta extrair números de telefone de um URL específico,
// abrindo a página, tentando extrair o telefone da página principal e, se não encontrar,
// procura links internos relacionados com páginas de contactos (commonPages) e tenta extrair daí.
async function scrapePhoneFromUrl(browser, url, vat) {
    const page = await browser.newPage();
    let phonesFound = [];

    try {
        // Define o timeout padrão de navegação
        await page.setDefaultNavigationTimeout(30000);

        // Define o user-agent para simular um browser "real"
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Intercepta requests para não carregar imagens nem fontes, optimizando desempenho
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'image' || req.resourceType() === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`\nA verificar: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await autoScroll(page);
        await delay(1000);
        
        // Tenta extrair telefone da página principal
        const phones = await extractPhoneFromPage(page);
        if (phones.length > 0) {
            phonesFound = phones;
            await savePhoneToDatabase(phonesFound, vat);
            return phonesFound;
        }

        // Se não encontrou na página principal, obtém todos os links internos
        const links = await page.$$eval('a', (elements) => elements.map(el => el.href));
        for (const link of links) {
            // Só quer seguir links que estejam dentro do mesmo domínio (começam com o URL base)
            if (phonesFound.length === 0 && link.startsWith(url)) {
                // Verifica se o link contém alguma das strings comuns para páginas de contacto
                for (const commonPage of commonPages) {
                    if (link.toLowerCase().includes(commonPage)) {
                        try {
                            console.log(`A verificar subpágina: ${link}`);
                            await page.goto(link, { waitUntil: 'networkidle0' });
                            await autoScroll(page);
                            await delay(1000);
                            
                            const pagePhones = await extractPhoneFromPage(page);
                            if (pagePhones.length > 0) {
                                phonesFound = pagePhones;
                                await savePhoneToDatabase(phonesFound, vat);
                                break;
                            }
                        } catch (error) {
                            console.error(`Erro ao verificar ${link}:`, error.message);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao processar ${url}:`, error);
    } finally {
        await page.close();
    }

    return phonesFound;
}

// Função main que inicia o processo:
// 1. Obtém URLs da BD.
// 2. Lança o browser puppeteer.
// 3. Para cada URL, tenta extrair números de telefone.
// 4. Guarda os números encontrados na BD.
// 5. Fecha o browser e o pool de ligações à BD.
async function main() {
    try {
        console.log('A iniciar extração de números de telefone...');
        
        const urls = await getUrlsFromDatabase();
        if (urls.length === 0) {
            console.log('Não foram encontrados URLs para processar');
            return;
        }

        console.log(`Foram encontrados ${urls.length} URLs para processar`);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            for (const {Url, VAT} of urls) {
                console.log(`\nA processar: ${Url}`);
                const phones = await scrapePhoneFromUrl(browser, Url, VAT);
                if (phones.length > 0) {
                    console.log(`Foram encontrados os seguintes números: ${phones.join(', ')}`);
                }
            }
        } finally {
            await browser.close();
        }
        
        console.log('\nProcessamento concluído!');
        
    } catch (error) {
        console.error('Erro na execução:', error);
    } finally {
        await pool.end();
    }
}

// Chama a função principal
main();
