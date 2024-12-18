const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { SocksProxyAgent } = require('socks-proxy-agent');
const mysql = require('mysql2/promise');
const { 
    updateCompanies,
    updateBrands,
    updateAddresses,
    updateCaesCompanies,
    updateCategoriesBrands
} = require('../JS/UpdateDatabase')

// Add colors for console logging
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

// Logger utility
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
const TOR_SOCKS_PROXY = 'socks5://127.0.0.1:9050';
const TOR_CONTROL_PORT = 9051;
const TOR_CONTROL_PASSWORD = 'hello';

let lastRenewTime = Date.now();
const MIN_RENEW_INTERVAL = 60000;
let isRenewing = false;
let newnymRequestCount = 0;
let requestCount = 0;

// Configuração do banco de dados
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function sendTorCommand(command) {
    logger.network(`Attempting to send Tor command: ${command || 'AUTHENTICATE'}`);
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.connect(TOR_CONTROL_PORT, '127.0.0.1', () => {
            logger.network('Connected to Tor control port');
            client.write(`AUTHENTICATE "${TOR_CONTROL_PASSWORD}"\n`);
        });

        let data = '';
        let authenticated = false;

        client.on('data', (chunk) => {
            data += chunk.toString();
            if (data.includes('\r\n')) {
                if (!authenticated) {
                    if (data.startsWith('250')) {
                        authenticated = true;
                        data = '';
                        logger.success('Tor authentication successful');
                        if (command) {
                            client.write(`${command}\r\n`);
                        } else {
                            client.end();
                            resolve('250 OK');
                        }
                    } else {
                        client.end();
                        logger.error('Tor authentication failed');
                        reject(new Error('Authentication failed'));
                    }
                } else {
                    if (data.startsWith('250')) {
                        client.end();
                        resolve(data.trim());
                    } else {
                        client.end();
                        reject(new Error(`Command failed: ${data.trim()}`));
                    }
                }
            }
        });

        client.on('error', (err) => {
            logger.error(`Tor connection error: ${err.message}`);
            reject(err);
        });
    });
}

async function renewTorCircuit() {
    try {
        logger.network('Initiating Tor circuit renewal...');
        const response = await sendTorCommand('SIGNAL NEWNYM');
        if (!response.startsWith('250')) {
            throw new Error('Failed to send NEWNYM signal');
        }
        newnymRequestCount++;
        lastRenewTime = Date.now();
        logger.success('Tor circuit renewed successfully');
    } catch (error) {
        logger.error(`Failed to renew Tor circuit: ${error.message}`);
        throw error;
    }
}

async function safeRenewTorCircuit() {
    if (isRenewing) {
        logger.warn('Circuit renewal already in progress, waiting...');
        while (isRenewing) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return;
    }

    isRenewing = true;
    try {
        const currentTime = Date.now();
        const timeSinceLastRenew = currentTime - lastRenewTime;

        if (timeSinceLastRenew < MIN_RENEW_INTERVAL) {
            const waitTime = MIN_RENEW_INTERVAL - timeSinceLastRenew;
            logger.info(`Waiting ${waitTime}ms before renewing circuit`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        await renewTorCircuit();
        logger.info('Waiting 10 seconds for circuit stabilization...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    } finally {
        isRenewing = false;
    }
}

async function getCurrentIP() {
    try {
        logger.network('Fetching current IP address...');
        const agent = new SocksProxyAgent(TOR_SOCKS_PROXY);
        const response = await axios.get('https://api.ipify.org?format=json', {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 10000,
        });
        logger.success(`Current IP: ${response.data.ip}`);
        return response.data.ip;
    } catch (error) {
        logger.error(`Failed to get IP address: ${error.message}`);
        return null;
    }
}

async function insertCompanyData(data) {
    try {
        logger.db(`Processing company data for VAT ${data.nif}`);
        
        // Prepare data for companies
        const companyData = {
            NameCompany: data.companyName,
            DescriptionCompany: data.companyInfo,
            Vat: data.nif,
            Source: 'racius'
        };
        
        // Update companies
        await updateCompanies(companyData);

        // Prepare data for brands
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
        
        // Update brands
        await updateBrands(brandData);

        // Prepare data for addresses
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
        
        // Update addresses
        await updateAddresses(addressData);

// Update CAEs if they exist
if (data.caes && data.caes.length > 0 && data.caes[0] !== 'N/A') {
    for (const cae of data.caes) {
        const caeData = {
            Vat: data.nif,
            Cae: cae,
            Source: 'racius'
        };
        await updateCaesCompanies(caeData);

        // Get first 3 digits for category
        const category = cae.substring(0, 3);
        
        // Update categories_brands with first 3 digits of CAE
        const categoryData = {
            Vat: data.nif,
            Categoria: category, // Using only first 3 digits
            Source: 'racius'
        };
        
        await updateCategoriesBrands(categoryData);
    }
}

        logger.success(`Successfully processed all data for company: ${data.companyName}`);

    } catch (error) {
        logger.error(`Failed to process company data: ${error.message}`);
        throw error;
    }
}

async function scrapeData(url) {
    try {
        const cleanUrl = url.replace(/^https?:\/\//, '').replace('www.', '');
        logger.info(`Starting scrape for URL: ${cleanUrl}`);
        
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

        logger.network('Sending HTTP request...');
        const { data } = await axios(config);
        logger.success('Received webpage content');

        const $ = cheerio.load(data);
        logger.info('Parsing webpage data...');

        const companyName = $('.company__name').text().trim() || 'N/A';
        const nif = $('.company-info__data').text().trim() || 'N/A';

        logger.progress(`Found company: ${companyName} (NIF: ${nif})`);

        let locationInfo = {
            address: 'N/A',
            zipcode: 'N/A',
            location: 'N/A',
            district: 'N/A',
            county: 'N/A'
        };

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
        
        $('.detail__line').each((_, element) => {
            const caeElement = $(element).find('.t--orange').first();
            if (caeElement.length) {
                const caeText = caeElement.text().trim();
                if (/^\d+$/.test(caeText)) {
                    caes.push(caeText);
                }
            }
        });

        if (caes.length === 0) {
            caes.push('N/A');
        }

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

        logger.info('Data extraction summary:');
        logger.info(`Company: ${companyData.companyName}`);
        logger.info(`NIF: ${companyData.nif}`);
        logger.info(`Address: ${companyData.address}`);
        logger.info(`Location: ${companyData.location}`);
        logger.info(`District: ${companyData.district}`);
        logger.info(`CAEs found: ${companyData.caes.length}`);

        if (companyData.companyName !== 'N/A' && companyData.nif !== 'N/A') {
            logger.progress('Starting database insertion/update...');
            await insertCompanyData(companyData);
            logger.success(`Successfully processed company: ${companyData.companyName}`);
        } else {
            logger.warn('Insufficient data for database operation');
            logger.info('Missing fields:');
            logger.info(`- Name: ${companyData.companyName === 'N/A' ? 'Missing' : 'OK'}`);
            logger.info(`- NIF: ${companyData.nif === 'N/A' ? 'Missing' : 'OK'}`);
        }

        requestCount++;

        if (requestCount % 20 === 0) {
            logger.network('\nInitiating scheduled Tor circuit renewal after 20 requests...');
            await safeRenewTorCircuit();
            const newIP = await getCurrentIP();
            logger.success(`New IP obtained: ${newIP}`);
        }
    } catch (error) {
        logger.error(`Scraping error: ${error.message}`);
        if (error.response?.status === 403 || error.response?.status === 429) {
            logger.warn('Possible rate limiting detected. Renewing Tor circuit...');
            await safeRenewTorCircuit();
            const newIP = await getCurrentIP();
            logger.success(`New IP obtained: ${newIP}`);
            logger.info('Waiting 5 seconds before continuing...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function Racius() {
    try {
        logger.info('Starting Racius scraping process...');
        logger.db('Fetching URLs from database...');
        
        const [rows] = await pool.execute('SELECT NIF, URL FROM projint2.raciuslinks WHERE URL IS NOT NULL');

        logger.success(`Found ${rows.length} companies to process`);
        
        const initialIP = await getCurrentIP();
        logger.network(`Starting with IP: ${initialIP}\n`);

        for (let i = 0; i < rows.length; i++) {
            const { NIF, URL } = rows[i];
            if (NIF && URL) {
                logger.progress(`Processing company ${i + 1}/${rows.length} (NIF: ${NIF})`);
                await scrapeData(URL);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                logger.warn(`Skipping invalid entry at index ${i}: Missing NIF or URL`);
            }
        }

        logger.success('\nProcessing completed successfully!');
        logger.info('Final statistics:');
        logger.info(`Total requests made: ${requestCount}`);
        logger.info(`Total Tor circuit renewals: ${newnymRequestCount}`);
    } catch (error) {
        logger.error(`Fatal error processing companies: ${error.message}`);
    } finally {
        logger.db('Closing database connection...');
        await pool.end();
        logger.success('Database connection closed');
    }
}

// Start the scraping process
logger.info('Initializing Racius scraper...');
Racius().then(() => {
    logger.success('Scraping process completed successfully');
}).catch(error => {
    logger.error('Fatal error in main process:', error);
});

// Exports
module.exports = {
    Racius
};