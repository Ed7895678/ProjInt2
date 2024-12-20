<?php include('verificar_login.php');  // Inclui a verificação de login ?>
<?php
// Início do bloco PHP para inicialização de variáveis e conexão com o banco de dados
include 'db_connection.php';

// Inicializar variáveis de filtro e paginação
$description = isset($_GET['description']) ? trim($_GET['description']) : '';
$nome_empresa = isset($_GET['nome_empresa']) ? trim($_GET['nome_empresa']) : '';
$nif_empresa = isset($_GET['nif_empresa']) ? trim($_GET['nif_empresa']) : '';
$regiao = isset($_GET['regiao']) ? trim($_GET['regiao']) : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

// Definir o limite de resultados por página e calcular o offset
$results_per_page = 15;
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $results_per_page;

// Construir a consulta SQL com JOIN entre companies, addresses e caes
$sql = "SELECT SQL_CALC_FOUND_ROWS companies.*, addresses.County, addresses.Location, addresses.District, caes.Description 
        FROM companies 
        LEFT JOIN addresses ON companies.ID = addresses.IDBrand 
        LEFT JOIN caes_companies ON companies.ID = caes_companies.IDCompany
        LEFT JOIN caes ON caes_companies.CAE = caes.Code
        WHERE 1=1";

// Construir parâmetros para a consulta
$params = [];
$types = '';

// Adicionar filtros se estiverem preenchidos
if (!empty($query)) {
    if (is_numeric($query)) {
        $sql .= " AND companies.VAT = ?";
        $types .= 's';
        $params[] = $query;
    } else {
        $sql .= " AND companies.Name LIKE ?";
        $types .= 's';
        $params[] = "%" . $query . "%";
    }
}

if (!empty($nome_empresa)) {
    $sql .= " AND companies.Name LIKE ?";
    $types .= 's';
    $params[] = "%" . $nome_empresa . "%";
}

if (!empty($nif_empresa)) {
    $sql .= " AND companies.VAT = ?";
    $types .= 's';
    $params[] = $nif_empresa;
}

if (!empty($regiao)) {
    $sql .= " AND (addresses.County LIKE ? OR addresses.District LIKE ? OR addresses.Location LIKE ?)";
    $types .= 'sss';
    $params[] = "%" . $regiao . "%";
    $params[] = "%" . $regiao . "%";
    $params[] = "%" . $regiao . "%";
}

// Adicionar filtro para a categoria (description) se estiver preenchido
if (!empty($description)) {
    $sql .= " AND caes.Description LIKE ?";
    $types .= 's';
    $params[] = "%" . $description . "%";
}

// Adicionar limite e offset para paginação
$sql .= " LIMIT ?, ?";
$types .= 'ii';
$params[] = $offset;
$params[] = $results_per_page;


// Preparar e executar a consulta
$stmt = $conn->prepare($sql);
if (!$stmt) {
    die("Erro na preparação da consulta: " . $conn->error);
}

// Bind dos parâmetros
$stmt->bind_param($types, ...$params);

// Executar a consulta
$stmt->execute();
$result = $stmt->get_result();

// Obter o número total de resultados para calcular o total de páginas
$total_results = $conn->query("SELECT FOUND_ROWS() AS total")->fetch_assoc()['total'];
$total_pages = ceil($total_results / $results_per_page);
?>


<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultado da Pesquisa</title>

    <!-- Fonts e CSS Principal -->
    <link href="https://fonts.googleapis.com" rel="preconnect">
    <link href="https://fonts.gstatic.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
    <link href="assets/css/main.css" rel="stylesheet">

    <style>
        body {
            font-family: "Roboto", sans-serif;
            background-color: #f9f9f9;
            color: #333;
            margin: 0;
            padding: 0;
        }

        .container-p {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
        }

        h1, h2 {
            color: #444;
        }

        p {
            line-height: 1.6;
            font-size: 16px;
        }

        .result-item {
            padding: 15px;
            border: 1px solid #eaeaea;
            border-radius: 8px;
            margin-bottom: 10px;
            text-decoration: none;
            color: inherit;
            transition: background-color 0.3s;
        }

        .result-item:hover {
            background-color: #f1f1f1;
        }

        .icon {
            background-color: #000;
            border-radius: 50%;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .company-info {
            flex-grow: 1;
            margin-left: 15px;
        }

        .company-name {
            font-weight: bold;
            font-size: 18px;
        }

        .company-nif {
            color: #666;
        }

        .company-location {
            color: #000;
        }

        /* Estilo para a barra lateral de filtros */
        .filter-sidebar {
            padding: 15px;
            border: 1px solid #eaeaea;
            border-radius: 8px;
            background-color: #f5f5f5;
            margin-bottom: 20px;
            position: sticky;
            top: 120px;
        }

        .filter-sidebar h2 {
            margin-bottom: 15px;
        }

        .filter-sidebar label {
            font-weight: 500;
        }

        .filter-sidebar .form-control {
            margin-bottom: 15px;
        }

        .filter-sidebar .btn-filter {
            background-color: #96670b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
        }

        .filter-sidebar .btn-filter:hover {
            background-color: #814d0a;
        }

        /* Responsividade para dispositivos menores */
        @media (max-width: 767.98px) {
            .filter-sidebar {
                position: static;
                margin-bottom: 20px;
            }
        }

        /* Centralizar paginação */
        .pagination-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 20px;
        }
    </style>
</head>

<body>

    <!-- Navegação -->
    <header id="header" class="header d-flex align-items-center fixed-top">
        <div class="container-fluid container-xl d-flex align-items-center justify-content-between">
            <a href="index.php" class="logo d-flex align-items-center">
                <img src="assets/img/logo_b_PI2.png" alt="">
                <h1 class="sitename">Emprelis<span>.</span></h1>
            </a>

            <nav id="navmenu" class="navmenu">
            <ul>
                <li><a href="#services">Serviços</a></li>
                <li><a href="#contact">Apoio Cliente</a></li>
                <li><a href="pprivacy.html">Privacy Policy</a></li>
                <li><a href="termsU.html">Terms of Use</a></li>
            </ul>
                <i class="mobile-nav-toggle d-xl-none bi bi-list"></i>
            </nav>
        </div>
    </header>

    <!-- Resultado de Pesquisa -->
    <main class="container-p" style="margin-top: 120px;">
        <div class="row">
            <!-- Barra Lateral de Filtros -->
            <div class="col-lg-3 col-md-4">
                <div class="filter-sidebar">
                    <h2>Filtrar Resultados</h2>
                    <form method="GET" action="pesquisa.php">
                        <?php if (!empty($query)) : ?>
                            <input type="hidden" name="query" value="<?php echo htmlspecialchars($query); ?>">
                        <?php endif; ?>

                        <div class="mb-3">
                            <label for="nome_empresa" class="form-label">Nome da Empresa:</label>
                            <input type="text" class="form-control" id="nome_empresa" name="nome_empresa" value="<?php echo htmlspecialchars($nome_empresa); ?>" placeholder="Digite o nome da empresa">
                        </div>

                        <div class="mb-3">
                            <label for="categoria" class="form-label">Categoria:</label>
                            <input type="text" class="form-control" id="categoria" name="description" value="<?php echo htmlspecialchars($description); ?>" placeholder="Digite a categoria">
                        </div>

                        <div class="mb-3">
                            <label for="nif_empresa" class="form-label">NIF da Empresa:</label>
                            <input type="text" class="form-control" id="nif_empresa" name="nif_empresa" value="<?php echo htmlspecialchars($nif_empresa); ?>" placeholder="Digite o NIF da empresa">
                        </div>

                        <div class="mb-3">
                            <label for="regiao" class="form-label">Região:</label>
                            <input type="text" class="form-control" id="regiao" name="regiao" value="<?php echo htmlspecialchars($regiao); ?>" placeholder="Digite a região">
                        </div>

                        <button type="submit" class="btn-filter">Filtrar</button>
                    </form>
                </div>
            </div>

            <!-- Resultados da Pesquisa -->
            <div class="col-lg-9 col-md-8">
                <?php
                if ($result->num_rows > 0) {
                    echo '<div class="search-results">';
                    echo '<h2>' . number_format($total_results) . ' resultado(s) encontrado(s)</h2>';
                    echo '<div class="result-list">';
                
                    while ($row = $result->fetch_assoc()) {
                        echo '<a href="detalhes.php?id=' . urlencode($row['ID']) . '" class="result-item d-flex align-items-center justify-content-between">';
                        echo '<div class="icon">';
                        echo '<img src="assets/img/logo_b_PI2.png" alt="Logo da Empresa" style="width: 40px; height: auto; border-radius: 50%;">';
                        echo '</div>';
                        echo '<div class="company-info">';
                        echo '<div class="company-name">' . htmlspecialchars($row['Name']) . '</div>';
                        echo '<div class="company-nif">NIF: ' . htmlspecialchars($row['VAT']) . '</div>';
                        echo '<div class="company-description">';
                        echo isset($row['Description']) ? htmlspecialchars($row['Description']) : 'Descrição não disponível';
                        echo '</div>';
                        echo '</div>';
                        echo '<div class="company-location d-flex align-items-center">';
                        echo '<i class="bi bi-geo-alt" style="margin-right: 5px;"></i> ';
                        echo isset($row['Location']) ? htmlspecialchars($row['Location']) : 
                             (isset($row['County']) ? htmlspecialchars($row['County']) : 
                             (isset($row['District']) ? htmlspecialchars($row['District']) : 'Localização não disponível'));
                        echo '<i class="bi bi-chevron-right" style="font-size: 24px; color: #96670b; margin-left: 10px;"></i>';
                        echo '</div>';
                        echo '</a>';
                    }
                
                    echo '</div>';
                    echo '</div>';
                } else {
                    echo "<p>Nenhuma empresa encontrada com os critérios especificados.</p>";
                }

                $stmt->close();
                $conn->close();
                ?>

                <!-- Paginação -->
                <div class="pagination-container">
                    <nav aria-label="Paginação">
                        <ul class="pagination justify-content-center">
                            <?php if ($page > 1): ?>
                                <li class="page-item"><a class="page-link" href="?page=1">Primeira</a></li>
                                <li class="page-item"><a class="page-link" href="?page=<?php echo $page - 1; ?>">«</a></li>
                            <?php endif; ?>

                            <?php
                            $start = max(1, $page - 2);
                            $end = min($total_pages, $page + 2);

                            if ($start > 1) {
                                echo '<li class="page-item disabled"><span class="page-link">...</span></li>';
                            }

                            for ($i = $start; $i <= $end; $i++): ?>
                                <?php if ($i == $page): ?>
                                    <li class="page-item active"><span class="page-link"><?php echo $i; ?></span></li>
                                <?php else: ?>
                                    <li class="page-item"><a class="page-link" href="?page=<?php echo $i; ?>"><?php echo $i; ?></a></li>
                                <?php endif; ?>
                            <?php endfor; ?>

                            <?php if ($end < $total_pages): ?>
                                <li class="page-item disabled"><span class="page-link">...</span></li>
                                <li class="page-item"><a class="page-link" href="?page=<?php echo $total_pages; ?>"><?php echo $total_pages; ?></a></li>
                            <?php endif; ?>

                            <?php if ($page < $total_pages): ?>
                                <li class="page-item"><a class="page-link" href="?page=<?php echo $page + 1; ?>">»</a></li>
                                <li class="page-item"><a class="page-link" href="?page=<?php echo $total_pages; ?>">Última</a></li>
                            <?php endif; ?>
                        </ul>
                    </nav>
                    <p style="margin-top: 10px;">Página <?php echo $page; ?> de <?php echo $total_pages; ?></p>
                </div>

            </div>
        </div>
    </main>

    <!-- Rodapé e Scripts -->
    <footer id="footer" class="footer dark-background">
        <!-- Conteúdo do rodapé conforme o original -->
    </footer>

    <script src="assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="assets/vendor/aos/aos.js"></script>
    <script src="assets/vendor/glightbox/js/glightbox.min.js"></script>
    <script src="assets/vendor/swiper/swiper-bundle.min.js"></script>
    <script src="assets/js/main.js"></script>
</body>
</html>
