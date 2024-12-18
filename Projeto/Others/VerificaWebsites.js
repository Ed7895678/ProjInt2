import axios from 'axios';
import dns from 'dns';
import * as cheerio from 'cheerio';
import mysql from 'mysql2/promise';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const dnsLookup = promisify(dns.lookup);

// Configuração da conexão com o banco de dados
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'projint2',
});

// Função para buscar links do banco de dados
async function getLinksFromDB() {
    try {
        const [rows] = await pool.execute('SELECT Url FROM links WHERE Status = 1');
        return rows.map(row => row.Url);
    } catch (error) {
        console.error('Erro ao buscar links do banco de dados:', error);
        return [];
    }
}

// Função para verificar um site
async function checkSite(url) {
    const verificacao = {
        url: url,
        dominio_funcionando: false,
        site_acessivel: false,
        status_http: null,
        palavras_chave_encontradas: false,
        data_verificacao: new Date().toISOString()
    };

    const hostname = new URL(url).hostname;

    try {
        await dnsLookup(hostname);
        verificacao.dominio_funcionando = true;
        
        try {
            const response = await axios.get(url);
            verificacao.status_http = response.status;
            
            if (response.status === 200) {
                verificacao.site_acessivel = true;
                
                const $ = cheerio.load(response.data);
                const keywords = ['contactos', 'sobre', 'serviços', 'produtos', 'políticas'];
                verificacao.palavras_chave_encontradas = keywords.some(keyword => 
                    $('body').text().toLowerCase().includes(keyword)
                );
            }
        } catch (error) {
            verificacao.site_acessivel = false;
        }
    } catch (error) {
        verificacao.dominio_funcionando = false;
    }

    return verificacao;
}

// Função para salvar verificação
async function salvarVerificacao(verificacao) {
    const nomeArquivo = 'links_verificados.json';
    let verificacoes = [];
    
    try {
        // Verifica se o arquivo existe e lê as verificações existentes
        if (existsSync(nomeArquivo)) {
            const conteudo = await readFile(nomeArquivo, 'utf8');
            try {
                const dados = JSON.parse(conteudo);
                verificacoes = dados.verificacoes || [];
            } catch (e) {
                console.log('Criando novo arquivo de verificações');
            }
        }
        
        // Adiciona a nova verificação
        verificacoes.push(verificacao);
        
        // Salva o arquivo atualizado
        await writeFile(nomeArquivo, JSON.stringify({ verificacoes }, null, 2));
        console.log(`Verificação salva para: ${verificacao.url}`);
    } catch (error) {
        console.error('Erro ao salvar verificação:', error);
    }
}

// Função principal
async function main() {
    try {
        const links = await getLinksFromDB();
        console.log(`Encontrados ${links.length} links no banco de dados.`);

        for (let i = 0; i < links.length; i++) {
            const url = links[i];
            console.log(`\nVerificando link ${i + 1} de ${links.length}: ${url}`);
            
            const verificacao = await checkSite(url);
            await salvarVerificacao(verificacao);
            
            console.log(`Verificação concluída para: ${url}`);
            console.log(`Status HTTP: ${verificacao.status_http}`);
            console.log(`Domínio funcionando: ${verificacao.dominio_funcionando}`);
            console.log(`Site acessível: ${verificacao.site_acessivel}`);
            console.log(`Palavras-chave encontradas: ${verificacao.palavras_chave_encontradas}`);
        }

        console.log('\nVerificação concluída. Resultados salvos em: verificacoes.json');
        await pool.end();
        
    } catch (error) {
        console.error('Erro na execução:', error);
    }
}

// Executar o script
main();