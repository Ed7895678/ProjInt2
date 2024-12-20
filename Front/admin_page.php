<?php
include('verificar_login.php');  // Inclui a verificação de login
include 'db_connection.php';     // Conexão com o banco de dados



// Consulta para contar os usuários registrados
$query_users = "SELECT COUNT(*) AS total_users FROM users";
$result_users = $conn->query($query_users);
$total_users = ($result_users && $row_users = $result_users->fetch_assoc()) ? $row_users['total_users'] : 0;

// Consulta para contar as empresas registradas
$query_companies = "SELECT COUNT(*) AS total_companies FROM companies";
$result_companies = $conn->query($query_companies);
$total_companies = ($result_companies && $row_companies = $result_companies->fetch_assoc()) ? $row_companies['total_companies'] : 0;

// Consulta para contar mensagens não lidas
$query_messages = "SELECT COUNT(*) AS total_messages FROM messages WHERE is_read = 0";
$result_messages = $conn->query($query_messages);
$total_messages = ($result_messages && $row_messages = $result_messages->fetch_assoc()) ? $row_messages['total_messages'] : 0;

// Consulta para buscar o crescimento dos utilizadores
$query_growth = "SELECT DATE(created_at) AS registration_date, COUNT(*) AS total_users
                 FROM users
                 GROUP BY DATE(created_at)
                 ORDER BY DATE(created_at) ASC";

$result_growth = $conn->query($query_growth);
$dates = [];
$user_counts = [];

if ($result_growth) {
    while ($row = $result_growth->fetch_assoc()) {
        $dates[] = $row['registration_date'];
        $user_counts[] = $row['total_users'];
    }
}
$dates_json = json_encode($dates);
$user_counts_json = json_encode($user_counts);

// Consulta para buscar o crescimento das empresas
$query_companies_growth = "SELECT DATE(created_at) AS registration_date, COUNT(*) AS total_companies
                           FROM companies
                           GROUP BY DATE(created_at)
                           ORDER BY DATE(created_at) ASC";

$result_companies_growth = $conn->query($query_companies_growth);
$company_dates = [];
$company_counts = [];

if ($result_companies_growth) {
    while ($row = $result_companies_growth->fetch_assoc()) {
        $company_dates[] = $row['registration_date'];
        $company_counts[] = $row['total_companies'];
    }
}
$company_dates_json = json_encode($company_dates);
$company_counts_json = json_encode($company_counts);

// Consulta para buscar utilizadores recentes
$query_recent_users = "SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 5";
$result_recent_users = $conn->query($query_recent_users);

// Consulta para buscar empresas recentes
$query_recent_companies = "SELECT name, created_at FROM companies ORDER BY created_at DESC LIMIT 5";
$result_recent_companies = $conn->query($query_recent_companies);

// Array para armazenar atividades recentes
$recent_activities = [];

// Adicionar utilizadores recentes ao array
if ($result_recent_users) {
    while ($row = $result_recent_users->fetch_assoc()) {
        $recent_activities[] = [
            'type' => 'User',
            'name' => $row['name'],
            'time' => $row['created_at']
        ];
    }
}

// Adicionar empresas recentes ao array
if ($result_recent_companies) {
    while ($row = $result_recent_companies->fetch_assoc()) {
        $recent_activities[] = [
            'type' => 'Company',
            'name' => $row['name'],
            'time' => $row['created_at']
        ];
    }
}

// Ordenar atividades recentes por tempo
usort($recent_activities, function($a, $b) {
    return strtotime($b['time']) - strtotime($a['time']);
});


$conn->close(); // Fechar a conexão apenas no final
?>



    <!DOCTYPE html>
    <html lang="pt">

    <head>
        <meta charset="utf-8">
        <meta content="width=device-width, initial-scale=1.0" name="viewport">

        <title>Emprelis</title>
        <meta content="" name="description">
        <meta content="" name="keywords">

        <!-- Favicons -->
        <link href="assets/img/logo_b_PI2.png" rel="icon">
        <link href="assets/img/logo_b_PI2.png" rel="apple-touch-icon">

        <!-- Google Fonts -->
        <link href="https://fonts.gstatic.com" rel="preconnect">
        <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i|Nunito:300,300i,400,400i,600,600i,700,700i|Poppins:300,300i,400,400i,500,500i,600,600i,700,700i" rel="stylesheet">

        <!-- Vendor CSS Files -->
        <link href="assits/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
        <link href="assits/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
        <link href="assits/vendor/boxicons/css/boxicons.min.css" rel="stylesheet">
        <link href="assits/vendor/quill/quill.snow.css" rel="stylesheet">
        <link href="assits/vendor/quill/quill.bubble.css" rel="stylesheet">
        <link href="assits/vendor/remixicon/remixicon.css" rel="stylesheet">
        <link href="assits/vendor/simple-datatables/style.css" rel="stylesheet">

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">


        <!-- Template Main CSS File -->
        <link href="assits/css/style.css" rel="stylesheet">
    </head>

    <body>
      <style>
        .btn {
    padding: 10px 20px; /* Padding para fazer o botão maior e mais legível */
    text-decoration: none; /* Remove sublinhado dos links */
    color: white; /* Cor do texto */
    border-radius: 5px; /* Bordas arredondadas */
    font-weight: bold; /* Texto em negrito */
    transition: background-color 0.3s; /* Transição suave para hover */
}

.btn-primary {
    background-color: #007bff; /* Cor azul padrão para botão primário */
}

.btn-primary:hover {
    background-color: #0056b3; /* Cor mais escura no hover */
}

.btn-secondary {
    background-color: #6c757d; /* Cor cinza padrão para botão secundário */
}

.btn-secondary:hover {
    background-color: #545b62; /* Cor mais escura no hover */
}

        /* Estilo para Recent Activity */
.activity {
    list-style: none;
    padding: 0;
    margin: 0;
}

.activity-item {
    display: flex;
    align-items: flex-start;
    padding: 10px 0;
    border-bottom: 1px solid #e9ecef;
    transition: background 0.3s ease-in-out;
}

.activity-item:hover {
    background: #f8f9fa;
    border-radius: 8px;
}

.activite-label {
    margin-right: 15px;
    font-size: 12px;
    color: #6c757d;
    white-space: nowrap;
    font-weight: bold;
}

.activity-badge {
    font-size: 16px;
    margin-right: 10px;
    color: #0d6efd; /* Cor azul padrão */
}

.activity-content {
    font-size: 14px;
    color: #495057;
    font-weight: 500;
}

.activity-content strong {
    color: #212529;
    font-weight: 700;
}



      </style>

        <!-- ======= Header ======= -->
        <header id="header" class="header fixed-top d-flex align-items-center">

            <div class="d-flex align-items-center justify-content-between">
                <a href="admin_page.php" class="logo d-flex align-items-center">
                    <img src="assits/img/logo_b_PI2.png" alt="">
                    <span class="d-none d-lg-block">Emprelis</span>
                </a>
                <i class="bi bi-list toggle-sidebar-btn"></i>
            </div>
            <!-- End Logo -->

            <div class="search-bar">
                <form class="search-form d-flex align-items-center" method="POST" action="#">
                    <input type="text" name="query" placeholder="Search" title="Enter search keyword">
                    <button type="submit" title="Search"><i class="bi bi-search"></i></button>
                </form>
            </div>
            <!-- End Search Bar -->

            <nav class="header-nav ms-auto">
                <ul class="d-flex align-items-center">

                    <li class="nav-item d-block d-lg-none">
                        <a class="nav-link nav-icon search-bar-toggle " href="#">
                            <i class="bi bi-search"></i>
                        </a>
                    </li>
                    <!-- End Search Icon-->

                    <li class="nav-item dropdown">

                    <div class="user-options d-flex align-items-center">
                        <a class="btn btn-outline-warning" href="logout.php">Logout</a>
                    </div>
                        <!-- End Profile Dropdown Items -->
                    </li>
                    <!-- End Profile Nav -->

                </ul>
            </nav>
            <!-- End Icons Navigation -->

        </header>
        <!-- End Header -->

        <!-- ======= Sidebar ======= -->
        <aside id="sidebar" class="sidebar">

            <ul class="sidebar-nav" id="sidebar-nav">

                <li class="nav-item">
                    <a class="nav-link " href="admin_page.php">
                        <i class="bi bi-grid"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
                <!-- End Dashboard Nav -->

                <li class="nav-heading">Pages</li>
                <li class="nav-item">
                    <a class="nav-link collapsed" href="pages-users.php">
                        <i class="fa-solid fa-users"></i>
                        <span>Users</span>
                    </a>
                </li>
                <!-- End users Page Nav -->

                <li class="nav-item">
                    <a class="nav-link collapsed" href="pages-mensages.php">
                        <i class="fa-solid fa-comment-dots"></i>
                        <span>Mensagem</span>
                    </a>
                </li>
                <!-- End mensages Page Nav -->

                <li class="nav-item">
                    <a class="nav-link collapsed" href="pages-companies.php">
                        <i class="fa-solid fa-building"></i>
                        <span>Companies</span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link collapsed" href="pages-funcoes.php">
                    <i class="fa-solid fa-circle-exclamation"></i>
                        <span>Funções</span>
                    </a>
                </li>
                <!-- End companies Page Nav -->
            </ul>
        </aside>
        <!-- End Sidebar-->

        <main id="main" class="main">
            <div class="center">
                <!-- Mensagem de boas-vindas com o nome do usuário -->
                <div class="welcome-user" data-aos="fade-up" data-aos-delay="50">
                    <h2>Bem-vindo(a), <?php echo htmlspecialchars($_SESSION['admin_name']); ?></h2>
                </div>
            </div>



            <div class="pagetitle">
                <h1>Dashboard</h1>
                <nav>
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="admin_page.php">Home</a></li>
                        <li class="breadcrumb-item active">Dashboard</li>
                    </ol>
                </nav>
            </div>
            <!-- End Page Title -->

            <section class="section dashboard">
                <div class="row">

                    <!-- Left side columns -->
                    <div class="col-lg-8">
                        <div class="row">
<!-- Registered Users -->
<div class="col-xxl-4 col-md-6">
                <div class="card info-card sales-card">
                    <div class="card-body">
                        <h5 class="card-title">Registered Users</h5>
                        <div class="d-flex align-items-center">
                            <div class="card-icon rounded-circle d-flex align-items-center justify-content-center">
                                <i class="fa-solid fa-users-gear"></i>
                            </div>
                            <div class="ps-3">
                                <h6><?php echo $total_users; ?></h6>
                                <span class="text-success small pt-1 fw-bold">Users</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div><!-- End Registered Users -->

            <!-- Registered Companies -->
            <div class="col-xxl-4 col-md-6">
                <div class="card info-card revenue-card">
                    <div class="card-body">
                        <h5 class="card-title">Registered Companies</h5>
                        <div class="d-flex align-items-center">
                            <div class="card-icon rounded-circle d-flex align-items-center justify-content-center">
                                <i class="fa-solid fa-business-time"></i>
                            </div>
                            <div class="ps-3">
                                <h6><?php echo $total_companies; ?></h6>
                                <span class="text-success small pt-1 fw-bold">Companies</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div><!-- End Registered Companies -->

            <!-- Unread Messages -->
            <div class="col-xxl-4 col-md-6">
                <div class="card info-card customers-card">
                    <div class="card-body">
                        <h5 class="card-title">Unread Message</h5>
                        <div class="d-flex align-items-center">
                            <div class="card-icon rounded-circle d-flex align-items-center justify-content-center">
                                <i class="fa-solid fa-comments"></i>
                            </div>
                            <div class="ps-3">
                                <h6><?php echo $total_messages; ?></h6>
                                <span class="text-danger small pt-1 fw-bold">Messages</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div><!-- End Unread Messages -->
        </div>
</div>
    </div><!-- End Left Side Columns -->
    
    <div class="card">
    <div class="card">
    <div class="card-body">
        <h5 class="card-title">Recent Activity</h5>
        <ul class="activity">
            <?php foreach ($recent_activities as $activity): ?>
                <li class="activity-item d-flex align-items-start">
                    <span class="activite-label"><?php echo date("H:i", strtotime($activity['time'])); ?></span>
                    <i class="<?php echo ($activity['type'] == 'User') ? 'bi bi-person-circle text-success' : 'bi bi-building text-info'; ?> activity-badge"></i>
                    <div class="activity-content">
                        <?php echo ($activity['type'] == 'User') ? 'User' : 'Company'; ?> 
                        <strong><?php echo htmlspecialchars($activity['name']); ?></strong> foi adicionado(a).
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
  </div>              
</div>
</div>
</div><!-- End Right Side Columns -->
</div><!-- End Row -->


                            <!-- aqui tera o grafico
             crescimento de user e4 compamnies ao longo do tempo
               -->
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-body">
                                        <h5 class="card-title">Crescimento dos Utilizadores</h5>

                                        <!-- Line Chart -->
                                        <canvas id="userGrowthChart" style="height: 400px; width: 100%;"></canvas>
                                    </div>
                                    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                                    <script>
                                        // Receber os dados JSON do PHP
                                        const dates = <?php echo $dates_json; ?>;
                                        const userCounts = <?php echo $user_counts_json; ?>;
                                    
                                        // Configuração do Gráfico
                                        const ctx = document.getElementById('userGrowthChart').getContext('2d');
                                        new Chart(ctx, {
                                            type: 'line',
                                            data: {
                                                labels: dates.length > 0 ? dates : ['No Data'], // Garante ao menos um label
                                                datasets: [{
                                                    label: 'Crescimento de Utilizadores',
                                                    data: userCounts.length > 0 ? userCounts : [0],
                                                    borderColor: 'rgba(54, 162, 235, 1)',
                                                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                                                    pointRadius: 6, // Tamanho dos pontos
                                                    borderWidth: 2,
                                                    fill: true,
                                                    tension: 0.4 // Suaviza a curva
                                                }]
                                            },
                                            options: {
                                                responsive: true,
                                                plugins: {
                                                    title: {
                                                        display: true,
                                                        text: 'Crescimento de Utilizadores ao Longo do Tempo',
                                                        font: {
                                                            size: 18,
                                                            weight: 'bold'
                                                        }
                                                    },
                                                    legend: {
                                                        display: true,
                                                        position: 'top'
                                                    }
                                                },
                                                scales: {
                                                    x: {
                                                        title: {
                                                            display: true,
                                                            text: 'Data de Registro'
                                                        },
                                                        ticks: {
                                                            autoSkip: true,
                                                            maxTicksLimit: 10
                                                        }
                                                    },
                                                    y: {
                                                        title: {
                                                            display: true,
                                                            text: 'Número de Utilizadores'
                                                        },
                                                        beginAtZero: true,
                                                        suggestedMax: 10 // Melhora a visualização da escala
                                                    }
                                                }
                                            }
                                        });
                                    </script>
                                    <!-- End grafico -->

                                </div>

                            </div>
                        </div>
                        <!-- End Reports -->


                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Crescimento das Empresas</h5>

                                    <!-- Line Chart -->
                                    <canvas id="companyGrowthChart" style="height: 400px; width: 100%;"></canvas>
                                </div>
                                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                                <script>
                                    // Receber os dados JSON do PHP
                                    const companyDates = <?php echo $company_dates_json; ?>;
                                    const companyCounts = <?php echo $company_counts_json; ?>;
                                
                                    // Configuração do Gráfico
                                    const ctxCompanies = document.getElementById('companyGrowthChart').getContext('2d');
                                    new Chart(ctxCompanies, {
                                        type: 'line',
                                        data: {
                                            labels: companyDates.length > 0 ? companyDates : ['No Data'],
                                            datasets: [{
                                                label: 'Crescimento de Empresas',
                                                data: companyCounts.length > 0 ? companyCounts : [0],
                                                borderColor: 'rgba(255, 99, 132, 1)',
                                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                                                pointRadius: 6, // Tamanho dos pontos
                                                borderWidth: 2,
                                                fill: true,
                                                tension: 0.4 // Suaviza a curva
                                            }]
                                        },
                                        options: {
                                            responsive: true,
                                            plugins: {
                                                title: {
                                                    display: true,
                                                    text: 'Crescimento de Empresas ao Longo do Tempo',
                                                    font: {
                                                        size: 18,
                                                        weight: 'bold'
                                                    }
                                                },
                                                legend: {
                                                    display: true,
                                                    position: 'top'
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    title: {
                                                        display: true,
                                                        text: 'Data de Registro'
                                                    },
                                                    ticks: {
                                                        autoSkip: true,
                                                        maxTicksLimit: 10
                                                    }
                                                },
                                                y: {
                                                    title: {
                                                        display: true,
                                                        text: 'Número de Empresas'
                                                    },
                                                    beginAtZero: true,
                                                    suggestedMax: 10
                                                }
                                            }
                                        }
                                    });
                                </script>
                                <!-- End grafico -->

                            </div>

                        </div>
                    </div>
                    <!-- End Reports -->

                </div>
                </div>
                <!-- End Left side columns -->
            </section>
            

        </main>
        <!-- End #main -->

        <!-- ======= Footer ======= -->
        <footer id="footer" class="footer">
            <div class="copyright">
                &copy; Copyright <strong><span>Emprelis</span></strong>. All Rights Reserved
            </div>

        </footer>
        <!-- End Footer -->

        <a href="#" class="back-to-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a>

        <!-- Vendor JS Files -->
        <script src="assits/vendor/apexcharts/apexcharts.min.js"></script>
        <script src="assits/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
        <script src="assits/vendor/chart.js/chart.umd.js"></script>
        <script src="assits/vendor/echarts/echarts.min.js"></script>
        <script src="assits/vendor/quill/quill.js"></script>
        <script src="assits/vendor/simple-datatables/simple-datatables.js"></script>
        <script src="assits/vendor/tinymce/tinymce.min.js"></script>
        <script src="assits/vendor/php-email-form/validate.js"></script>

        <!-- Template Main JS File -->
        <script src="assits/js/main.js"></script>

    </body>

    </html>