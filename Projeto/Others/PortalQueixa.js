const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    let currentPage = 1;
    let complaints = [];
    let hasNextPage = true;

    // Para quando chega as 100 reclamações
    while (hasNextPage && complaints.length < 100) {
        console.log(`Scraping da página ${currentPage}...`);
        
        try {
            
            const url = `https://portaldaqueixa.com/brands/meo/complaints?=${currentPage}`;
            await page.goto(url, { waitUntil: 'load', timeout: 60000 }); 
            await new Promise(resolve => setTimeout(resolve, 1000));
            
           //Extração
            const pageComplaints = await page.evaluate(() => {
                const extractedComplaints = [];
                const complaintElements = document.querySelectorAll('.brand-detail__complaints-list__item-title');

                complaintElements.forEach(complaint => {
                    const title = complaint.innerText || 'Título não encontrado';
                    const parentElement = complaint.closest('.card');

                    const dateElement = parentElement.querySelector('.brand-detail__complaints-list__item-date');
                    const date = dateElement ? dateElement.innerText : 'Data não encontrada';

                    const descriptionElement = parentElement.querySelector('.brand-detail__complaints-list__item-description');
                    const description = descriptionElement ? descriptionElement.innerText : 'Descrição não encontrada';

                    const usernameElement = parentElement.querySelector('.brand-detail__complaints-list__item-username');
                    const username = usernameElement ? usernameElement.innerText : 'Utilizador não encontrado';

                    extractedComplaints.push({ title, date, description, username });
                });

                return extractedComplaints;
            });

            complaints = complaints.concat(pageComplaints);

            // Limita para 1000 reclamações
            if (complaints.length >= 100) {
                hasNextPage = false;
                console.log('Limite de reclamações.');
            }

            if (!hasNextPage) break;

            hasNextPage = await page.evaluate(() => {
                const nextPageLink = document.querySelector('nav .page-item a[rel="next"]');
                return nextPageLink && nextPageLink.href ? true : false;
            });

            console.log(`Página ${currentPage} scraped. Reclamações totais: ${complaints.length}`);
        } catch (error) {
            console.error(`Erro na página ${currentPage}:`, error);
            hasNextPage = false;
        }

        currentPage++;

        //Performance-related
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Scraping completo. Total de reclamações: ${complaints.length}`);

    //Guarda para um JSON
    try {
        fs.writeFileSync('complaints.json', JSON.stringify(complaints, null, 2), 'utf-8');
        console.log('Reclamações guardadas em complaints.json');
    } catch (error) {
        console.error('Erro ao guardar para o JSON:', error);
    }

    await browser.close();
})();
