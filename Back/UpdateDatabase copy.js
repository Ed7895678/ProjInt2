const mysql = require('mysql2/promise');

// Configuração da pool de conexões
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Função para atualizar/inserir em Companies
async function updateCompanies(data) {
    const updateCompany = `UPDATE companies SET Name = ?, Description = ?, Legal = ?, DUNS = ?, VAT = ?, Score = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP WHERE VAT = ?`;
    const [result] = await pool.execute(updateCompany, [
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
    if (result.affectedRows === 0) {
        const insertCompany = `INSERT INTO companies (Name, Description, Legal, DUNS, VAT, Score, Sentiment, Status, Source, Created_at, Updated_at) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        const [insertResult] = await pool.execute(insertCompany, [
            data.NameCompany,
            data.DescriptionCompany,
            data.LegalCompany,
            data.DUNS,
            data.VAT,
            data.ScoreCompany,
            data.SentimentCompany,
            data.Source
        ]);
        console.log(`Company inserido com sucesso, ID: ${insertResult.insertId}.`);
        return insertResult.insertId;
    }
    console.log(`Company atualizado com sucesso.`);
}

// Função para atualizar/inserir em Brands
async function updateBrands(data, idCompany) {
    const updateBrand = `UPDATE brands SET Name = ?, Description = ?, Logo = ?, VAT = ?, Score = ?, NumReviews = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP, IDCompany = ?, IsPrimary = 1 WHERE VAT = ?`;
    const [result] = await pool.execute(updateBrand, [
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
    if (result.affectedRows === 0) {
        const insertBrand = `INSERT INTO brands (Name, Description, Logo, VAT, Score, NumReviews, Sentiment, Status, Source, Created_at, Updated_at, IDCompany, IsPrimary) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 1)`;
        const [insertResult] = await pool.execute(insertBrand, [
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
        console.log(`Brand inserido com sucesso, ID: ${insertResult.insertId}.`);
        return insertResult.insertId;
    }
    console.log(`Brand atualizado com sucesso.`);
}

// Função para atualizar/inserir em Addresses
async function updateAddresses(data, idBrand) {
    const updateAddress = `UPDATE addresses SET Address = ?, Location = ?, Zipcode = ?, County = ?, District = ?, Country = ?, Parish = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE IDBrand = ?`;
    const [result] = await pool.execute(updateAddress, [
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
    if (result.affectedRows === 0) {
        const insertAddress = `INSERT INTO addresses (IDBrand, Address, Location, Zipcode, County, District, Country, Parish, Status, Created_at, Updated_at, IsPrimary, Source) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)`;
        const [insertResult] = await pool.execute(insertAddress, [
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
        console.log(`Address inserido com sucesso, ID: ${insertResult.insertId}.`);
    }
}

// Função para atualizar/inserir em Contacts
async function updateContacts(data, idBrand) {
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
        const [insertResult] = await pool.execute(insertContact, [
            data.Contact,
            data.TypeContact,
            idBrand,
            data.Source
        ]);
        console.log(`Contact inserido com sucesso, ID: ${insertResult.insertId}.`);
    }
}

// Função para atualizar/inserir em Links
async function updateLinks(data, idBrand) {
    const updateLink = `UPDATE links SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, Source = ? WHERE IDBrand = ? AND Url = ?`;
    const [result] = await pool.execute(updateLink, [
        data.TypeLink,
        data.Source,
        idBrand,
        data.Url
    ]);
    if (result.affectedRows === 0) {
        const insertLink = `INSERT INTO links (Url, Type, Status, Created_at, Updated_at, IDBrand, Source) 
                            VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`;
        const [insertResult] = await pool.execute(insertLink, [
            data.Url,
            data.TypeLink,
            idBrand,
            data.Source
        ]);
        console.log(`Link inserido com sucesso, ID: ${insertResult.insertId}.`);
    }
}

// Função para inserir Reviews
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
    console.log(`Review inserido com sucesso.`);
}

// Função para atualizar/inserir em Caes_Companies
async function updateCaesCompanies(data, idCompany) {
    const deleteCaes = `DELETE FROM caes_companies WHERE IDCompany = ?`;
    await pool.execute(deleteCaes, [idCompany]);

    const insertCaesCompanies = `INSERT INTO caes_companies (CAE, IDCompany, Source) VALUES (?, ?, ?)`;
    for (const codeCae of data.Caes) {
        await pool.execute(insertCaesCompanies, [codeCae, idCompany, data.Source]);
    }
    console.log(`CAEs inseridos para a empresa ID: ${idCompany}.`);
}

// Exporta cada função para uso independente
module.exports = {
    updateCompanies,
    updateBrands,
    updateAddresses,
    updateContacts,
    updateLinks,
    updateReviews,
    updateCaesCompanies
};
