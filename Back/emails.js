const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Lista de páginas comuns onde encontrar emails
const commonPages = [
    // Privacidade e Termos
    'privacidade', 'privacy', 'privacypolicy', 'política-de-privacidade', 'politica-privacidade',
    'termos', 'terms', 'termsofservice', 'termos-e-condicoes', 'termos-condicoes',
    'cookies', 'cookie-policy', 'politica-cookies',
    'aviso-legal', 'legal',
    
    // Contatos
    'contactos', 'contacts', 'contact', 'contato', 'contacto',
    'fale-conosco', 'fale-connosco', 'contact-us', 'contacte-nos',
    'suporte', 'support',
    'atendimento', 'customer-service',
    'apoio-cliente', 'customer-support',
    
    // Sobre
    'sobre', 'about', 'about-us', 'quem-somos', 'who-we-are',
    'equipa', 'team', 'nossa-equipa', 'our-team',
    'empresa', 'company', 'about-company',
    
    // Informações Empresariais
    'informacoes-legais', 'legal-info',
    'dados-empresa', 'company-info',
    'faturacao', 'billing',
    'pagamento', 'payment'
];

function isValidEmail(email) {
    // Rejeita imediatamente se for null, undefined ou não for string
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Verifica se o email original contém qualquer tipo de espaço ou quebra de linha
    if (/[\s\n\r\t]/.test(email)) {
        return false;
    }

    // Verifica se tem apenas um ponto após o @
    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart || (domainPart.match(/\./g) || []).length !== 1) {
        return false;
    }

    // Verifica tamanho mínimo e máximo das partes
    if (localPart.length < 1 || localPart.length > 64 || domainPart.length < 4 || domainPart.length > 255) {
        return false;
    }

    // Verifica se não termina em .png
    if (email.toLowerCase().endsWith('.png')) {
        return false;
    }

    // Verifica se o formato geral do email é válido
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return false;
    }

    return true;
}

async function readUrlsFromFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data.split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);
    } catch (error) {
        console.error('Erro ao ler o arquivo de URLs:', error);
        return [];
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
        console.error('Erro ao encontrar caminhos:', error);
        return [];
    }
}

async function extractEmailsFromPage(page) {
    const emails = new Set();

    try {
        const pageContent = await page.content();
        // Regex atualizada para capturar emails sem espaços ou quebras de linha
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const foundEmails = pageContent.match(emailRegex) || [];
        foundEmails.forEach(email => {
            if (isValidEmail(email)) {
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
            if (isValidEmail(email)) {
                emails.add(email);
            }
        });
    } catch (error) {
        console.error('Erro ao extrair emails da página:', error);
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

async function saveEmailsForSite(url, emails, outputDir, timestamp) {
    try {
        const outputPath = path.join(outputDir, `emails_${timestamp}.txt`);
        const emailContent = emails.join('\n') + '\n';
        await fs.appendFile(outputPath, emailContent);
        console.log(`Emails salvos em: ${outputPath}`);
    } catch (error) {
        console.error(`Erro ao salvar emails para ${url}:`, error);
    }
}

async function initResultsFile(outputDir, timestamp) {
    try {
        const outputPath = path.join(outputDir, `emails_${timestamp}.txt`);
        await fs.writeFile(outputPath, '');
    } catch (error) {
        console.error('Erro ao inicializar arquivo de resultados:', error);
    }
}

async function scrapeEmailsFromUrl(browser, url, outputDir, timestamp) {
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

        console.log(`\nAnalisando página principal: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        visitedUrls.add(url);

        await autoScroll(page);
        await delay(1000);

        const mainPageEmails = await extractEmailsFromPage(page);
        mainPageEmails.forEach(email => allEmails.add(email));
        console.log(`Emails válidos encontrados na página principal: ${mainPageEmails.length}`);

        const relevantPaths = await findPossiblePaths(page, url);
        const filteredPaths = relevantPaths.filter(path => !path.includes('#'));
        console.log(`Encontrados ${filteredPaths.length} links relevantes`);

        for (const path of filteredPaths) {
            if (visitedUrls.has(path)) continue;
            
            try {
                console.log(`Visitando: ${path}`);
                const response = await page.goto(path, { waitUntil: 'networkidle0' });
                
                if (!response.ok()) {
                    console.log(`Página retornou status ${response.status()}: ${path}`);
                    continue;
                }

                visitedUrls.add(path);
                await autoScroll(page);
                await delay(1000);

                const pageEmails = await extractEmailsFromPage(page);
                pageEmails.forEach(email => allEmails.add(email));
                
                console.log(`Emails válidos encontrados nesta página: ${pageEmails.length}`);

                await delay(500);
            } catch (error) {
                console.error(`Erro ao visitar ${path}:`, error.message);
                continue;
            }
        }

    } catch (error) {
        console.error(`Erro ao processar ${url}:`, error);
    } finally {
        if (allEmails.size > 0) {
            await saveEmailsForSite(url, Array.from(allEmails), outputDir, timestamp);
        }
        await page.close();
    }

    return Array.from(allEmails);
}

async function extractEmails(urls) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = './resultados';
    
    try {
        await fs.mkdir(outputDir, { recursive: true });
        await initResultsFile(outputDir, timestamp);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const allEmails = new Set();

        try {
            for (const url of urls) {
                console.log(`\nProcessando site: ${url}`);
                const emails = await scrapeEmailsFromUrl(browser, url, outputDir, timestamp);
                emails.forEach(email => allEmails.add(email));
                console.log(`Total de emails válidos únicos encontrados até agora: ${allEmails.size}`);
            }
        } finally {
            await browser.close();
        }

        return Array.from(allEmails);

    } catch (error) {
        console.error('Erro durante o scraping:', error);
        return [];
    }
}

async function main() {
    try {
        const urls = await readUrlsFromFile('sites.txt');
        
        if (urls.length === 0) {
            console.log('Nenhuma URL encontrada no arquivo sites.txt');
            return;
        }

        console.log(`Encontradas ${urls.length} URLs para processar`);
        const results = await extractEmails(urls);
        
        console.log('\nProcessamento concluído!');
        console.log(`Total de emails válidos únicos encontrados: ${results.length}`);
        console.log('Os emails foram salvos na pasta "resultados".');
        
    } catch (error) {
        console.error('Erro na execução do programa:', error);
    }
}

main();