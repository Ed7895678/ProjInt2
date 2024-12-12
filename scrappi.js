const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const updateReviews = require('./UpdateDatabaseTrustPilot.js'); // Importando a função updateReviews

// Configuração da pool de conexões
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// User-Agent fixo
const fixedUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

// Função de atraso personalizada para delays aleatórios
function randomDelay(min, max) {
    const delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delayTime));
}

// Função para extrair reviews da página atual
async function extractReviews(page) {
    return await page.evaluate(() => {
        const reviews = [];
        const reviewCards = document.querySelectorAll('div.styles_reviewCardInner__EwDq2');

        reviewCards.forEach(card => {
            const nameElement = card.querySelector('span[data-consumer-name-typography="true"]');
            const name = nameElement ? nameElement.innerText.trim() : 'N/A';

            const ratingElement = card.querySelector('div.star-rating_starRating__4rrcf img');
            let rating = 'N/A';
            if (ratingElement) {
                const altText = ratingElement.getAttribute('alt');
                const match = altText.match(/Classificada (\d) em 5 estrelas/);
                if (match) {
                    rating = match[1];
                }
            }

            const dateElement = card.querySelector('time[data-service-review-date-time-ago="true"]');
            let date = dateElement ? dateElement.getAttribute('datetime') : 'N/A';
            // Convertendo a data para o formato adequado (YYYY-MM-DD)
            if (date !== 'N/A') {
                const parsedDate = new Date(date);
                date = parsedDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            }

            const titleElement = card.querySelector('a[data-review-title-typography="true"] h2');
            const title = titleElement ? titleElement.innerText.trim() : 'N/A';

            const contentElement = card.querySelector('p[data-service-review-text-typography="true"]');
            const content = contentElement ? contentElement.innerText.trim() : 'N/A';

            reviews.push({
                name,
                rating,
                date,
                title,
                content
            });
        });

        return reviews;
    });
}

// Função para verificar se o nome da marca na Trustpilot corresponde exatamente ao nome da marca no banco de dados
async function findExactBrandLink(page, brandName) {
    const links = await page.evaluate(() => {
        const brandLinks = [];
        document.querySelectorAll('a[href*="/review/"]').forEach(link => {
            const brandElement = link.querySelector('p.typography_heading-xs__jSwUz');
            if (brandElement) {
                brandLinks.push({
                    href: link.href,
                    name: brandElement.innerText.trim()
                });
            }
        });
        return brandLinks;
    });

    // Procurar link que corresponde exatamente ao nome da marca
    for (const brand of links) {
        if (brand.name.toLowerCase() === brandName.toLowerCase()) {
            return brand.href;
        }
    }

    return null;
}

// Função para navegar com tentativas
async function navigateWithRetries(page, url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
            return;
        } catch (error) {
            console.error(`Erro ao navegar para a URL (${url}): tentativa ${i + 1} de ${retries}`);
            if (i === retries - 1) {
                throw error; // Se falhar em todas as tentativas, lança erro
            }
        }
    }
}

(async () => {
    try {
        // Conectar ao banco de dados MySQL e obter os nomes das marcas
        const connection = await pool.getConnection();
        const [brands] = await connection.execute('SELECT ID, Name FROM brands');
        const brandDetails = brands.map(brand => ({ idBrand: brand.ID, name: brand.Name }));
        connection.release();

        const browser = await puppeteer.launch({
            headless: false, // Alterado para false para ver a execução durante o teste
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-zygote'
            ]
        });
        const page = await browser.newPage();

        // Define o User-Agent fixo
        await page.setUserAgent(fixedUserAgent);
        console.log(`User-Agent definido: ${fixedUserAgent}`);

        // Configura o viewport
        await page.setViewport({ width: 1280, height: 800 });

        for (const brand of brandDetails) {
            const { idBrand, name: brandName } = brand;
            console.log(`Buscando reviews para a marca: ${brandName}`);

            const searchURL = `https://pt.trustpilot.com/search?query=${encodeURIComponent(brandName)}`;

            // Navega para a página de busca da marca
            await navigateWithRetries(page, searchURL);
            await randomDelay(2000, 5000);

            // Verifica se há link para a marca que corresponde exatamente ao nome
            const brandLink = await findExactBrandLink(page, brandName);

            if (!brandLink) {
                console.log(`Nenhum resultado exato encontrado para a marca: ${brandName}`);
                continue;
            }

            // Navega para a página da marca
            await navigateWithRetries(page, brandLink);
            await randomDelay(1000, 3000);

            // Extrai as reviews da página da marca
            let hasNextPage = true;
            let currentPage = 1;

            while (hasNextPage) {
                console.log(`Extraindo reviews da página ${currentPage} para a marca ${brandName}...`);

                try {
                    await page.waitForSelector('div.styles_reviewCardInner__EwDq2', { timeout: 120000 });
                    const reviews = await extractReviews(page);
                    let Source = "TrustPilot";

                    // Envia cada review individualmente para a função updateReviews
                    for (const review of reviews) {
                        const data = {
                            idBrand: idBrand,
                            DescriptionReview: review.content,
                            AuthorReview: review.name,
                            DateReview: review.date,
                            ScoreReview: review.rating,
                            Source: Source
                        };
                        console.log(`Dados coletados para a review da marca ${brandName}:`, data);
                        await updateReviews(data);
                    }

                    // Verifica se há próxima página capturando o link da próxima página
                    const nextButtonSelector = 'a[name="pagination-button-next"]';
                    const nextPageButton = await page.$(nextButtonSelector);

                    if (nextPageButton) {
                        // Captura o link da próxima página
                        const nextPageUrl = await page.evaluate(el => el.href, nextPageButton);
                        if (nextPageUrl) {
                            console.log(`Navegando para a próxima página: ${nextPageUrl}`);
                            await navigateWithRetries(page, nextPageUrl);
                            await randomDelay(2000, 5000);
                            currentPage++;
                        } else {
                            console.log(`Nenhum link válido para a próxima página foi encontrado.`);
                            hasNextPage = false;
                        }
                    } else {
                        console.log(`Nenhuma próxima página encontrada para a marca ${brandName}.`);
                        hasNextPage = false;
                    }
                } catch (error) {
                    console.error(`Erro ao extrair reviews da página ${currentPage} da marca ${brandName}:`, error);
                    hasNextPage = false;
                }
            }
        }

        await browser.close();
    } catch (error) {
        console.error('Erro geral no script:', error);
    }
})();
