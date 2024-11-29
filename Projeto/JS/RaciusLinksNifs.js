const fs = require('fs');
const path = require('path');
const { updateRaciusLinks } = require('./UpdateDatabase');

// Função para processar o ficheiro RaciusLinks.json 
async function processFile(inputFile) {

  fs.readFile(inputFile, 'utf8', async (err, data) => {
    if (err) {
      console.error('Erro ao ler o arquivo:', err);
      return;
    }

    // Parse do ficheiro
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (err) {
      console.error('Erro ao parsear o arquivo JSON:', err);
      return;
    }

    // Processa cada objeto do arquivo JSON 
    for (const item of jsonData) {
      const link = item.link; 
      const nif = item.nif;   

      if (link && nif) {
        // Prepara os dados para inserção ou atualização
        const linkData = {
          NIF: nif.trim(),
          URL: link.trim(),
          Type: 1 // Type fixado em 1
        };

        try {
          await updateRaciusLinks(linkData); // Chama a função externa updateRaciusLinks
        } catch (error) {
          console.error(`Erro ao processar o NIF ${nif}:`, error);
        }
      } else {
        console.log(`Dados incompletos encontrados: ${JSON.stringify(item)}`);
      }
    }

    console.log('Preenchimento da tabela RaciusLinks completo.');
  });
}

// Chama a função principal
const inputFilePath = path.join(__dirname, 'raciusLinks.json'); // Caminho para o ficheiro json
processFile(inputFilePath);
