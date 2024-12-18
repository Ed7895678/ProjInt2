const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2');
const { updateContacts } = require('./UpdateDatabase')

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

const commonPages = [
    'contactos', 'contacts', 'contact', 'contato', 'contacto',
    'fale-conosco', 'fale-connosco', 'contact-us', 'contacte-nos',
    'suporte', 'support', 'atendimento', 'customer-service',
    'apoio-cliente', 'customer-support', 'sobre', 'about', 
    'about-us', 'quem-somos', 'who-we-are', 'empresa', 'company',
    'about-company', 'rodape', 'footer', 'informacoes', 'information'
];

function cleanPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('351')) {
        cleaned = cleaned.slice(3);
    }
    return cleaned;
}

function isValidPortuguesePhone(phone) {
    const cleaned = cleanPhoneNumber(phone);
    if (cleaned.length !== 9) return false;
    if (!['2', '3', '9'].includes(cleaned[0])) return false;
    if (cleaned[0] === '9') {
        if (!['1','2','3','4','5','6','9'].includes(cleaned[1])) return false;
    }
    return true;
}

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
        console.error('Error fetching URLs:', error);
        return [];
    }
}

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
        console.error('Error extracting phone numbers:', error);
        return [];
    }
}

async function savePhoneToDatabase(phones, vat) {
    try {
        for (const phone of phones) {
            await updateContacts({
                Vat: vat,
                Contact: phone,
                TypeContact: 'telemovel',
                Source: 'website'
            });
            console.log(`Saved phone: ${phone} for VAT: ${vat}`);
        }
    } catch (error) {
        console.error(`Error saving phones for VAT ${vat}:`, error);
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function scrapePhoneFromUrl(browser, url, vat) {
    const page = await browser.newPage();
    let phonesFound = [];

    try {
        await page.setDefaultNavigationTimeout(30000);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.resourceType() === 'image' || req.resourceType() === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`\nChecking: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await autoScroll(page);
        await delay(1000);
        
        const phones = await extractPhoneFromPage(page);
        if (phones.length > 0) {
            phonesFound = phones;
            await savePhoneToDatabase(phonesFound, vat);
            return phonesFound;
        }

        const links = await page.$$eval('a', (elements) => elements.map(el => el.href));
        for (const link of links) {
            if (phonesFound.length === 0 && link.startsWith(url)) {
                for (const commonPage of commonPages) {
                    if (link.toLowerCase().includes(commonPage)) {
                        try {
                            console.log(`Checking subpage: ${link}`);
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
                            console.error(`Error checking ${link}:`, error.message);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing ${url}:`, error);
    } finally {
        await page.close();
    }

    return phonesFound;
}

async function Numeros() {
    try {
        console.log('Starting phone number extraction...');
        
        const urls = await getUrlsFromDatabase();
        if (urls.length === 0) {
            console.log('No URLs found to process');
            return;
        }

        console.log(`Found ${urls.length} URLs to process`);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            for (const {Url, VAT} of urls) {
                console.log(`\nProcessing: ${Url}`);
                const phones = await scrapePhoneFromUrl(browser, Url, VAT);
                if (phones.length > 0) {
                    console.log(`Found phones: ${phones.join(', ')}`);
                }
            }
        } finally {
            await browser.close();
        }
        
        console.log('\nProcessing completed!');
        
    } catch (error) {
        console.error('Error in execution:', error);
    } finally {
        await pool.end();
    }
}

Numeros()

// Exportação
module.exports = {
    Numeros
};