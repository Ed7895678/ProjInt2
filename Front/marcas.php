<?php include 'verificar_login.php'; ?>
<?php
include 'db_connection.php'; // Certifique-se que este arquivo existe e conecta ao banco de dados corretamente

// Verifica se o ID da marca foi passado pela URL
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $marca_id = $_GET['id'];

    // Consulta SQL com JOINs para buscar os dados necessários
    $sql = "SELECT brands.Name, brands.VAT, addresses.Address, brands.Score, brands.NumReviews, brands.Description, 
                   categories.Code AS CategoryCode, categories.Description AS CategoryDescription
            FROM brands
            LEFT JOIN addresses ON brands.ID = addresses.IDBrand
            LEFT JOIN categories_brands ON brands.ID = categories_brands.IDBrand
            LEFT JOIN categories ON categories_brands.Category = categories.Code
            WHERE brands.ID = ?";
    
    $stmt = $conn->prepare($sql);
    
    if ($stmt === false) {
        die("Erro na preparação da consulta: " . $conn->error);
    }

    // Associar o ID ao parâmetro da consulta
    $stmt->bind_param("i", $marca_id);
    $stmt->execute();
    $result = $stmt->get_result();

    // Verificar se a marca foi encontrada
    if ($result->num_rows > 0) {
        $marca = $result->fetch_assoc();
    } else {
        echo '<p>Marca não encontrada.</p>';
        exit();
    }

    $stmt->close();
} else {
    echo '<p>ID da marca não foi informado ou é inválido.</p>';
    exit();
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalhes da Marca</title>

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

        .container-details {
            max-width: 900px;
            margin: 30px auto;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .detail-header {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #DAA520;
        }

        .detail-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }

        .detail-item:last-child {
            border-bottom: none;
        }

        .detail-icon {
            background-color: #DAA520;
            border-radius: 50%;
            padding: 10px;
            margin-right: 20px;
            font-size: 24px;
            color: #000;
        }

        .detail-content {
            flex-grow: 1;
        }

        .detail-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .detail-value {
            color: #666;
        }

        .btn-back {
            display: inline-block;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 500;
            color: white;
            background-color: #DAA520;
            border-radius: 5px;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }

        .btn-back:hover {
            background-color: #b8911d;
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
                    <li class="dropdown"><a href="#services"><span>Serviços</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a>
                        <ul>
                            <li><a href="#">Análise da Concorrência</a></li>
                            <li><a href="#">Base de Dados</a></li>
                        </ul>
                    </li>
                    <li class="dropdown"><a href="#empresas"><span>Empresas</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a>
                        <ul>
                            <li><a href="#">Observatório</a></li>
                            <li><a href="#">Empresas por CAE</a></li>
                        </ul>
                    </li>
                    <li><a href="#team">Equipa</a></li>
                    <li><a href="#contact">Apoio Cliente</a></li>
                    <li><a href="pprivacy.html">Privacy Policy</a></li>
                    <li><a href="termsU.html">Terms of Use</a></li>
                </ul>
                <i class="mobile-nav-toggle d-xl-none bi bi-list"></i>
            </nav>
        </div>
    </header>

    <!-- Detalhes da Marca -->
    <main class="container-details" style="margin-top: 120px;">
        <h1 class="detail-header">Informações da Marca: <?php echo htmlspecialchars($marca['Name']) ?: 'Não disponível'; ?></h1>

        <!-- Exibição dos Detalhes na Ordem Especificada -->
        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-person-vcard"></i></div>
            <div class="detail-content">
                <div class="detail-title">Nome</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['Name']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-card-list"></i></div>
            <div class="detail-content">
                <div class="detail-title">VAT</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['VAT']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-geo-alt"></i></div>
            <div class="detail-content">
                <div class="detail-title">Morada</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['Address']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-bar-chart-line"></i></div>
            <div class="detail-content">
                <div class="detail-title">Score</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['Score']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-star"></i></div>
            <div class="detail-content">
                <div class="detail-title">Número de Avaliações</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['NumReviews']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-info-circle"></i></div>
            <div class="detail-content">
                <div class="detail-title">Descrição</div>
                <div class="detail-value"><?php echo nl2br(htmlspecialchars($marca['Description']) ?: 'Não disponível'); ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-tag"></i></div>
            <div class="detail-content">
                <div class="detail-title">Categoria (Code)</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['CategoryCode']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="detail-item">
            <div class="detail-icon"><i class="bi bi-card-text"></i></div>
            <div class="detail-content">
                <div class="detail-title">Descrição da Categoria</div>
                <div class="detail-value"><?php echo htmlspecialchars($marca['CategoryDescription']) ?: 'Não disponível'; ?></div>
            </div>
        </div>

        <div class="text-center my-4">
            <a href="pesquisa.php" class="btn-back">Voltar</a>
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
