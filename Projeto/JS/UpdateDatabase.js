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
    const [existingRows] = await pool.execute(checkSourceQuery, [data.VAT]);

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
            data.NameCompany,
            data.DescriptionCompany,
            data.LegalCompany,
            data.DUNS,
            data.VAT,
            data.ScoreCompany,
            data.SentimentCompany,
            data.Source,
            data.VAT
        ]);
        console.log(`Atualizado. NIF: ${data.VAT}`);
        return;
    }
    // Insert
    const insertCompany = `INSERT INTO companies (Name, Description, Legal, DUNS, VAT, Score, Sentiment, Status, Source, Created_at, Updated_at) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    await pool.execute(insertCompany, [
        data.NameCompany,
        data.DescriptionCompany,
        data.LegalCompany,
        data.DUNS,
        data.VAT,
        data.ScoreCompany,
        data.SentimentCompany,
        data.Source
    ]);
    console.log(`Inserido. NIF: ${data.VAT}`);
}




// Função para atualizar/inserir em Brands
async function updateBrands(data, idCompany) {
    const checkSourceQuery = `SELECT Source FROM brands WHERE VAT = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [data.VAT]);

    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        // Ignora a atualização apenas se a fonte existente for 'Racius' e a nova for 'Einforma'
        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: NIF: ${data.VAT}`);
            return;
        }
        // Update
        const updateBrand = `UPDATE brands SET Name = ?, Description = ?, Logo = ?, VAT = ?, Score = ?, NumReviews = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP, IDCompany = ?, IsPrimary = 1 WHERE VAT = ?`;
        await pool.execute(updateBrand, [
            data.NameBrand,
            data.DescriptionBrand,
            data.Logo,
            data.VAT,
            data.ScoreBrand,
            data.NumReviews,
            data.SentimentBrand,
            data.Source,
            idCompany,
            data.VAT
        ]);
        console.log(`Atualizado. NIF: ${data.VAT}`);
        return;
    }
    // Insert
    const insertBrand = `INSERT INTO brands (Name, Description, Logo, VAT, Score, NumReviews, Sentiment, Status, Source, Created_at, Updated_at, IDCompany, IsPrimary) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 1)`;
    await pool.execute(insertBrand, [
        data.NameBrand,
        data.DescriptionBrand,
        data.Logo,
        data.VAT,
        data.ScoreBrand,
        data.NumReviews,
        data.SentimentBrand,
        data.Source,
        idCompany
    ]);
    console.log(`Inserido. NIF: ${data.VAT}`);
}




// Função para atualizar/inserir em Addresses
async function updateAddresses(data, idBrand) {
    const checkSourceQuery = `SELECT Source FROM addresses WHERE IDBrand = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [idBrand]);

    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: IDMarca: ${idBrand}`);
            return;
        }

        // Update
        const updateAddress = `UPDATE addresses SET Address = ?, Location = ?, Zipcode = ?, County = ?, District = ?, Country = ?, Parish = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE IDBrand = ?`;
        await pool.execute(updateAddress, [
            data.Address,
            data.Location,
            data.Zipcode,
            data.County,
            data.District,
            data.Country,
            data.Parish,
            data.Source,
            idBrand
        ]);
        console.log(`Atualizado. IDMarca: ${idBrand}`);
        return;
    }
    // Insert
    const insertAddress = `INSERT INTO addresses (IDBrand, Address, Location, Zipcode, County, District, Country, Parish, Status, Created_at, Updated_at, IsPrimary, Source) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)`;
    await pool.execute(insertAddress, [
        idBrand,
        data.Address,
        data.Location,
        data.Zipcode,
        data.County,
        data.District,
        data.Country,
        data.Parish,
        data.Source
    ]);
    console.log(`Inserido. IDMarca: ${idBrand}`);
}



// Função para atualizar/inserir em Contacts
async function updateContacts(data, idBrand) {
    const checkSourceQuery = `SELECT Source FROM contacts WHERE IDBrand = ? AND Contact = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [idBrand, data.Contact]);

    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: Fonte prioritária 'Racius'. IDMarca: ${idBrand}`);
            return;
        }

        // Update
        const updateContact = `UPDATE contacts SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE IDBrand = ? AND Contact = ?`;
        await pool.execute(updateContact, [
            data.TypeContact,
            data.Source,
            idBrand,
            data.Contact
        ]);
        console.log(`Atualizado. IDMarca: ${idBrand}`);
        return;
    }
    // Insert
    const insertContact = `INSERT INTO contacts (Contact, Type, Status, Created_at, Updated_at, IsPrimary, IDBrand, Source) 
                           VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?, ?)`;
    await pool.execute(insertContact, [
        data.Contact,
        data.TypeContact,
        idBrand,
        data.Source
    ]);
    console.log(`Inserido. IDMarca: ${idBrand}`);
}



// Função para atualizar/inserir em Links
async function updateLinks(data, idBrand) {
    const checkSourceQuery = `SELECT Source FROM links WHERE IDBrand = ? AND Url = ?`;
    const [existingRows] = await pool.execute(checkSourceQuery, [idBrand, data.Url]);

    if (existingRows.length > 0) {
        const existingSource = existingRows[0].Source;

        if (existingSource === 'Racius' && data.Source === 'Einforma') {
            console.log(`Atualização ignorada: Fonte prioritária 'Racius'. IDMarca: ${idBrand}`);
            return;
        }
        // Update
        const updateLink = `UPDATE links SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, Source = ? WHERE IDBrand = ? AND Url = ?`;
        await pool.execute(updateLink, [
            data.TypeLink,
            data.Source,
            idBrand,
            data.Url
        ]);
        console.log(`Atualizado. IDMarca: ${idBrand}`);
        return;
    }
    // Insert
    const insertLink = `INSERT INTO links (Url, Type, Status, Created_at, Updated_at, IDBrand, Source) 
                        VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`;
    await pool.execute(insertLink, [
        data.Url,
        data.TypeLink,
        idBrand,
        data.Source
    ]);
    console.log(`Inserido. IDMarca: ${idBrand}`);
}



// Função para inserir em Reviews
async function updateReviews(data, idBrand) {
    const insertReview = `INSERT INTO reviews (IDBrand, Description, Author, Date, Score, Status, Source) 
                          VALUES (?, ?, ?, ?, ?, 1, ?)`;
    await pool.execute(insertReview, [
        idBrand,
        data.DescriptionReview,
        data.AuthorReview,
        data.DateReview,
        data.ScoreReview,
        data.Source
    ]);
    // Response
    console.log(`Review inserido, Marca ID: ${data.idBrand}.`);
}



// Função para atualizar/inserir em Categories
async function updateCategories(data) {
    // Update
    const updateCategory = `UPDATE categories SET Description = ?, Status = 1, Source = ? WHERE Code = ?`;
    const [result] = await pool.execute(updateCategory, [
        data.DescriptionCategory,
        data.Source,
        data.Code
    ]);
    if (result.affectedRows === 0) {
        // Insert
        const insertCategory = `INSERT INTO categories (Code, Description, Status, Source) 
                                VALUES (?, ?, 1, ?)`;
        const [insertResult] = await pool.execute(insertCategory, [
            data.Code,
            data.DescriptionCategory,
            data.Source
        ]);
        // Response
        console.log(`Categoria inserida, Código: ${data.Code}.`);
        return;
    }
    // Response
    console.log(`Categoria atualizada, Código: ${data.Code}.`);
}



// Função para atualizar/inserir em Caes
async function updateCaes(data) {
    // Update
    const updateCae = `UPDATE caes SET Description = ?, Status = 1, Source = ? WHERE Code = ?`;
    const [result] = await pool.execute(updateCae, [
        data.DescriptionCae,
        data.Source,
        data.Code
    ]);
    if (result.affectedRows === 0) {
        // Insert
        const insertCae = `INSERT INTO caes (Code, Description, Status, Source) 
                           VALUES (?, ?, 1, ?)`;
        const [insertResult] = await pool.execute(insertCae, [
            data.Code,
            data.DescriptionCae,
            data.Source
        ]);
        // Response
        console.log(`CAE inserido, Código: ${data.Code}.`);
        return;
    }
    // Response
    console.log(`CAE atualizado, Código: ${data.Code}.`);
}



// Função para atualizar/inserir em Categories_Brands
async function updateCategoriesBrands(data, idBrand) {
    // Update
    const updateCategoryBrand = `UPDATE categories_brands SET Source = ?, Updated_at = CURRENT_TIMESTAMP WHERE IDBrand = ? AND Category = ?`;
    const [result] = await pool.execute(updateCategoryBrand, [
        data.Source,
        idBrand,
        data.Category
    ]);
    if (result.affectedRows === 0) {
        // Insert
        const insertCategoryBrand = `INSERT INTO categories_brands (IDBrand, Category, Source, Created_at, Updated_at) 
                                     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        const [insertResult] = await pool.execute(insertCategoryBrand, [
            idBrand,
            data.Category,
            data.Source
        ]);
        // Response
        console.log(`Categoria associada com a Marca: ${idBrand}.`);
        return;
    }
    // Response
    console.log(`Categoria associada com a Marca: ${idBrand}.`);
}



// Função para atualizar em Caes_Companies
async function updateCaesCompanies(data, idCompany) {
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



// Função para atualizar/inserir dados na tabela RaciusLinks
async function updateRaciusLinks(data) {
    // Update
    const updateRaciusLink = `UPDATE raciuslinks SET URL = ? WHERE NIF = ?`;
    const [result] = await pool.execute(updateRaciusLink, [
        data.URL,
        data.NIF
    ]);
    // Insert
    if (result.affectedRows === 0) {
        const insertRaciusLink = `INSERT INTO raciuslinks (NIF, URL) 
                                      VALUES (?, ?)`;
        const [insertResult] = await pool.execute(insertRaciusLink, [
            data.NIF,
            data.URL,
        ]);
        // Response
        console.log(`Dados (RaciusLinks) inseridos, NIF: ${data.NIF}.`);
        return
    }
    // Response
    console.log(`Dados (RaciusLinks) atualizados, NIF: ${data.NIF}.`);
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
