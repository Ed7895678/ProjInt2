const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { SocksProxyAgent } = require('socks-proxy-agent');
const mysql = require('mysql2/promise');

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
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.connect(TOR_CONTROL_PORT, '127.0.0.1', () => {
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
                        if (command) {
                            client.write(`${command}\r\n`);
                        } else {
                            client.end();
                            resolve('250 OK');
                        }
                    } else {
                        client.end();
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

        client.on('error', reject);
    });
}

async function renewTorCircuit() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Enviando sinal NEWNYM para Tor.`);
        const response = await sendTorCommand('SIGNAL NEWNYM');
        if (!response.startsWith('250')) {
            throw new Error('Falha ao enviar sinal NEWNYM');
        }
        newnymRequestCount++;
        lastRenewTime = Date.now();
        console.log(`[${new Date().toLocaleTimeString()}] Circuito Tor renovado com sucesso.`);
    } catch (error) {
        console.error('Erro ao renovar circuito Tor:', error);
        throw error;
    }
}

async function safeRenewTorCircuit() {
    if (isRenewing) {
        console.log(`[${new Date().toLocaleTimeString()}] Renovação em andamento. Aguardando...`);
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
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        await renewTorCircuit();
        await new Promise(resolve => setTimeout(resolve, 10000));
    } finally {
        isRenewing = false;
    }
}

async function getCurrentIP() {
    try {
        const agent = new SocksProxyAgent(TOR_SOCKS_PROXY);
        const response = await axios.get('https://api.ipify.org?format=json', {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 10000,
        });
        return response.data.ip;
    } catch (error) {
        console.error('Erro ao obter IP através do Tor:', error);
        return null;
    }
}

function extractSlug(url) {
    return path.basename(url.trim());
}

async function updateCategoriesBrands(data) {
    try {
        // Primeiro verifica e filtra CAEs inválidos e limita a 3 caracteres
        const validCaes = data.Caes.filter(cae => {
            // Remove qualquer caractere não numérico
            const cleanCae = cae.replace(/\D/g, '');
            // Verifica se tem pelo menos 1 dígito e não é 'N/A'
            return cleanCae.length > 0 && cae !== 'N/A';
        }).map(cae => {
            // Limita a exatamente 3 dígitos e remove caracteres não numéricos
            return cae.replace(/\D/g, '').substring(0, 3);
        });

        if (validCaes.length === 0) {
            console.log(`Nenhum CAE válido para categories_brands. VAT: ${data.Vat}`);
            return;
        }

        const [brandRows] = await pool.execute(
            `SELECT b.ID 
             FROM brands b
             JOIN companies c ON b.IDCompany = c.ID
             WHERE c.VAT = ?`,
            [data.Vat]
        );

        if (brandRows.length === 0) {
            console.log(`Nenhuma marca encontrada com o VAT: ${data.Vat}`);
            return;
        }

        const idBrand = brandRows[0].ID;

        // Apagar categorias existentes para esta marca
        await pool.execute(
            'DELETE FROM categories_brands WHERE IDBrand = ?',
            [idBrand]
        );

        // Para cada CAE, verifica se existe na tabela categories
        for (const cae of validCaes) {
            // Verifica se a categoria existe
            const [categoryExists] = await pool.execute(
                'SELECT Code FROM categories WHERE Code = ?',
                [cae]
            );

            if (categoryExists.length > 0) {
                await pool.execute(
                    `INSERT INTO categories_brands (IDBrand, Category, Source) 
                     VALUES (?, ?, ?)`,
                    [idBrand, cae, data.Source]
                );
                console.log(`Categoria ${cae} associada à marca ID: ${idBrand}`);
            } else {
                console.log(`Categoria ${cae} não existe na tabela categories, pulando...`);
            }
        }

        console.log(`Categories_brands atualizada para marca ID: ${idBrand}`);
    } catch (error) {
        console.error('Erro ao atualizar categories_brands:', error);
        // Não propaga o erro para não interromper o processo principal
        console.log('Continuando processo apesar do erro em categories_brands');
    }
}

async function insertCompanyData(data) {
    try {
        const [result] = await pool.execute(
            `INSERT INTO companies (Name, Description, Legal, DUNS, VAT, Score, Sentiment, Status, Source, Created_at, Updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE 
             Name = VALUES(Name), 
             Description = VALUES(Description),
             Updated_at = CURRENT_TIMESTAMP`,
            [
                data.companyName,
                data.companyInfo,
                '',
                '',
                data.nif,
                0,
                0,
                'racius'
            ]
        );

        console.log(`Empresa inserida/atualizada: ${data.companyName}`);

        // Atualiza marca
        await updateBrand({
            NameBrand: data.companyName,
            DescriptionBrand: data.companyInfo,
            Logo: null,
            Vat: data.nif,
            ScoreBrand: 0,
            NumReviews: 0,
            SentimentBrand: 0,
            Source: 'racius'
        });

        // Atualiza endereço
        await updateAddress({
            Vat: data.nif,
            Address: data.address,
            Location: data.location,
            Zipcode: data.zipcode,
            County: data.county,
            District: data.district,
            Country: 'Portugal',
            Parish: null,
            Source: 'racius'
        });

        // Atualiza CAEs e categories_brands
        if (data.caes && data.caes.length > 0) {
            await updateCaesCompanies({
                Vat: data.nif,
                Caes: data.caes,
                Source: 'racius'
            });

            // Atualiza categories_brands com os mesmos CAEs
            await updateCategoriesBrands({
                Vat: data.nif,
                Caes: data.caes,
                Source: 'racius'
            });
        }

    } catch (error) {
        console.error('Erro ao inserir dados da empresa:', error);
        throw error;
    }
}

async function updateBrand(data) {
    try {
        const [companyRows] = await pool.execute(
            'SELECT ID FROM companies WHERE VAT = ?',
            [data.Vat]
        );

        if (companyRows.length === 0) {
            console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
            return;
        }

        const idCompany = companyRows[0].ID;

        const [existingRows] = await pool.execute(
            'SELECT Source FROM brands WHERE VAT = ?',
            [data.Vat]
        );

        if (existingRows.length > 0) {
            const existingSource = existingRows[0].Source;

            if (existingSource === 'Racius' && data.Source === 'Einforma') {
                console.log(`Atualização ignorada: VAT: ${data.Vat}`);
                return;
            }

            await pool.execute(
                `UPDATE brands 
                 SET Name = ?, Description = ?, Logo = ?, Score = ?, 
                     NumReviews = ?, Sentiment = ?, Status = 1, 
                     Source = ?, Updated_at = CURRENT_TIMESTAMP, 
                     IDCompany = ?, IsPrimary = 1 
                 WHERE VAT = ?`,
                [
                    data.NameBrand,
                    data.DescriptionBrand,
                    data.Logo,
                    data.ScoreBrand,
                    data.NumReviews,
                    data.SentimentBrand,
                    data.Source,
                    idCompany,
                    data.Vat
                ]
            );
            console.log(`Marca atualizada. VAT: ${data.Vat}`);
        } else {
            await pool.execute(
                `INSERT INTO brands (Name, Description, Logo, VAT, Score, 
                                   NumReviews, Sentiment, Status, Source, 
                                   Created_at, Updated_at, IDCompany, IsPrimary)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 
                         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 1)`,
                [
                    data.NameBrand,
                    data.DescriptionBrand,
                    data.Logo,
                    data.Vat,
                    data.ScoreBrand,
                    data.NumReviews,
                    data.SentimentBrand,
                    data.Source,
                    idCompany
                ]
            );
            console.log(`Marca inserida. VAT: ${data.Vat}`);
        }
    } catch (error) {
        console.error('Erro ao atualizar marca:', error);
        throw error;
    }
}

async function updateAddress(data) {
    try {
        const [brandRows] = await pool.execute(
            `SELECT b.ID 
             FROM brands b
             JOIN companies c ON b.IDCompany = c.ID
             WHERE c.VAT = ?`,
            [data.Vat]
        );

        if (brandRows.length === 0) {
            console.log(`Nenhuma marca encontrada com o VAT: ${data.Vat}`);
            return;
        }

        const idBrand = brandRows[0].ID;

        const [existingRows] = await pool.execute(
            'SELECT Source FROM addresses WHERE IDBrand = ?',
            [idBrand]
        );

        if (existingRows.length > 0) {
            const existingSource = existingRows[0].Source;

            if (existingSource === 'Racius' && data.Source === 'Einforma') {
                console.log(`Atualização de endereço ignorada: IDBrand: ${idBrand}`);
                return;
            }

            await pool.execute(
                `UPDATE addresses 
                 SET Address = ?, Location = ?, Zipcode = ?, 
                     County = ?, District = ?, Country = ?, 
                     Parish = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, 
                     IsPrimary = 1, Source = ? 
                 WHERE IDBrand = ?`,
                [
                    data.Address,
                    data.Location,
                    data.Zipcode,
                    data.County,
                    data.District,
                    data.Country,
                    data.Parish,
                    data.Source,
                    idBrand
                ]
            );
            console.log(`Endereço atualizado. IDBrand: ${idBrand}`);
        } else {
            await pool.execute(
                `INSERT INTO addresses (IDBrand, Address, Location, Zipcode, 
                                      County, District, Country, Parish, 
                                      Status, Created_at, Updated_at, 
                                      IsPrimary, Source)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 
                         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)`,
                [
                    idBrand,
                    data.Address,
                    data.Location,
                    data.Zipcode,
                    data.County,
                    data.District,
                    data.Country,
                    data.Parish,
                    data.Source
                ]
            );
            console.log(`Endereço inserido. IDBrand: ${idBrand}`);
        }
    } catch (error) {
        console.error('Erro ao atualizar endereço:', error);
        throw error;
    }
}

async function updateCaesCompanies(data) {
    try {
        // Filtrar CAEs vazios ou inválidos
        const validCaes = data.Caes.filter(cae => /^\d+$/.test(cae));

        if (validCaes.length === 0) {
            console.log(`Nenhum CAE válido para processar. VAT: ${data.Vat}`);
            return;
        }

        const [companyRows] = await pool.execute(
            'SELECT ID FROM companies WHERE VAT = ?',
            [data.Vat]
        );

        if (companyRows.length === 0) {
            console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
            return;
        }

        const idCompany = companyRows[0].ID;

        // Verifica e insere CAEs se necessário
        for (const cae of validCaes) {
            const [existingCae] = await pool.execute(
                'SELECT Code FROM caes WHERE Code = ?',
                [cae]
            );

            if (existingCae.length === 0) {
                await pool.execute(
                    `INSERT INTO caes (Code, Description, Status, Source) 
                     VALUES (?, ?, 1, ?)`,
                    [cae, 'Descrição pendente', data.Source]
                );
                console.log(`CAE ${cae} inserido na tabela caes`);
            }
        }

        // Limpa CAEs existentes da empresa
        await pool.execute(
            'DELETE FROM caes_companies WHERE IDCompany = ?',
            [idCompany]
        );

        // Insere os novos CAEs
        for (const cae of validCaes) {
            await pool.execute(
                `INSERT INTO caes_companies (CAE, IDCompany, Source) 
                 VALUES (?, ?, ?)`,
                [cae, idCompany, data.Source]
            );
            console.log(`CAE ${cae} associado à empresa ID: ${idCompany}`);
        }

        console.log(`CAEs atualizados para empresa ID: ${idCompany}`);
    } catch (error) {
        console.error('Erro ao atualizar CAEs:', error);
        throw error;
    }
}

async function scrapeData(slug) {
    try {
        const url = `https://www.racius.com/${slug}`;
        const proxyAgent = new SocksProxyAgent(TOR_SOCKS_PROXY);

        const config = {
            url: url,
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

        console.log(`\nScraping URL: ${url}...`);
        const { data } = await axios(config);
        const $ = cheerio.load(data);

        // Extração do nome da empresa
        const companyName = $('.company__name').text().trim() || 'N/A';

        // Extração do NIF
        const nif = $('.company-info__data').text().trim() || 'N/A';

        // Extração da morada completa e localização
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
                // Pega a morada completa do elemento t--d-blue
                const fullAddress = $(element).find('.px-md--2 .t--d-blue').first().text().trim();
                
                if (fullAddress) {
                    // Extrai o código postal e a localidade
                    const postalMatch = fullAddress.match(/(\d{4}-\d{3})\s*([^,]+)$/);
                    if (postalMatch) {
                        locationInfo.zipcode = postalMatch[1];
                        locationInfo.location = postalMatch[2].trim();
                    }

                    // Extrai o endereço (tudo antes do código postal)
                    const addressParts = fullAddress.split(/\d{4}-\d{3}/);
                    if (addressParts.length > 0) {
                        locationInfo.address = addressParts[0].trim() || 'N/A';
                    }
                }

                // Pega o distrito e concelho
                locationInfo.county = $(element).find('.t-md--right .detail__key-info').text().trim() || 'N/A';
                locationInfo.district = $(element).find('.t-md--right .t--d-blue').text().trim() || 'N/A';
            }
        });

        // Descrição da empresa
        const companyInfo = $('#about').text().trim() || 'N/A';

        // Extração dos CAEs
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

        // Se não encontrou nenhum CAE, adiciona N/A ao array
        if (caes.length === 0) {
            caes.push('N/A');
        }

        const companyData = {
            companyName: companyName,
            nif: nif,
            companyInfo: companyInfo,
            address: locationInfo.address,
            location: locationInfo.location,
            zipcode: locationInfo.zipcode,
            county: locationInfo.county,
            district: locationInfo.district,
            caes: caes
        };

        console.log('Dados extraídos:', {
            empresa: companyData.companyName,
            nif: companyData.nif,
            morada: companyData.address,
            codigoPostal: companyData.zipcode,
            localidade: companyData.location,
            concelho: companyData.county,
            distrito: companyData.district
        });

        if (companyData.companyName !== 'N/A' && companyData.nif !== 'N/A') {
            await insertCompanyData(companyData);
        } else {
            console.log('Dados insuficientes para inserção:', {
                nome: companyData.companyName !== 'N/A' ? 'OK' : 'Faltando',
                nif: companyData.nif !== 'N/A' ? 'OK' : 'Faltando'
            });
        }

        requestCount++;

        if (requestCount % 20 === 0) {
            console.log('\nRenovando circuito Tor após 20 requisições...');
            await safeRenewTorCircuit();
            const newIP = await getCurrentIP();
            console.log(`Novo IP: ${newIP}`);
        }
    } catch (error) {
        console.error(`Erro no scraping: ${error.message}`);
        if (error.response?.status === 403 || error.response?.status === 429) {
            console.log('Possível bloqueio detectado. Renovando circuito Tor...');
            await safeRenewTorCircuit();
            const newIP = await getCurrentIP();
            console.log(`Novo IP: ${newIP}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function Racius() {
    try {
        // Buscar todos os NIFs da tabela RaciusLinksNifs
        const [rows] = await pool.execute('SELECT NIF FROM RaciusLinks WHERE nif IS NOT NULL');
        const nifs = rows.map(row => row.nif);

        console.log(`Total de NIFs para processar: ${nifs.length}`);
        const initialIP = await getCurrentIP();
        console.log(`IP inicial: ${initialIP}\n`);

        for (const nif of nifs) {
            if (nif) {
                await scrapeData(nif); // Processa o NIF (substituindo scrapeData para o contexto do NIF)
                await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos entre cada requisição
            }
        }

        console.log('\nProcessamento concluído!');
        console.log(`Total de requisições feitas: ${requestCount}`);
        console.log(`Total de renovações do circuito Tor: ${newnymRequestCount}`);
    } catch (error) {
        console.error('Erro ao processar os NIFs:', error);
    } finally {
        await pool.end(); // Finaliza a conexão com o banco de dados
    }
}


Racius()

// Exportação
module.exports = {
    Racius
};