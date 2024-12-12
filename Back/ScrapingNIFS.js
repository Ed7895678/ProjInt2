const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

// Database Configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2'
};

const pool = mysql.createPool(dbConfig);

// Database Functions
async function readUrlsFromDatabase() {
    try {
        const [rows] = await pool.execute(
            'SELECT Url FROM links WHERE Type = "Website" AND Status = 1'
        );
        
        if (!rows || rows.length === 0) {
            console.log('No URLs found in the database');
            return [];
        }

        console.log(`Found ${rows.length} URLs in the database`);
        return rows.map(row => row.Url);

    } catch (error) {
        console.error('Database connection error:', error);
        console.error('Error details:', error.message);
        return [];
    }
}

async function checkExistingCompany(nif) {
    try {
        const checkSourceQuery = 'SELECT Source FROM companies WHERE VAT = ?';
        const [rows] = await pool.execute(checkSourceQuery, [nif]);
        
        if (rows && rows.length > 0) {
            return rows[0].Source;
        }
        return null;
    } catch (error) {
        console.error('Error checking company source:', error);
        return null;
    }
}

// Browser Setup Functions
async function setupBrowser() {
    return await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080'
        ]
    });
}

async function setupPage(browser, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setDefaultNavigationTimeout(60000);
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            return page;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed to create page:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

async function navigateToPage(page, url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            return true;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed to navigate to ${url}:`, error.message);
            if (i === retries - 1) return false;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
}

// Validation Functions
function validateNIF(nif) {
    nif = nif.toString().trim().replace(/[\s-\.]/g, '');
    if (!/^\d{9}$/.test(nif)) return false;

    const multipliers = [9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 8; i++) {
        sum += parseInt(nif[i]) * multipliers[i];
    }

    const checkDigit = (sum % 11) < 2 ? 0 : 11 - (sum % 11);
    return parseInt(nif[8]) === checkDigit;
}

function isLikelyPhoneNumber(number, surroundingText) {
    const cleanNumber = number.replace(/[\s\-\.]/g, '');
    
    const phonePatterns = [
        /^2\d{8}$/, // Landline starting with 2
        /^707\d{6}$/, // Service numbers
        /^808\d{6}$/, // Service numbers
        /^800\d{6}$/, // Toll-free
        /^9\d{8}$/, // Mobile
        /^3\d{8}$/ // Virtual numbers
    ];

    const matchesPhonePattern = phonePatterns.some(pattern => pattern.test(cleanNumber));

    const phoneKeywords = [
        'tel', 'telf', 'telefone', 'phone', 'mobile', 'contacto',
        'ligar', 'chamada', 'call', 'fax', 'whatsapp',
        'linha', 'apoio', 'suporte', 'atendimento'
    ];

    const hasPhoneContext = phoneKeywords.some(keyword => 
        surroundingText.toLowerCase().includes(keyword)
    );

    return matchesPhonePattern || hasPhoneContext;
}

function isLikelyNIF(number, surroundingText) {
    const nifKeywords = [
        'nif', 'contribuinte', 'fiscal', 'vat',
        'nipc', 'tax', 'identification', 'empresa',
        'matricula', 'regist'
    ];

    const hasNIFContext = nifKeywords.some(keyword => 
        surroundingText.toLowerCase().includes(keyword)
    );

    if (number.startsWith('2')) {
        return hasNIFContext;
    }

    return hasNIFContext || !isLikelyPhoneNumber(number, surroundingText);
}

function formatNIF(nif) {
    return nif.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
}

// Scraping Functions
async function extractRelevantLinks(page, baseUrl) {
    try {
        return await page.evaluate((baseUrl) => {
            const relevantKeywords = [
                'contactos', 'contacto', 'contacts', 'contact',
                'sobre', 'sobre-nos', 'quem-somos', 'about', 'about-us',
                'empresa', 'company',
                'informacao', 'informacoes', 'information',
                'legal', 'termos', 'terms',
                'privacidade', 'privacy',
                'contribuinte', 'fiscal', 'nif'
            ];

            const links = Array.from(document.querySelectorAll('a'))
                .map(a => ({
                    href: a.href,
                    text: (a.textContent || '').toLowerCase().trim()
                }))
                .filter(link => {
                    if (!link.href || !link.href.startsWith(baseUrl)) return false;
                    if (link.href === baseUrl || link.href === baseUrl + '/') return false;

                    const urlPath = link.href.toLowerCase();
                    const hasKeywordInUrl = relevantKeywords.some(keyword => urlPath.includes(keyword));
                    const hasKeywordInText = relevantKeywords.some(keyword => link.text.includes(keyword));

                    return hasKeywordInUrl || hasKeywordInText;
                })
                .map(link => link.href);

            return [...new Set(links)];
        }, baseUrl);
    } catch (error) {
        console.error('Error extracting links:', error);
        return [];
    }
}

async function extractNumbersFromPage(page) {
    try {
        return await page.evaluate(() => {
            function findNumbersWithContext(text, elementContext = '') {
                if (!text || typeof text !== 'string') return [];
                
                let cleanText = text
                    .replace(/[\n\r\t]+/g, ' ')
                    .replace(/\s+/g, ' ');
                
                const numberPatterns = [
                    /\b\d{9}\b/g,
                    /\b\d{3}[. ]\d{3}[. ]\d{3}\b/g,
                    /\b\d{3}\s*\d{3}\s*\d{3}\b/g
                ];

                const results = [];
                
                numberPatterns.forEach(pattern => {
                    const matches = cleanText.match(pattern) || [];
                    matches.forEach(match => {
                        const cleanNumber = match.replace(/[^0-9]/g, '');
                        if (cleanNumber.length === 9) {
                            const startIndex = Math.max(0, cleanText.indexOf(match) - 50);
                            const endIndex = Math.min(cleanText.length, cleanText.indexOf(match) + match.length + 50);
                            const context = cleanText.substring(startIndex, endIndex);
                            
                            results.push({
                                number: cleanNumber,
                                context: context + ' ' + elementContext
                            });
                        }
                    });
                });

                return results;
            }

            function extractElementContent(element) {
                let text = '';
                let context = '';

                // Handle input elements
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    text = element.value || '';
                    const label = document.querySelector(`label[for="${element.id}"]`);
                    if (label) {
                        context += label.textContent + ' ';
                    }
                } else {
                    text = element.textContent || '';
                }

                // Extract additional context from attributes
                ['aria-label', 'placeholder', 'title', 'name', 'data-content'].forEach(attr => {
                    if (element.hasAttribute(attr)) {
                        context += element.getAttribute(attr) + ' ';
                    }
                });

                // Get context from parent elements
                let parent = element.parentElement;
                let depth = 0;
                while (parent && depth < 3) {
                    context += parent.textContent + ' ';
                    parent = parent.parentElement;
                    depth++;
                }

                return { text, context };
            }

            const potentialNumbers = [];
            const elements = document.getElementsByTagName('*');

            for (let element of elements) {
                const { text, context } = extractElementContent(element);
                const numbers = findNumbersWithContext(text, context);
                potentialNumbers.push(...numbers);
            }

            return potentialNumbers;
        });
    } catch (error) {
        console.error('Error extracting numbers from page:', error);
        return [];
    }
}

async function scrapeNIFs(url, browser) {
    let page = null;
    const visitedUrls = new Set();
    const allNumbers = new Set();

    try {
        page = await setupPage(browser);
        if (!page) throw new Error('Failed to create page');

        console.log(`\nAccessing ${url}...`);
        const mainPageSuccess = await navigateToPage(page, url);
        if (!mainPageSuccess) {
            throw new Error('Failed to access main page');
        }

        const mainPageNumbers = await extractNumbersFromPage(page);
        mainPageNumbers.forEach(num => allNumbers.add(JSON.stringify(num)));

        const relevantLinks = await extractRelevantLinks(page, url);
        console.log(`Found ${relevantLinks.length} relevant pages to check`);

        for (const link of relevantLinks) {
            if (visitedUrls.has(link)) continue;
            visitedUrls.add(link);

            try {
                if (page.isClosed()) {
                    page = await setupPage(browser);
                    if (!page) continue;
                }

                console.log(`Checking ${link}...`);
                const success = await navigateToPage(page, link);
                if (!success) continue;

                const pageNumbers = await extractNumbersFromPage(page);
                pageNumbers.forEach(num => allNumbers.add(JSON.stringify(num)));

                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (navigationError) {
                console.error(`Error accessing ${link}:`, navigationError.message);
                if (page.isClosed()) {
                    page = await setupPage(browser);
                }
                continue;
            }
        }

        const validNIFs = await Promise.all(
            Array.from(allNumbers)
                .map(numStr => JSON.parse(numStr))
                .filter(num => !isLikelyPhoneNumber(num.number, num.context))
                .filter(num => isLikelyNIF(num.number, num.context))
                .filter(num => validateNIF(num.number))
                .map(async num => {
                    const existingSource = await checkExistingCompany(num.number);
                    return {
                        original: num.number,
                        formatted: formatNIF(num.number),
                        context: num.context.trim(),
                        existingSource: existingSource
                    };
                })
        );

        return {
            url,
            totalFound: allNumbers.size,
            validNIFs: validNIFs.length,
            nifs: validNIFs,
            pagesChecked: visitedUrls.size + 1
        };

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        return {
            url,
            totalFound: 0,
            validNIFs: 0,
            nifs: [],
            pagesChecked: visitedUrls.size + 1,
            error: error.message
        };
    } finally {
        if (page && !page.isClosed()) {
            try {
                await page.close();
            } catch (closeError) {
                console.error('Error closing page:', closeError);
            }
        }
    }
}

async function saveResults(results, timestamp) {
    const outputDir = './results';
    const fileName = `nifs_${timestamp}.json`;
    const summaryFileName = `summary_${timestamp}.txt`;

    try {
        await fs.mkdir(outputDir, { recursive: true });

        const jsonPath = path.join(outputDir, fileName);
        await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));

        const summaryPath = path.join(outputDir, summaryFileName);
        let summaryContent = 'RELATÓRIO DE PESQUISA DE NIFS\n';
        summaryContent += `Data de Execução: ${new Date().toLocaleString()}\n`;
        summaryContent += '='.repeat(50) + '\n\n';

        results.forEach(result => {
            summaryContent += `\nURL: ${result.url}\n`;
            summaryContent += `Páginas verificadas: ${result.pagesChecked}\n`;
            summaryContent += `Total de números encontrados: ${result.totalFound}\n`;
            summaryContent += `NIFs válidos: ${result.validNIFs}\n`;

            if (result.nifs.length > 0) {
                summaryContent += '\nNIFs válidos encontrados:\n';
                result.nifs.forEach(nif => {
                    summaryContent += `- ${nif.formatted}\n`;
                    summaryContent += `  Contexto: ${nif.context}\n`;
                    if (nif.existingSource) {
                        summaryContent += `  Fonte Existente: ${nif.existingSource}\n`;
                    }
                });
            }

            if (result.error) {
                summaryContent += `Erro: ${result.error}\n`;
            }

            summaryContent += '-'.repeat(50) + '\n';
        });

        await fs.writeFile(summaryPath, summaryContent);

        console.log(`\nResultados salvos em:`);
        console.log(`- Detalhado: ${jsonPath}`);
        console.log(`- Resumo: ${summaryPath}`);

    } catch (error) {
        console.error('Erro ao salvar resultados:', error);
    }
}

async function main() {
    let browser = null;
    try {
        const urls = await readUrlsFromDatabase();

        if (urls.length === 0) {
            console.error('No URLs found in the database');
            process.exit(1);
        }

        console.log(`Found ${urls.length} URLs to process`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const results = [];

        browser = await setupBrowser();

        for (const url of urls) {
            try {
                const result = await scrapeNIFs(url, browser);
                results.push(result);

                console.log(`\nResults for ${url}:`);
                console.log(`Pages checked: ${result.pagesChecked}`);
                console.log(`Total numbers found: ${result.totalFound}`);
                console.log(`Valid NIFs: ${result.validNIFs}`);

                // Add delay between processing different sites
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`Error processing ${url}:`, error);
                results.push({
                    url,
                    totalFound: 0,
                    validNIFs: 0,
                    nifs: [],
                    error: error.message
                });
            }
        }

        await saveResults(results, timestamp);

    } catch (error) {
        console.error('Fatal execution error:', error);
    } finally {
        // Cleanup resources
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }

        try {
            await pool.end();
            console.log('Database connection pool closed');
        } catch (dbError) {
            console.error('Error closing database connection:', dbError);
        }
    }
}

// Start the application with global error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

main().catch(error => {
    console.error('Unhandled application error:', error);
    process.exit(1);
});