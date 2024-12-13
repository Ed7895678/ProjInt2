// Eduardo Santos
const fs = require('fs');  
const { updateCaes, updateCategories } = require('./UpdateDatabase');  

// Função para carregar as categorias do ficheiro json
function GetCategories() {

    // Lê o arquivo ListCaes.json
    fs.readFile('../Projeto/Data/ListCaes.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo:', err);
            return;
        }

        try {
            const jsonData = JSON.parse(data); 

            // Envia cada item para a função externa updateCaes
            jsonData.forEach((entry) => {
                // Verifica se o CAE é de nível 3
                if (entry['Código'].toString().length === 3) {
                    const Data = {
                        Code: entry['Código'],
                        DescriptionCategory: entry['Designação'],
                        Source: 'Local File',
                    };

                    // Chama a função externa
                    updateCategories(Data);
                }
            });
        } catch (jsonErr) {
            console.error('Erro ao processar o ficheiro JSON:', jsonErr);
        }
    });
}

// Exportação
module.exports = {
    GetCategories
};