<?php
// Conexão com a base de dados
$conn = new mysqli('localhost', 'root', '', 'db_emprelis');
if ($conn->connect_error) {
    die("Conexão falhou: " . $conn->connect_error);
}

// Configuração da paginação
$limite = 15;
$pagina = isset($_GET['pagina']) ? (int)$_GET['pagina'] : 1;
$inicio = ($pagina > 1) ? ($pagina - 1) * $limite : 0;

// Buscar empresas com paginação e ordenação por ID crescente
$total_resultado = $conn->query("SELECT COUNT(*) AS total FROM companies");
$total_empresas = $total_resultado->fetch_assoc()['total'];
$total_paginas = ceil($total_empresas / $limite);

$result = $conn->query("SELECT * FROM companies ORDER BY ID ASC LIMIT $inicio, $limite");
$empresas = $result->fetch_all(MYSQLI_ASSOC);

// Adicionar ou editar empresa
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? null;
    $nome = $_POST['nome'];
    $description = $_POST['description'] ?? '';
    $legal = $_POST['legal'] ?? '';
    $duns = $_POST['duns'] ?? '';
    $vat = $_POST['vat'] ?? '';
    $score = $_POST['score'] ?? '';
    $sentiment = $_POST['sentiment'] ?? '';
    $status = $_POST['status'] ?? '';
    $source = $_POST['source'] ?? '';
    $updated_at = date('Y-m-d H:i:s');

    if ($id) {
        // Editar empresa
        $stmt = $conn->prepare("UPDATE companies SET Name = ?, Description = ?, Legal = ?, DUNS = ?, VAT = ?, Score = ?, Sentiment = ?, Status = ?, Source = ?, Updated_at = ? WHERE ID = ?");
        $stmt->bind_param('ssssssssssi', $nome, $description, $legal, $duns, $vat, $score, $sentiment, $status, $source, $updated_at, $id);
    } else {
        // Adicionar empresa
        $stmt = $conn->prepare("INSERT INTO companies (Name, Description, Legal, DUNS, VAT, Score, Sentiment, Status, Source, Created_at, Updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)");
        $stmt->bind_param('ssssssssss', $nome, $description, $legal, $duns, $vat, $score, $sentiment, $status, $source, $updated_at);
    }
    $stmt->execute();
    $stmt->close();
    header('Location: pages-companies.php');
    exit;
}

// Apagar empresa
if (isset($_GET['delete'])) {
    $id = $_GET['delete'];
    $stmt = $conn->prepare("DELETE FROM companies WHERE ID = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    header('Location: pages-companies.php');
    exit;
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar Empresas</title>
    <style>
        body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background-color: #e9ecef;
            color: #495057;
            margin: 0;
            padding: 0;
        }
        h1, h2 {
            text-align: center;
            color: #343a40;
            margin-top: 20px;
        }
        form {
            background: #ffffff;
            margin: 20px auto;
            padding: 20px;
            max-width: 600px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        form label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
        }
        form input {
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ced4da;
            border-radius: 5px;
            box-sizing: border-box;
        }
        form button {
            background-color: #28a745;
            color: #fff;
            font-size: 16px;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        form button:hover {
            background-color: #218838;
        }
        table {
            width: 95%;
            margin: 20px auto;
            border-collapse: collapse;
            background: #fff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        table, th, td {
            border: 1px solid #dee2e6;
        }
        th, td {
            padding: 12px;
            text-align: center;
        }
        th {
            background-color: #007bff;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tr:hover {
            background-color: #e2e6ea;
            transition: background-color 0.2s ease-in-out;
        }
        .paginacao {
            text-align: center;
            margin: 20px 0;
        }
        .paginacao a {
            margin: 0 5px;
            text-decoration: none;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            color: #007bff;
            border-radius: 5px;
            transition: all 0.3s;
        }
        .paginacao a.active {
            background-color: #007bff;
            color: white;
            border: 1px solid #007bff;
        }
        .paginacao a:hover {
            background-color: #0056b3;
            color: #fff;
            border-color: #0056b3;
        }
        .paginacao span {
            margin: 0 5px;
            padding: 8px 12px;
            color: #6c757d;
        }
        button {
            background-color: #17a2b8;
            color: #fff;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #138496;
        }
        a {
            text-decoration: none;
            color: #dc3545;
            margin-left: 10px;
            font-weight: bold;
        }
        a:hover {
            color: #bd2130;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h1>Gerenciar Empresas</h1>

    <form method="POST" action="pages-companies.php">
        <input type="hidden" name="id" id="id">
        <label for="nome">Nome:</label>
        <input type="text" name="nome" id="nome" required>

        <label for="description">Descrição:</label>
        <input type="text" name="description" id="description">

        <label for="legal">Legal:</label>
        <input type="text" name="legal" id="legal">

        <label for="duns">DUNS:</label>
        <input type="text" name="duns" id="duns">

        <label for="vat">VAT:</label>
        <input type="text" name="vat" id="vat">

        <label for="score">Score:</label>
        <input type="text" name="score" id="score">

        <label for="sentiment">Sentimento:</label>
        <input type="text" name="sentiment" id="sentiment">

        <label for="status">Status:</label>
        <input type="text" name="status" id="status">

        <label for="source">Fonte:</label>
        <input type="text" name="source" id="source">

        <button type="submit">Salvar</button>
    </form>

    <h2>Lista de Empresas</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Legal</th>
                <th>DUNS</th>
                <th>VAT</th>
                <th>Score</th>
                <th>Sentimento</th>
                <th>Status</th>
                <th>Fonte</th>
                <th>Atualizado em</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($empresas as $empresa): ?>
                <tr>
                    <td><?= $empresa['ID'] ?></td>
                    <td><?= $empresa['Name'] ?></td>
                    <td><?= $empresa['Description'] ?></td>
                    <td><?= $empresa['Legal'] ?></td>
                    <td><?= $empresa['DUNS'] ?></td>
                    <td><?= $empresa['VAT'] ?></td>
                    <td><?= $empresa['Score'] ?></td>
                    <td><?= $empresa['Sentiment'] ?></td>
                    <td><?= $empresa['Status'] ?></td>
                    <td><?= $empresa['Source'] ?></td>
                    <td><?= $empresa['Updated_at'] ?></td>
                    <td>
                        <button onclick="editarEmpresa(<?= htmlspecialchars(json_encode($empresa)) ?>)">Editar</button>
                        <a href="?delete=<?= $empresa['ID'] ?>" onclick="return confirm('Tem certeza que deseja excluir?');">Apagar</a>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <div class="paginacao">
        <?php if ($pagina > 1): ?>
            <a href="?pagina=<?= $pagina - 1 ?>">&laquo; Anterior</a>
        <?php else: ?>
            <span>&laquo; Anterior</span>
        <?php endif; ?>

        <?php for ($i = 1; $i <= $total_paginas; $i++): ?>
            <a href="?pagina=<?= $i ?>" class="<?= $i == $pagina ? 'active' : '' ?>">
                <?= $i ?>
            </a>
        <?php endfor; ?>

        <?php if ($pagina < $total_paginas): ?>
            <a href="?pagina=<?= $pagina + 1 ?>">Próxima &raquo;</a>
        <?php else: ?>
            <span>Próxima &raquo;</span>
        <?php endif; ?>
    </div>

    <script>
        function editarEmpresa(empresa) {
            document.getElementById('id').value = empresa.ID;
            document.getElementById('nome').value = empresa.Name;
            document.getElementById('description').value = empresa.Description;
            document.getElementById('legal').value = empresa.Legal;
            document.getElementById('duns').value = empresa.DUNS;
            document.getElementById('vat').value = empresa.VAT;
            document.getElementById('score').value = empresa.Score;
            document.getElementById('sentiment').value = empresa.Sentiment;
            document.getElementById('status').value = empresa.Status;
            document.getElementById('source').value = empresa.Source;
        }
    </script>
</body>
</html>
