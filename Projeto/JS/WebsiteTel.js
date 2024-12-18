const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2');

// Create the connection pool with promise wrapper
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Common pages where phone numbers are typically found
const commonPages = [
    // Contact pages
    'contactos', 'contacts', 'contact', 'contato', 'contacto',
    'fale-conosco', 'fale-connosco', 'contact-us', 'contacte-nos',
    'suporte', 'support',
    'atendimento', 'customer-service',
    'apoio-cliente', 'customer-support',
    
    // About pages
    'sobre', 'about', 'about-us', 'quem-somos', 'who-we-are',
    'empresa', 'company', 'about-company',
    
    // Footer pages
    'rodape', 'footer',
    'informacoes', 'information'
];

function cleanPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with country code (351), remove it
    if (cleaned.startsWith('351')) {
        cleaned = cleaned.slice(3);
    }
    
    return cleaned;
}

function isValidPortuguesePhone(phone) {
    const cleaned = cleanPhoneNumber(phone);
    
    // Must be 9 digits and start with 2, 3, or 9
    if (cleaned.length !== 9) return false;
    if (!['2', '3', '9'].includes(cleaned[0])) return false;
    
    // Additional validation for mobile numbers (starting with 9)
    if (cleaned[0] === '9') {
        // Second digit for mobile should be 1-6 or 9
        if (!['1','2','3','4','5','6','9'].includes(cleaned[1])) return false;
    }
    
    return true;
}

async function resetProcessingStatus() {
    try {
        await pool.query(
            `UPDATE links 
             SET Status = 1, Updated_at = NOW() 
             WHERE Type = "website"`
        );
        console.log('Reset status for all URLs');
    } catch (error) {
        console.error('Error resetting status:', error);
    }
}

async function getUrlsFromDatabase() {
    try {
        const [rows] = await pool.query(
            `SELECT l.ID, l.Url, l.IDBrand 
             FROM links l 
             WHERE l.Type = "website" 
             ORDER BY l.ID ASC`
        );
        return rows.map(row => ({
            id: row.ID,
            url: row.Url,
            brandId: row.IDBrand
        }));
    } catch (error) {
        console.error('Error fetching URLs from database:', error);
        return [];
    }
}

async function updateLinkStatus(linkId, status) {
    try {
        await pool.query(
            'UPDATE links SET Status = ?, Updated_at = NOW() WHERE ID = ?',
            [status, linkId]
        );
    } catch (error) {
        console.error(`Error updating link status for ID ${linkId}:`, error);
    }
}

async function extractPhoneFromPage(page) {
    try {
        // Find phone numbers in the page content
        const phoneNumbers = await page.evaluate(() => {
            const text = document.body.innerText;
            // Match various Portuguese phone number formats:
            // - Optional +351 or 351 prefix
            // - Optional spaces or dots between digits
            // - Groups of digits that could form a phone number
            const phonePattern = /(?:(?:\+|00)?351[ .-]?)?(?:2|3|9)[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}[ .-]?\d{1}/g;
            
            return Array.from(new Set(text.match(phonePattern) || []));
        });

        // Filter and clean phone numbers
        return phoneNumbers
            .map(phone => cleanPhoneNumber(phone))
            .filter(phone => isValidPortuguesePhone(phone))
            .slice(0, 2); // Keep up to 2 valid phone numbers
    } catch (error) {
        console.error('Error extracting phone from page:', error);
        return [];
    }
}

async function savePhoneToDatabase(url, phones, brandId) {
    try {
        // Delete existing phone contacts for this brand
        await pool.execute(
            'DELETE FROM contacts WHERE IDBrand = ? AND Type = "telemovel"',
            [brandId]
        );

        // Insert new phone contacts (up to 2)
        for (let i = 0; i < phones.length && i < 2; i++) {
            await pool.execute(
                `INSERT INTO contacts (
                    Contact, IDBrand, Type, Status, Created_at, Updated_at, IsPrimary, Source
                ) VALUES (?, ?, 'telemovel', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'website')`,
                [phones[i], brandId]  // All phones are now primary (IsPrimary = 1)
            );
            console.log(`Phone contact inserted: ${phones[i]} for Brand ID: ${brandId}`);
        }
    } catch (error) {
        console.error(`Error saving phones to database for ${url}:`, error);
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

async function scrapePhoneFromUrl(browser, url, brandId) {
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

        console.log(`\nAnalyzing page: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await autoScroll(page);
        await delay(1000);
        
        const phones = await extractPhoneFromPage(page);
        if (phones.length > 0) {
            phonesFound = phones;
            await savePhoneToDatabase(url, phonesFound, brandId);
            return phonesFound;
        }

        // If no phones found on main page, check common pages
        const links = await page.$$eval('a', (elements) => elements.map(el => el.href));
        for (const link of links) {
            if (phonesFound.length === 0 && link.startsWith(url)) {
                for (const commonPage of commonPages) {
                    if (link.toLowerCase().includes(commonPage)) {
                        try {
                            console.log(`Checking: ${link}`);
                            await page.goto(link, { waitUntil: 'networkidle0' });
                            await autoScroll(page);
                            await delay(1000);
                            
                            const pagePhones = await extractPhoneFromPage(page);
                            if (pagePhones.length > 0) {
                                phonesFound = pagePhones;
                                await savePhoneToDatabase(url, phonesFound, brandId);
                                break;
                            }
                        } catch (error) {
                            console.error(`Error visiting ${link}:`, error.message);
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

async function extractPhones(urls) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            for (const {id, url, brandId} of urls) {
                console.log(`\nProcessing site: ${url} (ID: ${id}, Brand: ${brandId})`);
                await updateLinkStatus(id, 2); // Status 2: Processing
                
                try {
                    const phones = await scrapePhoneFromUrl(browser, url, brandId);
                    if (phones.length > 0) {
                        console.log(`Found valid phone numbers: ${phones.join(', ')}`);
                    }
                    await updateLinkStatus(id, 3); // Status 3: Processed
                } catch (error) {
                    console.error(`Failed to process ${url}:`, error);
                    await updateLinkStatus(id, 4); // Status 4: Error
                }
            }
        } finally {
            await browser.close();
        }

    } catch (error) {
        console.error('Error during scraping:', error);
    }
}

async function main() {
    try {
        console.log('Starting phone number extraction process...');
        
        await resetProcessingStatus();
        const urls = await getUrlsFromDatabase();
        
        if (urls.length === 0) {
            console.log('No URLs found in database to process');
            return;
        }

        console.log(`Found ${urls.length} URLs to process`);
        await extractPhones(urls);
        
        console.log('\nProcessing completed!');
        
    } catch (error) {
        console.error('Error in program execution:', error);
    } finally {
        await pool.end();
    }
}

// Start the script
main();