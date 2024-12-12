// Eduardo Santos
const mysql = require('mysql2/promise');

// Configuração da pool de conexões
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
});

// Função para atualizar/inserir em Companies
async function updateCompanies(data) {
    const checkSourceQuery = `SELECT Source FROM companies WHERE VAT = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [data.Vat]);
    // Validação
    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        // Ignora a atualização apenas se a fonte existente for 'Racius' e a nova for 'Einforma'
        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: NIF: ${data.VAT}`);
            return;
        }

        // Update
        const updateCompany = `UPDATE companies SET Name = ?, Description = ?, Legal = ?, DUNS = ?, VAT = ?, Score = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP WHERE VAT = ?`;
        await pool.execute(updateCompany, [
            data.NameCompany || null,
            data.DescriptionCompany || null,
            data.LegalCompany || null,
            data.DUNS || null,
            data.Vat || null,
            data.ScoreCompany || null,
            data.SentimentCompany || null,
            data.Source || null,
            data.Vat || null
        ]);
        // Response
        console.log(`Empresa atualizada. NIF: ${data.Vat}`);
        return;
    }
    // Insert
    const insertCompany = `INSERT INTO companies (Name, Description, Legal, DUNS, VAT, Score, Sentiment, Status, Source, Created_at, Updated_at) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    await pool.execute(insertCompany, [
        data.NameCompany || null,
        data.DescriptionCompany || null,
        data.LegalCompany || null,
        data.DUNS || null,
        data.Vat || null,
        data.ScoreCompany || null,
        data.SentimentCompany || null,
        data.Source || null
    ]);
    // Response
    console.log(`Empresa inserida. NIF: ${data.Vat}`);
}



// Função para atualizar/inserir em Brands, buscando IDCompany por VAT na tabela Companies
async function updateBrands(data) {
    // Pesquisa o IDCompany com base no VAT na tabela Companies
    const getIdCompanyQuery = `SELECT ID FROM companies WHERE VAT = ?`;
    const [companyRows] = await pool.execute(getIdCompanyQuery, [data.Vat]);

    // Verifica se encontrou o IDCompany
    if (companyRows.length === 0) {
        console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
        return;
    }

    const idCompany = companyRows[0].ID; // IDCompany da empresa encontrada

    // Verifica se já existe uma marca com o mesmo VAT
    const checkSourceQuery = `SELECT Source FROM brands WHERE VAT = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [data.Vat]);

    // Validação: se já existir, verifica se a atualização deve ser ignorada
    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        // Ignora a atualização apenas se a fonte existente for 'Racius' e a nova for 'Einforma'
        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: NIF: ${data.Vat}`);
            return;
        }

        // Update
        const updateBrand = `UPDATE brands SET Name = ?, Description = ?, Logo = ?, VAT = ?, Score = ?, NumReviews = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP, IDCompany = ?, IsPrimary = 1 WHERE VAT = ?`;
        await pool.execute(updateBrand, [
            data.NameBrand || null,
            data.DescriptionBrand || null,
            data.Logo || null,
            data.Vat || null,
            data.ScoreBrand || null,
            data.NumReviews || null,
            data.SentimentBrand || null,
            data.Source || null,
            idCompany || null,
            data.VAT || null
        ]);
        // Response
        console.log(`Marca atualizada. NIF: ${data.Vat}`);
        return;
    }

    // Insert
    const insertBrand = `INSERT INTO brands (Name, Description, Logo, VAT, Score, NumReviews, Sentiment, Status, Source, Created_at, Updated_at, IDCompany, IsPrimary) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 1)`;
    await pool.execute(insertBrand, [
        data.NameBrand || null,
        data.DescriptionBrand || null,
        data.Logo || null,
        data.Vat || null,
        data.ScoreBrand || null,
        data.NumReviews || null,
        data.SentimentBrand || null,
        data.Source || null,
        idCompany || null
    ]);
    // Response
    console.log(`Marca inserida. NIF: ${data.Vat}`);
}





// Função para atualizar/inserir em Addresses
async function updateAddresses(data) {
    // Pesquisa o IDBrand com base no VAT na tabela Companies
    const getIdBrandQuery = `
        SELECT b.ID 
        FROM brands b
        JOIN companies c ON b.IDCompany = c.ID
        WHERE c.VAT = ?`;

        const [companyRows] = await pool.execute(getIdBrandQuery, [data.Vat]);

    // Verifica se encontrou o IDBrand
    if (companyRows.length === 0) {
        console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
        return;
    }

    const idBrand = companyRows[0].ID; // IDBrand da empresa encontrada

    // Pesquisa se já existe um endereço para o IDBrand
    const checkSourceQuery = `SELECT Source FROM addresses WHERE IDBrand = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [idBrand]);

    // Validação e lógica de atualização ou inserção
    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: IDMarca: ${idBrand}`);
            return;
        }

        // Update
        const updateAddress = `UPDATE addresses SET Address = ?, Location = ?, Zipcode = ?, County = ?, District = ?, Country = ?, Parish = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE IDBrand = ?`;
        await pool.execute(updateAddress, [
            data.Address ?? null,
            data.Location ?? null,
            data.Zipcode ?? null,
            data.County ?? null,
            data.District ?? null,
            data.Country ?? null,
            data.Parish ?? null,
            data.Source ?? null,
            idBrand || null
        ]);
        // Response
        console.log(`Morada atualizada. IDMarca: ${idBrand}`);
        return;
    }

    // Insert
    const insertAddress = `INSERT INTO addresses (IDBrand, Address, Location, Zipcode, County, District, Country, Parish, Status, Created_at, Updated_at, IsPrimary, Source) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)`;
    await pool.execute(insertAddress, [
        idBrand || null,
        data.Address ?? null,
        data.Location ?? null,
        data.Zipcode ?? null,
        data.County ?? null,
        data.District ?? null,
        data.Country ?? null,
        data.Parish ?? null,
        data.Source ?? null
    ]);
    // Response
    console.log(`Morada inserida. IDMarca: ${idBrand}`);
}








// Função para atualizar/inserir em Contacts, usando o VAT da empresa para obter o IDBrand
async function updateContacts(data) {
    // Pesquisa o IDBrand com base no VAT
    const getIdBrandQuery = `
        SELECT b.ID 
        FROM companies c
        JOIN brands b ON c.ID = b.IDCompany
        WHERE c.VAT = ?
    `;
    const [companyRows] = await pool.execute(getIdBrandQuery, [data.Vat]);

    // Verifica se encontrou o IDBrand
    if (companyRows.length === 0) {
        console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
        return;
    }

    const idBrand = companyRows[0].ID; // IDBrand da empresa encontrada
    
    // Pesquisa se já existe um contato para o IDBrand e o contato fornecido
    const checkSourceQuery = `SELECT Source FROM contacts WHERE IDBrand = ? AND Contact = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [idBrand, data.Contact]);

    // Validação e lógica de atualização ou inserção
    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: IDMarca: ${idBrand}`);
            return;
        }

        // Update
        const updateContact = `UPDATE contacts SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE IDBrand = ? AND Contact = ?`;
        await pool.execute(updateContact, [
            data.TypeContact || null,
            data.Source || null,
            idBrand || null,
            data.Contact || null
        ]);
        // Response
        console.log(`Contactos atualizados. IDMarca: ${idBrand}`);
        return;
    }

    // Insert
    const insertContact = `INSERT INTO contacts (Contact, Type, Status, Created_at, Updated_at, IsPrimary, IDBrand, Source) 
                           VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?, ?)`;
    await pool.execute(insertContact, [
        data.Contact || null,
        data.TypeContact || null,
        idBrand || null,
        data.Source || null
    ]);
    // Response
    console.log(`Contactos inseridos. IDMarca: ${idBrand}`);
}




// Função para atualizar/inserir em Links, usando o VAT da empresa para obter o IDBrand
async function updateLinks(data) {
    // Pesquisa o IDBrand com base no VAT
    const getIdBrandQuery = `
        SELECT b.ID 
        FROM companies c
        JOIN brands b ON c.ID = b.IDCompany
        WHERE c.VAT = ?
    `;
    const [companyRows] = await pool.execute(getIdBrandQuery, [data.Vat]);

    // Verifica se encontrou o IDBrand
    if (companyRows.length === 0) {
        console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
        return;
    }

    const idBrand = companyRows[0].ID; // IDBrand da empresa encontrada
    
    // Pesquisa se já existe um link para o IDBrand e o URL fornecido
    const checkSourceQuery = `SELECT Source FROM links WHERE IDBrand = ? AND Url = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [idBrand, data.Url]);

    // Validação e lógica de atualização ou inserção
    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: IDMarca: ${idBrand}`);
            return;
        }

        // Update
        const updateLink = `UPDATE links SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, Source = ? WHERE IDBrand = ? AND Url = ?`;
        await pool.execute(updateLink, [
            data.TypeLink || null,
            data.Source || null,
            idBrand || null,
            data.Url || null
        ]);
        // Response
        console.log(`Links atualizados. IDMarca: ${idBrand}`);
        return;
    }

    // Insert
    const insertLink = `INSERT INTO links (Url, Type, Status, Created_at, Updated_at, IDBrand, Source) 
                        VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`;
    await pool.execute(insertLink, [
        data.Url || null,
        data.TypeLink || null,
        idBrand || null,
        data.Source || null
    ]);
    // Response
    console.log(`Links inseridos. IDMarca: ${idBrand}`);
}




// Função para inserir em Reviews, usando o VAT da empresa para obter o IDBrand
async function updateReviews(data) {
    // Pesquisa o IDBrand com base no VAT
    const getIdBrandQuery = `
        SELECT b.ID 
        FROM companies c
        JOIN brands b ON c.ID = b.IDCompany
        WHERE c.VAT = ?
    `;
    const [companyRows] = await pool.execute(getIdBrandQuery, [data.Vat]);

    // Verifica se encontrou o IDBrand
    if (companyRows.length === 0) {
        console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
        return;
    }

    const idBrand = companyRows[0].ID; // IDBrand da empresa encontrada
    
    // Inserção da review
    const insertReview = `INSERT INTO reviews (IDBrand, Description, Author, Date, Score, Status, Source) 
                          VALUES (?, ?, ?, ?, ?, 1, ?)`;
    await pool.execute(insertReview, [
        idBrand || null,
        data.DescriptionReview || null,
        data.AuthorReview || null,
        data.DateReview || null,
        data.ScoreReview || null,
        data.Source || null
    ]);
    // Response
    console.log(`Review inserida, Marca ID: ${idBrand}.`);
}



// Função inserir Categorias
async function updateCategories(data) {
    try {
        // Apagar todas as categorias
        const deleteCategories = `DELETE FROM categories`;
        const [deleteResult] = await pool.execute(deleteCategories);

        // Inserir novas categorias
        const insertCategory = `INSERT INTO categories (Code, Description, Status, Source) 
                                VALUES (?, ?, 1, ?)`;
        const [insertResult] = await pool.execute(insertCategory, [
            data.Code || null,
            data.DescriptionCategory || null,
            data.Source || null
        ]);
    } catch (error) {
        console.error('Erro ao apagar ou inserir categorias:', error);
    }
    console.log("Categorias inseridas na Base de Dados");
}



// Função para inserir Caes
async function updateCaes(data) {
    try {
        // Apagar todos os CAEs
        const deleteCaes = `DELETE FROM caes`;
        const [deleteResult] = await pool.execute(deleteCaes);

        // Inserir novos CAEs
        const insertCae = `INSERT INTO caes (Code, Description, Status, Source) 
                           VALUES (?, ?, 1, ?)`;
        const [insertResult] = await pool.execute(insertCae, [
            data.Code || null,
            data.DescriptionCae || null,
            data.Source || null
        ]);
    } catch (error) {
        console.error('Erro ao apagar ou inserir CAEs:', error);
    }
    console.log("Categorias inseridas na Base de Dados");
}



// Função para inserir em CategoriesBrands
async function updateCategoriesBrands(data) {
    try {
        // Pesquisa o IDBrand com base no VAT
        const getIdBrandQuery = `
            SELECT b.ID 
            FROM companies c
            JOIN brands b ON c.ID = b.IDCompany
            WHERE c.VAT = ?
        `;
        const [companyRows] = await pool.execute(getIdBrandQuery, [data.Vat]);

        // Verifica se encontrou o IDBrand
        if (companyRows.length === 0) {
            console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
            return;
        }

        const idBrand = companyRows[0].ID; // IDBrand da empresa encontrada

        // Apagar todas as categorias associadas a essa marca (IDBrand)
        const deleteCategoriesBrand = `DELETE FROM categories_brands WHERE IDBrand = ?`;
        const [deleteResult] = await pool.execute(deleteCategoriesBrand, [idBrand]);
        console.log(`Categorias associadas à Marca ${idBrand} foram apagadas.`);

        // Inserir nova categoria associada à marca
        const insertCategoryBrand = `INSERT INTO categories_brands (IDBrand, Category, Source, Created_at, Updated_at) 
                                     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        const [insertResult] = await pool.execute(insertCategoryBrand, [
            idBrand || null,
            data.Category || null,
            data.Source || null
        ]);
        console.log(`Categoria ${data.Category} associada à Marca ${idBrand}.`);

    } catch (error) {
        console.error('Erro ao apagar ou inserir categorias associadas à marca:', error);
    }
}





// Função para inserir em Caes_Companies
async function updateCaesCompanies(data) {
    // Pesquisa o IDCompany com base no VAT
    const getIdBrandQuery = `
        SELECT b.ID 
        FROM companies c
        JOIN brands b ON c.ID = b.IDCompany
        WHERE c.VAT = ?
    `;
    const [companyRows] = await pool.execute(getIdBrandQuery, [data.Vat]);

    // Verifica se encontrou o IDCompany
    if (companyRows.length === 0) {
        console.log(`Nenhuma empresa encontrada com o VAT: ${data.Vat}`);
        return;
    }

    const idCompany = companyRows[0].ID; // IDCompany da empresa encontrada

    // Apaga entradas na tabela associadas com a empresa
    const deleteCaes = `DELETE FROM caes_companies WHERE IDCompany = ?`;
    await pool.execute(deleteCaes, [idCompany]);

    // Insert
    const insertCaesCompanies = `INSERT INTO caes_companies (CAE, IDCompany, Source) VALUES (?, ?, ?)`;
    for (const codeCae of data.Caes) {
        await pool.execute(insertCaesCompanies, [codeCae, idCompany, data.Source]);
    }

    // Response
    console.log(`Cae's associados com a empresa: ${idCompany}.`);
}



// Função para inserir na tabela RaciusLinks
async function updateRaciusLinks(data) {
    try {
        // Apagar todos os dados na tabela raciuslinks com base no NIF
        const deleteRaciusLink = `DELETE FROM raciuslinks WHERE NIF = ?`;
        const [deleteResult] = await pool.execute(deleteRaciusLink, [data.NIF]);
        console.log(`Todos os dados de RaciusLinks para o NIF ${data.NIF} foram apagados.`);

        // Inserir novos dados
        const insertRaciusLink = `INSERT INTO raciuslinks (NIF, URL) 
                                  VALUES (?, ?)`;
        const [insertResult] = await pool.execute(insertRaciusLink, [
            data.NIF || null,
            data.URL || null
        ]);
        console.log(`Dados (RaciusLinks) inseridos, NIF: ${data.NIF}.`);

    } catch (error) {
        console.error('Erro ao apagar ou inserir dados de RaciusLinks:', error);
    }
}



// Exportação
module.exports = {
    updateCompanies,
    updateBrands,
    updateAddresses,
    updateContacts,
    updateLinks,
    updateReviews,
    updateCaes,
    updateCaesCompanies,
    updateCategoriesBrands,
    updateCategories,
    updateRaciusLinks
};
