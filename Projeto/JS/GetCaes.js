// Eduardo Santos
const fs = require('fs');
const { updateCaes } = require('./UpdateDatabase');  

// Função para carregar os Cae's do ficheiro json
function GetCaes() {
    // Lê o ficheiro JSON
    fs.readFile('../Data/ListCaes.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o ficheiro:', err);
            return;
        }

        try {
            const jsonData = JSON.parse(data);

            // Envia cada item para a função externa updateCaes
            jsonData.forEach((entry) => {
                const Data = {
                    Code: entry['Código'],
                    DescriptionCae: entry['Designação'],
                    Source: 'Local File',
                };

                // Chama a função externa
                updateCaes(Data);
            });
        } catch (err) {
            console.error('Erro ao processar o ficheiro JSON:', err);
        }
    });
}  

GetCaes();

// Exportação
module.exports = {
    GetCaes
};