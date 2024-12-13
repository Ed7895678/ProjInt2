// Eduardo Santos
const fs = require('fs');
const { updateRaciusLinks } = require('./UpdateDatabase');

// Função para processar o ficheiro RaciusLinks.json
function RaciusLinks() {
    // Lê o arquivo ListNifs.json
    fs.readFile('../Projeto/Data/ListNifs.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo:', err);
            return;
        }

        try {
            const jsonData = JSON.parse(data);

            // Processa cada objeto do arquivo JSON
            jsonData.forEach((item) => {
                const url = item.url;
                const nif = item.nif;

                if (url && nif) {
                    const Data = {
                        NIF: nif.trim(),
                        URL: url.trim(),
                    };

                    // Chama a função externa
                    updateRaciusLinks(Data)
                        .catch((error) => console.error(`Erro ao processar o NIF ${nif}:`, error));
                }
            });
        } catch (jsonErr) {
            console.error('Erro ao processar o ficheiro JSON:', jsonErr);
        }
    });
}

// Exportação
module.exports = {
    RaciusLinks
};
