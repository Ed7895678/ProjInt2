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

async function updateDatabase(data) {
    try {
        let idCompany = null;
        let idBrand = null;
        let idAddress = null;

        // Atualizar ou inserir em Companies
        if (data.VAT) {
            const queryCompany = `SELECT ID, Source FROM companies WHERE VAT = ?`;
            const [rowsCompany] = await pool.execute(queryCompany, [data.VAT]);

            if (rowsCompany.length > 0) {
                idCompany = rowsCompany[0].ID;
                const currentSource = rowsCompany[0].Source;

                if (data.Source === 'racius' || currentSource === 'einforma') {
                    const updateCompany = `UPDATE companies SET Name = ?, Description = ?, Legal = ?, DUNS = ?, VAT = ?, Score = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP WHERE ID = ?`;
                    await pool.execute(updateCompany, [
                        data.NameCompany || null,
                        data.DescriptionCompany || null,
                        data.LegalCompany || null,
                        data.DUNS || null,
                        data.VAT,
                        data.ScoreCompany || null,
                        data.SentimentCompany || null,
                        data.Source || currentSource,
                        idCompany
                    ]);
                    console.log(`Companies: Empresa atualizada com sucesso, ID: ${idCompany}.`);
                } else {
                    console.log(`Companies: Nenhuma atualização feita.`);
                }
            } else {
                const insertCompany = `INSERT INTO companies (Name, Description, Legal, DUNS, VAT, Score, Sentiment, Status, Source, Created_at, Updated_at) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
                const [resultCompany] = await pool.execute(insertCompany, [
                    data.NameCompany || null,
                    data.DescriptionCompany || null,
                    data.LegalCompany || null,
                    data.DUNS || null,
                    data.VAT,
                    data.ScoreCompany || null,
                    data.SentimentCompany || null,
                    data.Source || null
                ]);
                idCompany = resultCompany.insertId;
                console.log(`Companies: Empresa inserida com sucesso, ID: ${idCompany}.`);
            }
        } else {
            console.log('Nenhuma empresa foi inserida ou atualizada.');
        }

        // Atualizar ou inserir em Brands
        if (idCompany) {
            const queryBrand = `SELECT ID, Source FROM brands WHERE VAT = ?`;
            const [rowsBrand] = await pool.execute(queryBrand, [data.VAT]);

            if (rowsBrand.length > 0) {
                idBrand = rowsBrand[0].ID;
                const currentSource = rowsBrand[0].Source;

                if (data.Source === 'racius' || currentSource === 'einforma') {
                    const updateBrand = `UPDATE brands SET Name = ?, Description = ?, Logo = ?, VAT = ?, Score = ?, NumReviews = ?, Sentiment = ?, Status = 1, Source = ?, Updated_at = CURRENT_TIMESTAMP, IDCompany = ?, IsPrimary = 1 WHERE ID = ?`;
                    await pool.execute(updateBrand, [
                        data.NameBrand || null,
                        data.DescriptionBrand || null,
                        data.Logo || null,
                        data.VAT,
                        data.ScoreBrand || null,
                        data.NumReviews || null,
                        data.SentimentBrand || null,
                        data.Source || currentSource,
                        idCompany,
                        idBrand
                    ]);
                    console.log(`Brands: Marca atualizada com sucesso, ID: ${idBrand}.`);
                } else {
                    console.log(`Brands: Nenhuma atualização feita.`);
                }
            } else {
                const insertBrand = `INSERT INTO brands (Name, Description, Logo, VAT, Score, NumReviews, Sentiment, Status, Source, Created_at, Updated_at, IDCompany, IsPrimary) 
                                     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, 1)`;
                const [resultBrand] = await pool.execute(insertBrand, [
                    data.NameBrand || null,
                    data.DescriptionBrand || null,
                    data.Logo || null,
                    data.VAT,
                    data.ScoreBrand || null,
                    data.NumReviews || null,
                    data.SentimentBrand || null,
                    data.Source || null,
                    idCompany
                ]);
                idBrand = resultBrand.insertId;
                console.log(`Brands: Marca inserida com sucesso, ID: ${idBrand}.`);
            }
        } else {
            console.log('Nenhuma marca foi inserida ou atualizada.');
        }

        // Atualizar ou inserir em Addresses
        if (idBrand) {
            const queryAddress = `SELECT ID, Source FROM addresses WHERE IDBrand = ?`;
            const [rowsAddress] = await pool.execute(queryAddress, [idBrand]);

            if (rowsAddress.length > 0) {
                idAddress = rowsAddress[0].ID;
                const currentSource = rowsAddress[0].Source;

                if (data.Source === 'racius' || currentSource === 'einforma') {
                    const updateAddress = `UPDATE addresses SET Address = ?, Location = ?, Zipcode = ?, County = ?, District = ?, Country = ?, Parish = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE ID = ?`;
                    await pool.execute(updateAddress, [
                        data.Address || null,
                        data.Location || null,
                        data.Zipcode || null,
                        data.County || null,
                        data.District || null,
                        data.Country || null,
                        data.Parish || null,
                        data.Source || currentSource,
                        idAddress
                    ]);
                    console.log(`Addresses: Endereço atualizado com sucesso, ID: ${idAddress}.`);
                } else {
                    console.log(`Addresses: Nenhuma atualização feita.`);
                }
            } else {
                const insertAddress = `INSERT INTO addresses (IDBrand, Address, Location, Zipcode, County, District, Country, Parish, Status, Created_at, Updated_at, IsPrimary, Source) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)`;
                const [resultAddress] = await pool.execute(insertAddress, [
                    idBrand,
                    data.Address || null,
                    data.Location || null,
                    data.Zipcode || null,
                    data.County || null,
                    data.District || null,
                    data.Country || null,
                    data.Parish || null,
                    data.Source || null
                ]);
                idAddress = resultAddress.insertId;
                console.log(`Addresses: Endereço inserido com sucesso, ID: ${idAddress}.`);
            }
        } else {
            console.log('Nenhum endereço foi inserido ou atualizado.');
        }

        // Atualizar ou inserir em Contacts
        if (idBrand && data.Contact) {
            const queryContact = `SELECT ID, Source FROM contacts WHERE IDBrand = ? AND Contact = ?`;
            const [rowsContact] = await pool.execute(queryContact, [idBrand, data.Contact]);

            if (rowsContact.length > 0) {
                const idContact = rowsContact[0].ID;
                const currentSource = rowsContact[0].Source;

                if (data.Source === 'racius' || currentSource === 'einforma') {
                    const updateContact = `UPDATE contacts SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, IsPrimary = 1, Source = ? WHERE ID = ?`;
                    await pool.execute(updateContact, [
                        data.TypeContact || null,
                        data.Source || currentSource,
                        idContact
                    ]);
                    console.log(`Contacts: Contato atualizado com sucesso, ID: ${idContact}.`);
                } else {
                    console.log(`Contacts: Nenhuma atualização feita.`);
                }
            } else {
                const insertContact = `INSERT INTO contacts (Contact, Type, Status, Created_at, Updated_at, IsPrimary, IDBrand, Source) 
                                       VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?, ?)`;
                const [resultContact] = await pool.execute(insertContact, [
                    data.Contact || null,
                    data.TypeContact || null,
                    idBrand,
                    data.Source || null
                ]);
                const idContact = resultContact.insertId;
                console.log(`Contacts: Contato inserido com sucesso, ID: ${idContact}.`);
            }
        } else {
            console.log('Nenhum contato foi inserido ou atualizado.');
        }

        // Atualizar ou inserir em Links
        if (idBrand && data.Url) {
            const queryLink = `SELECT ID, Source FROM links WHERE IDBrand = ? AND Url = ?`;
            const [rowsLink] = await pool.execute(queryLink, [idBrand, data.Url]);

            if (rowsLink.length > 0) {
                const idLink = rowsLink[0].ID;
                const currentSource = rowsLink[0].Source;

                if (data.Source === 'racius' || currentSource === 'einforma') {
                    const updateLink = `UPDATE links SET Type = ?, Status = 1, Updated_at = CURRENT_TIMESTAMP, Source = ? WHERE ID = ?`;
                    await pool.execute(updateLink, [
                        data.TypeLink || null,
                        data.Source || currentSource,
                        idLink
                    ]);
                    console.log(`Links: Link atualizado com sucesso, ID: ${idLink}.`);
                } else {
                    console.log(`Links: Nenhuma atualização feita.`);
                }
            } else {
                const insertLink = `INSERT INTO links (Url, Type, Status, Created_at, Updated_at, IDBrand, Source) 
                                    VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`;
                const [resultLink] = await pool.execute(insertLink, [
                    data.Url || null,
                    data.TypeLink || null,
                    idBrand,
                    data.Source || null
                ]);
                const idLink = resultLink.insertId;
                console.log(`Links: Link inserido com sucesso, ID: ${idLink}.`);
            }
        } else {
            console.log('Nenhum link foi inserido ou atualizado.');
        }

        // Inserir em Reviews
        if (idBrand && data.DescriptionReview && data.AuthorReview && data.DateReview && data.ScoreReview) {
            const insertReview = `INSERT INTO reviews (IDBrand, Description, Author, Date, Score, Status, Source) 
                                  VALUES (?, ?, ?, ?, ?, 1, ?)`;
            const [resultReview] = await pool.execute(insertReview, [
                idBrand,
                data.DescriptionReview || null,
                data.AuthorReview || null,
                data.DateReview || null,
                data.ScoreReview || null,
                data.Source || null
            ]);
            const idReview = resultReview.insertId;
            console.log(`Reviews: Avaliação inserida com sucesso, ID: ${idReview}.`);
        } else {
            console.log('Nenhuma avaliação foi inserida ou atualizada.');
        }

        // Atualizar ou inserir em Caes_Companies usando `Code` como `CAE` apenas se os valores forem diferentes
if (idCompany && data.Caes && Array.isArray(data.Caes)) {
    // Selecionar os CAEs existentes para a empresa
    const selectExistingCaes = `SELECT CAE FROM caes_companies WHERE IDCompany = ?`;
    const [existingCaesRows] = await pool.execute(selectExistingCaes, [idCompany]);
    const existingCaes = existingCaesRows.map(row => row.CAE);

    // Comparar os CAEs novos com os existentes
    const newCaesSet = new Set(data.Caes);
    const existingCaesSet = new Set(existingCaes);

    // Identificar os CAEs que precisam ser inseridos ou removidos
    const caesToInsert = data.Caes.filter(cae => !existingCaesSet.has(cae));
    const caesToRemove = existingCaes.filter(cae => !newCaesSet.has(cae));

    // Remover os CAEs que não estão mais presentes
    if (caesToRemove.length > 0) {
        const deleteQuery = `DELETE FROM caes_companies WHERE IDCompany = ? AND CAE IN (${caesToRemove.map(() => '?').join(',')})`;
        await pool.execute(deleteQuery, [idCompany, ...caesToRemove]);
    }

    // Inserir os novos CAEs
    if (caesToInsert.length > 0) {
        const insertCaesCompanies = `INSERT INTO caes_companies (CAE, IDCompany, Source) VALUES (?, ?, ?)`;
        for (const codeCae of caesToInsert) {
            await pool.execute(insertCaesCompanies, [
                codeCae,
                idCompany,
                data.Source || null
            ]);
        }
        console.log(`Caes_Companies: CAEs atualizados com sucesso para a empresa ID: ${idCompany}.\n`);
    } else {
        console.log(`Caes_Companies: Nenhuma atualização feita; Empresa ID: ${idCompany}.\n`);
    }
} else {
    console.log('Nenhuma ligação caes_companies foi inserida ou atualizada.\n');
}


    } catch (error) {
        throw new Error(`Erro geral na atualização da base de dados: ${error.message}\n`);
    }
}

module.exports = updateDatabase;
