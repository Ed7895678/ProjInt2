// Guilherme Dias
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

// Common pages where emails are typically found
const commonPages = [
    // Privacy and Terms
    'privacidade', 'privacy', 'privacypolicy', 'política-de-privacidade', 'politica-privacidade',
    'termos', 'terms', 'termsofservice', 'termos-e-condicoes', 'termos-condicoes',
    'cookies', 'cookie-policy', 'politica-cookies',
    'aviso-legal', 'legal',
    
    // Contacts
    'contactos', 'contacts', 'contact', 'contato', 'contacto',
    'fale-conosco', 'fale-connosco', 'contact-us', 'contacte-nos',
    'suporte', 'support',
    'atendimento', 'customer-service',
    'apoio-cliente', 'customer-support',
    
    // About
    'sobre', 'about', 'about-us', 'quem-somos', 'who-we-are',
    'equipa', 'team', 'nossa-equipa', 'our-team',
    'empresa', 'company', 'about-company',
    
    // Business Information
    'informacoes-legais', 'legal-info',
    'dados-empresa', 'company-info',
    'faturacao', 'billing',
    'pagamento', 'payment'
];

// Base keywords that can be combined
const baseKeywords = [
    'apoio',
    'cliente',
    'geral',
    'tomar',
    'comercial',
    'contact',
    'contacto',
    'info',
    'atendimento'
];

// Function to generate keyword combinations
function generateKeywordCombinations() {
    const combinations = new Set([...baseKeywords]); // Start with individual keywords
    
    // Add common separators
    const separators = ['', '.', '-', '_'];
    
    // Generate two-word combinations
    for (let i = 0; i < baseKeywords.length; i++) {
        for (let j = 0; j < baseKeywords.length; j++) {
            if (i !== j) {
                for (const separator of separators) {
                    combinations.add(`${baseKeywords[i]}${separator}${baseKeywords[j]}`);
                }
            }
        }
    }

    // Add specific common combinations
    combinations.add('apoiocliente');
    combinations.add('apoio.cliente');
    combinations.add('apoio-cliente');
    combinations.add('apoio_cliente');
    combinations.add('contactogeral');
    combinations.add('infogeral');
    combinations.add('contactocomercial');
    combinations.add('infocomercial');
    combinations.add('atendimentogeral');
    combinations.add('atendimentocliente');

    return Array.from(combinations);
}

// Generate all valid keyword combinations
const validKeywords = generateKeywordCombinations();

function extractDomainName(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        // Remove 'www.' if present and get the domain name without TLD
        const domainName = hostname.replace(/^www\./, '').split('.')[0];
        return domainName.toLowerCase();
    } catch (error) {
        console.error(`Error extracting domain name from ${url}:`, error);
        return '';
    }
}

function isValidLocalPart(localPart, url) {
    const normalizedLocalPart = localPart.toLowerCase();
    const domainName = extractDomainName(url);

    // First check if local part is exactly equal to a keyword or valid combination
    if (validKeywords.includes(normalizedLocalPart)) {
        return true;
    }

    // Check if local part is exactly equal to the domain name
    if (domainName && normalizedLocalPart === domainName.toLowerCase()) {
        return true;
    }

    // If not an exact keyword, check if it's a valid combination with separators
    const separators = ['.', '-', '_'];
    const parts = normalizedLocalPart.split(/[.\-_]/);

    // Check if all parts are valid keywords or domain name
    const allPartsValid = parts.every(part => 
        validKeywords.includes(part) || 
        (domainName && part === domainName.toLowerCase())
    );

    // Check if local part only contains allowed characters
    const onlyValidChars = localPart
        .split('')
        .every(char => 
            baseKeywords.some(keyword => keyword.includes(char.toLowerCase())) ||
            separators.includes(char) ||
            (domainName && domainName.toLowerCase().includes(char.toLowerCase()))
        );

    return allPartsValid && onlyValidChars;
}

function isValidEmail(email, url) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    if (/[\s\n\r\t]/.test(email)) {
        return false;
    }

    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart || (domainPart.match(/\./g) || []).length !== 1) {
        return false;
    }

    if (localPart.length < 1 || localPart.length > 64 || domainPart.length < 4 || domainPart.length > 255) {
        return false;
    }

    if (email.toLowerCase().endsWith('.png')) {
        return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return false;
    }

    return isValidLocalPart(localPart, url);
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

async function findPossiblePaths(page, baseUrl) {
    try {
        return await page.evaluate((commonPages) => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .map(link => {
                    const href = link.href;
                    const text = link.textContent.toLowerCase().trim();
                    return { href, text };
                })
                .filter(({ href, text }) => {
                    if (!href || href.endsWith('#')) return false;
                    const isRelevant = commonPages.some(keyword => {
                        return text.includes(keyword) || href.toLowerCase().includes(keyword);
                    });
                    return isRelevant && href.startsWith(window.location.origin);
                })
                .map(({ href }) => href);
        }, commonPages);
    } catch (error) {
        console.error('Error finding paths:', error);
        return [];
    }
}

async function extractEmailsFromPage(page, url) {
    const emails = new Set();

    try {
        const pageContent = await page.content();
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const foundEmails = pageContent.match(emailRegex) || [];
        foundEmails.forEach(email => {
            if (isValidEmail(email, url)) {
                emails.add(email);
            }
        });

        const newEmails = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const found = new Set();
            
            elements.forEach(element => {
                const text = element.textContent || '';
                const matches = text.match(emailRegex) || [];
                matches.forEach(email => found.add(email));
            });

            return Array.from(found);
        });

        newEmails.forEach(email => {
            if (isValidEmail(email, url)) {
                emails.add(email);
            }
        });
    } catch (error) {
        console.error('Error extracting emails from page:', error);
    }

    return Array.from(emails);
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

async function updateContacts(data, idBrand) {
    try {
        const updateContact = `UPDATE contacts SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE IDBrand = ? AND Contact = ?`;
        const [result] = await pool.execute(updateContact, [
            data.TypeContact,
            data.Source,
            idBrand,
            data.Contact
        ]);
        
        if (result.affectedRows === 0) {
            const insertContact = `INSERT INTO contacts (Contact, Type, Status, Created_at, Updated_at, IsPrimary, IDBrand, Source) 
                                 VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?, ?)`;
            await pool.execute(insertContact, [
                data.Contact,
                data.TypeContact,
                idBrand,
                data.Source
            ]);
            console.log(`Contact inserted for Brand ID: ${idBrand}`);
            return;
        }
        console.log(`Contact updated for Brand ID: ${idBrand}`);
    } catch (error) {
        console.error(`Error updating/inserting contact for Brand ID ${idBrand}:`, error);
    }
}

async function saveEmailsToDatabase(url, emails, brandId) {
    try {
        // First, get existing contacts for this brand to avoid duplicates
        const [existingContacts] = await pool.query(
            'SELECT Contact FROM contacts WHERE IDBrand = ? AND Type = "email"',
            [brandId]
        );
        const existingEmails = new Set(existingContacts.map(row => row.Contact.toLowerCase()));

        for (const email of emails) {
            if (!existingEmails.has(email.toLowerCase())) {
                // Insert new contact with all required fields
                const insertContact = `
                    INSERT INTO contacts (
                        Contact,
                        IDBrand,
                        Type,
                        Status,
                        Created_at,
                        Updated_at,
                        IsPrimary,
                        Source
                    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`;

                await pool.execute(insertContact, [
                    email,           // Contact
                    brandId,         // IDBrand
                    'email',         // Type
                    1,              // Status (1 for active)
                    1,              // IsPrimary (1 for primary contact)
                    url             // Source
                ]);

                console.log(`New email contact inserted: ${email} for Brand ID: ${brandId}`);
            } else {
                // Update existing contact
                const updateContact = `
                    UPDATE contacts 
                    SET 
                        Status = 1,
                        Updated_at = CURRENT_TIMESTAMP,
                        IsPrimary = 1,
                        Source = ?
                    WHERE IDBrand = ? AND Contact = ? AND Type = "email"`;

                await pool.execute(updateContact, [
                    url,            // Source
                    brandId,        // IDBrand
                    email          // Contact
                ]);

                console.log(`Existing email contact updated: ${email} for Brand ID: ${brandId}`);
            }
        }

        console.log(`Processed ${emails.length} emails for URL: ${url}`);
    } catch (error) {
        console.error(`Error saving emails to database for ${url}:`, error);
    }
}

async function scrapeEmailsFromUrl(browser, url, brandId) {
    const page = await browser.newPage();
    const allEmails = new Set();
    const visitedUrls = new Set();

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

        console.log(`\nAnalyzing main page: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        visitedUrls.add(url);

        await autoScroll(page);
        await delay(1000);

        const mainPageEmails = await extractEmailsFromPage(page, url);
        mainPageEmails.forEach(email => allEmails.add(email));
        console.log(`Valid emails found on main page: ${mainPageEmails.length}`);

        const relevantPaths = await findPossiblePaths(page, url);
        const filteredPaths = relevantPaths.filter(path => !path.includes('#'));
        console.log(`Found ${filteredPaths.length} relevant links`);

        for (const path of filteredPaths) {
            if (visitedUrls.has(path)) continue;
            
            try {
                console.log(`Visiting: ${path}`);
                const response = await page.goto(path, { waitUntil: 'networkidle0' });
                
                if (!response.ok()) {
                    console.log(`Page returned status ${response.status()}: ${path}`);
                    continue;
                }

                visitedUrls.add(path);
                await autoScroll(page);
                await delay(1000);

                const pageEmails = await extractEmailsFromPage(page, url);
                pageEmails.forEach(email => allEmails.add(email));
                
                console.log(`Valid emails found on this page: ${pageEmails.length}`);

                await delay(500);
            } catch (error) {
                console.error(`Error visiting ${path}:`, error.message);
                continue;
            }
        }

    } catch (error) {
        console.error(`Error processing ${url}:`, error);
    } finally {
        if (allEmails.size > 0) {
            await saveEmailsToDatabase(url, Array.from(allEmails), brandId);
        }
        await page.close();
    }

    return Array.from(allEmails);
}

async function extractEmails(urls) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const allEmails = new Set();

        try {
            for (const {id, url, brandId} of urls) {
                console.log(`\nProcessing site: ${url} (ID: ${id}, Brand: ${brandId})`);
                await updateLinkStatus(id, 2); // Status 2: Processing
                
                try {
                    const emails = await scrapeEmailsFromUrl(browser, url, brandId);
                    emails.forEach(email => allEmails.add(email));
                    await updateLinkStatus(id, 3); // Status 3: Processed
                } catch (error) {
                    console.error(`Failed to process ${url}:`, error);
                    await updateLinkStatus(id, 4); // Status 4: Error
                }
                
                console.log(`Total unique valid emails found so far: ${allEmails.size}`);
            }
        } finally {
            await browser.close();
        }

        return Array.from(allEmails);

    } catch (error) {
        console.error('Error during scraping:', error);
        return [];
    }
}

async function main() {
    try {
        console.log('Starting email extraction process...');
        
        await resetProcessingStatus();
        const urls = await getUrlsFromDatabase();
        
        if (urls.length === 0) {
            console.log('No URLs found in database to process');
            return;
        }

        console.log(`Found ${urls.length} URLs to process`);
        const results = await extractEmails(urls);
        
        console.log('\nProcessing completed!');
        console.log(`Total unique valid emails found: ${results.length}`);
        
    } catch (error) {
        console.error('Error in program execution:', error);
    } finally {
        await pool.end();
    }
}

// Start the script
main();