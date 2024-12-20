<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Funções</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0;
        }
        .button-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
        }
        .button-container button {
            padding: 15px 30px;
            font-size: 16px;
            cursor: pointer;
            border: none;
            border-radius: 5px;
            background-color: #007BFF;
            color: white;
            transition: background-color 0.3s;
        }
        .button-container button:hover {
            background-color: #0056b3;
        }
        .button-container button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="button-container">
        <button id="btnLinksRacius" onclick="executarFuncao('atualizarLinksRacius')">Atualizar Links Racius</button>
        <button id="btnCaes" onclick="executarFuncao('atualizarCaes')">Atualizar CAES</button>
        <button id="btnCategorias" onclick="executarFuncao('atualizarCategorias')">Atualizar Categorias</button>
        <button id="btnEmails" onclick="executarFuncao('atualizarEmails')">Atualizar Emails</button>
        <button id="btnNumeros" onclick="executarFuncao('atualizarNumeros')">Atualizar Números</button>
        <button id="btnEInforma" onclick="executarFuncao('atualizarEInforma')">Atualizar EInforma</button>
        <button id="btnRacius" onclick="executarFuncao('atualizarRacius')">Atualizar Racius</button>
        <button id="btnResetStatus" onclick="executarFuncao('resetStatus')">Resetar Status</button>
    </div>

    <script>
        async function executarFuncao(functionName) {
            try {
                const response = await fetch('http://localhost:3000/execute_function', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ functionName }),
                });

                const result = await response.json();

                if (result.success) {
                    alert(result.message);
                } else {
                    alert(`Erro: ${result.message}`);
                }
            } catch (error) {
                console.error('Erro ao executar a função:', error);
                alert('Ocorreu um erro ao executar a função.');
            }
        }
    </script>
</body>
</html>
