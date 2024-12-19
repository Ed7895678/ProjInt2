// Importa o módulo cheerio para fazer parsing de HTML no lado do servidor
const cheerio = require('cheerio');

// Importa o axios para realizar pedidos HTTP
const axios = require('axios');

// Módulos nativos do Node.js para operações com ficheiros e caminhos
const fs = require('fs');
const path = require('path');

// Importa o módulo net para ligações de baixo nível TCP/IP
const net = require('net');

// Importa a classe SocksProxyAgent para usar um proxy socks (Tor)
const { SocksProxyAgent } = require('socks-proxy-agent');

// Importa o mysql2/promise para interagir com a base de dados de forma assíncrona
const mysql = require('mysql2/promise');

// Importa várias funções para atualização de dados na base de dados
const { 
    updateCompanies,
    updateBrands,
    updateAddresses,
    updateCaesCompanies,
    updateCategoriesBrands
} = require('../websitesp/functions')

// Definições de cores para melhor visualização no console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Objeto logger para logar mensagens no console com cores e categorias
const logger = {
    info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    progress: (msg) => console.log(`${colors.magenta}[PROGRESS]${colors.reset} ${msg}`),
    network: (msg) => console.log(`${colors.blue}[NETWORK]${colors.reset} ${msg}`),
    db: (msg) => console.log(`${colors.cyan}[DATABASE]${colors.reset} ${msg}`)
};

// Configuração do Tor
// TOR_SOCKS_PROXY: endereço do proxy socks do Tor
// TOR_CONTROL_PORT: porta de controlo do Tor
// TOR_CONTROL_PASSWORD: senha para autenticação no controlador do Tor
const TOR_SOCKS_PROXY = 'socks5://127.0.0.1:9050';
const TOR_CONTROL_PORT = 9051;
const TOR_CONTROL_PASSWORD = 'hello';

// Variáveis para controlo do tempo e frequência de renovação do circuito Tor
let lastRenewTime = Date.now();
const MIN_RENEW_INTERVAL = 60000; // 60 segundos entre renovações
let isRenewing = false;
let newnymRequestCount = 0;
let requestCount = 0;

// Cria um pool de ligações à base de dados MySQL
// Isto permite reutilizar ligações e evitar overhead de criar/fechar ligações frequentemente
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '88158815!P',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Função para enviar comandos para o controlador do Tor
// Permite autenticar e enviar o sinal NEWNYM (para mudar o IP de saída)
async function sendTorCommand(command) {
    logger.network(`Tentando enviar comando Tor: ${command || 'AUTHENTICATE'}`);
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.connect(TOR_CONTROL_PORT, '127.0.0.1', () => {
            logger.network('Conectado à porta de controlo do Tor');
            client.write(`AUTHENTICATE "${TOR_CONTROL_PASSWORD}"\n`);
        });

        let data = '';
        let authenticated = false;

        client.on('data', (chunk) => {
            data += chunk.toString();
            if (data.includes('\r\n')) {
                if (!authenticated) {
                    // Primeiro espera-se pela autenticação
                    if (data.startsWith('250')) {
                        authenticated = true;
                        data = '';
                        logger.success('Autenticação Tor bem sucedida');
                        if (command) {
                            // Depois de autenticado, envia o comando pretendido
                            client.write(`${command}\r\n`);
                        } else {
                            client.end();
                            resolve('250 OK');
                        }
                    } else {
                        client.end();
                        logger.error('Falha na autenticação do Tor');
                        reject(new Error('Falha na autenticação'));
                    }
                } else {
                    // Depois de autenticado, espera pela resposta do comando
                    if (data.startsWith('250')) {
                        client.end();
                        resolve(data.trim());
                    } else {
                        client.end();
                        reject(new Error(`Falha no comando: ${data.trim()}`));
                    }
                }
            }
        });

        client.on('error', (err) => {
            logger.error(`Erro na conexão Tor: ${err.message}`);
            reject(err);
        });
    });
}

// Função para enviar o sinal NEWNYM ao Tor (renovar o circuito, obtendo novo IP)
async function renewTorCircuit() {
    try {
        logger.network('Iniciando renovação do circuito Tor...');
        const response = await sendTorCommand('SIGNAL NEWNYM');
        if (!response.startsWith('250')) {
            throw new Error('Falha ao enviar sinal NEWNYM');
        }
        newnymRequestCount++;
        lastRenewTime = Date.now();
        logger.success('Circuito Tor renovado com sucesso');
    } catch (error) {
        logger.error(`Falha ao renovar circuito Tor: ${error.message}`);
        throw error;
    }
}

// Função que garante que a renovação do circuito Tor respeita o intervalo mínimo definido
async function safeRenewTorCircuit() {
    if (isRenewing) {
        logger.warn('Renovação de circuito já em curso, a aguardar...');
        while (isRenewing) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return;
    }

    isRenewing = true;
    try {
        const currentTime = Date.now();
        const timeSinceLastRenew = currentTime - lastRenewTime;

        // Se ainda não passou o tempo mínimo, aguarda o tempo restante
        if (timeSinceLastRenew < MIN_RENEW_INTERVAL) {
            const waitTime = MIN_RENEW_INTERVAL - timeSinceLastRenew;
            logger.info(`A aguardar ${waitTime}ms antes de renovar o circuito`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        await renewTorCircuit();
        logger.info('A aguardar 10 segundos para estabilização do circuito...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    } finally {
        isRenewing = false;
    }
}

// Função para obter o IP atual de saída do Tor
async function getCurrentIP() {
    try {
        logger.network('A obter o endereço IP atual...');
        const agent = new SocksProxyAgent(TOR_SOCKS_PROXY);
        const response = await axios.get('https://api.ipify.org?format=json', {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 10000,
        });
        logger.success(`IP atual: ${response.data.ip}`);
        return response.data.ip;
    } catch (error) {
        logger.error(`Falha ao obter endereço IP: ${error.message}`);
        return null;
    }
}

// Insere ou atualiza dados da empresa, marcas, endereços, CAEs e categorias na base de dados
async function insertCompanyData(data) {
    try {
        logger.db(`A processar dados da empresa com NIF ${data.nif}`);

        // Dados para a tabela companies
        const companyData = {
            NameCompany: data.companyName,
            DescriptionCompany: data.companyInfo,
            Vat: data.nif,
            Source: 'racius'
        };
        await updateCompanies(companyData);

        // Dados para a tabela brands
        const brandData = {
            NameBrand: data.companyName,
            DescriptionBrand: data.companyInfo,
            Vat: data.nif,
            Logo: null,
            ScoreBrand: 0,
            NumReviews: 0,
            SentimentBrand: 0,
            Source: 'racius'
        };
        await updateBrands(brandData);

        // Dados para a tabela addresses
        const addressData = {
            Vat: data.nif,
            Address: data.address,
            Location: data.location,
            Zipcode: data.zipcode,
            County: data.county,
            District: data.district,
            Country: 'Portugal',
            Parish: null,
            Source: 'racius'
        };
        await updateAddresses(addressData);

        // Se existirem CAEs, insere-os na base de dados
        if (data.caes && data.caes.length > 0 && data.caes[0] !== 'N/A') {
            for (const cae of data.caes) {
                const caeData = {
                    Vat: data.nif,
                    Cae: cae,
                    Source: 'racius'
                };
                await updateCaesCompanies(caeData);

                // Extrai os primeiros 3 dígitos do CAE para criar/atualizar categorias
                const category = cae.substring(0, 3);
                const categoryData = {
                    Vat: data.nif,
                    Categoria: category,
                    Source: 'racius'
                };
                await updateCategoriesBrands(categoryData);
            }
        }

        logger.success(`Dados processados com sucesso para a empresa: ${data.companyName}`);
    } catch (error) {
        logger.error(`Falha ao processar dados da empresa: ${error.message}`);
        throw error;
    }
}

// Função que obtém e processa os dados a partir de uma URL (Racius)
async function scrapeData(url) {
    try {
        // Limpa a URL removendo http(s):// e www.
        const cleanUrl = url.replace(/^https?:\/\//, '').replace('www.', '');
        logger.info(`Iniciando scraping para a URL: ${cleanUrl}`);
        
        // Configura o agente proxy para passar pelo Tor
        const proxyAgent = new SocksProxyAgent(TOR_SOCKS_PROXY);
        const config = {
            url: `https://www.${cleanUrl}`,
            method: 'get',
            httpsAgent: proxyAgent,
            proxy: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0',
            },
            timeout: 30000,
            maxRedirects: 5,
        };

        logger.network('Enviando requisição HTTP...');
        const { data } = await axios(config);
        logger.success('Conteúdo da página obtido com sucesso');

        // Carrega o HTML com o cheerio para extrair dados
        const $ = cheerio.load(data);
        logger.info('Analisando dados da página...');

        // Extrai o nome da empresa e o NIF
        const companyName = $('.company__name').text().trim() || 'N/A';
        const nif = $('.company-info__data').text().trim() || 'N/A';

        logger.progress(`Empresa encontrada: ${companyName} (NIF: ${nif})`);

        let locationInfo = {
            address: 'N/A',
            zipcode: 'N/A',
            location: 'N/A',
            district: 'N/A',
            county: 'N/A'
        };

        // Extrai informações de morada, código postal, distrito, etc.
        $('.detail__detail').each((_, element) => {
            const keyInfo = $(element).find('.detail__key-info').first().text().trim();
            if (keyInfo === 'Morada') {
                const fullAddress = $(element).find('.px-md--2 .t--d-blue').first().text().trim();
                
                if (fullAddress) {
                    const postalMatch = fullAddress.match(/(\d{4}-\d{3})\s*([^,]+)$/);
                    if (postalMatch) {
                        locationInfo.zipcode = postalMatch[1];
                        locationInfo.location = postalMatch[2].trim();
                    }

                    const addressParts = fullAddress.split(/\d{4}-\d{3}/);
                    if (addressParts.length > 0) {
                        locationInfo.address = addressParts[0].trim() || 'N/A';
                    }
                }

                locationInfo.county = $(element).find('.t-md--right .detail__key-info').text().trim() || 'N/A';
                locationInfo.district = $(element).find('.t-md--right .t--d-blue').text().trim() || 'N/A';
            }
        });

        const companyInfo = $('#about').text().trim() || 'N/A';
        const caes = [];

        // Extrai CAEs presentes na página
        $('.detail__line').each((_, element) => {
            const caeElement = $(element).find('.t--orange').first();
            if (caeElement.length) {
                const caeText = caeElement.text().trim();
                if (/^\d+$/.test(caeText)) {
                    caes.push(caeText);
                }
            }
        });

        // Se não houver CAEs encontrados, coloca 'N/A'
        if (caes.length === 0) {
            caes.push('N/A');
        }

        // Cria um objeto com todos os dados extraídos
        const companyData = {
            companyName,
            nif,
            companyInfo,
            address: locationInfo.address,
            location: locationInfo.location,
            zipcode: locationInfo.zipcode,
            county: locationInfo.county,
            district: locationInfo.district,
            caes
        };

        logger.info('Resumo dos dados extraídos:');
        logger.info(`Empresa: ${companyData.companyName}`);
        logger.info(`NIF: ${companyData.nif}`);
        logger.info(`Endereço: ${companyData.address}`);
        logger.info(`Localidade: ${companyData.location}`);
        logger.info(`Distrito: ${companyData.district}`);
        logger.info(`CAEs encontrados: ${companyData.caes.length}`);

        // Se tivermos nome e NIF válidos, procede ao update/insert na BD
        if (companyData.companyName !== 'N/A' && companyData.nif !== 'N/A') {
            logger.progress('Iniciando inserção/atualização na base de dados...');
            await insertCompanyData(companyData);
            logger.success(`Empresa processada com sucesso: ${companyData.companyName}`);
        } else {
            logger.warn('Dados insuficientes para operação na base de dados');
            logger.info('Campos em falta:');
            logger.info(`- Nome: ${companyData.companyName === 'N/A' ? 'Em falta' : 'OK'}`);
            logger.info(`- NIF: ${companyData.nif === 'N/A' ? 'Em falta' : 'OK'}`);
        }

        requestCount++;

        // A cada 20 pedidos, renova o circuito Tor
        if (requestCount % 20 === 0) {
            logger.network('\nIniciando renovação do circuito Tor após 20 pedidos...');
            await safeRenewTorCircuit();
            const newIP = await getCurrentIP();
            logger.success(`Novo IP obtido: ${newIP}`);
        }
    } catch (error) {
        logger.error(`Erro no scraping: ${error.message}`);

        // Se for erro 403 ou 429, pode ser bloqueio. Tenta renovar o IP e continuar
        if (error.response?.status === 403 || error.response?.status === 429) {
            logger.warn('Possível bloqueio. Renovando circuito Tor...');
            await safeRenewTorCircuit();
            const newIP = await getCurrentIP();
            logger.success(`Novo IP obtido: ${newIP}`);
            logger.info('A aguardar 5 segundos antes de continuar...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Função principal, obtém URLs da base de dados, faz scraping e atualiza a BD
async function Racius() {
    try {
        logger.info('Iniciando processo de scraping Racius...');
        logger.db('A obter URLs da base de dados...');

        // Seleciona NIF e URL da tabela raciuslinks
        const [rows] = await pool.execute('SELECT NIF, URL FROM projint2.raciuslinks WHERE URL IS NOT NULL');

        logger.success(`Encontradas ${rows.length} empresas para processar`);
        
        const initialIP = await getCurrentIP();
        logger.network(`A iniciar com IP: ${initialIP}\n`);

        for (let i = 0; i < rows.length; i++) {
            const { NIF, URL } = rows[i];
            if (NIF && URL) {
                logger.progress(`A processar empresa ${i + 1}/${rows.length} (NIF: ${NIF})`);
                await scrapeData(URL);
                // Espera 2 segundos entre pedidos para não sobrecarregar o servidor
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                logger.warn(`A saltar entrada inválida no índice ${i}: Falta NIF ou URL`);
            }
        }

        logger.success('\nProcessamento concluído com sucesso!');
        logger.info('Estatísticas finais:');
        logger.info(`Total de pedidos realizados: ${requestCount}`);
        logger.info(`Total de renovações de circuito Tor: ${newnymRequestCount}`);
    } catch (error) {
        logger.error(`Erro fatal no processamento: ${error.message}`);
    } finally {
        logger.db('A encerrar conexão à base de dados...');
        await pool.end();
        logger.success('Conexão à base de dados encerrada');
    }
}

// Inicia o processo de scraping
logger.info('Inicializando o scraper Racius...');
Racius().then(() => {
    logger.success('Processo de scraping concluído com sucesso');
}).catch(error => {
    logger.error('Erro fatal no processo principal:', error);
});

// Exporta a função Racius
module.exports = {
    Racius
};
