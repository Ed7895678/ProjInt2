<?php
session_start();
include 'db_connection.php';

// Função para buscar todos os usuários
function fetchUsers($conn) {
    $sql = "SELECT id, name, email, user_type FROM users";
    $result = $conn->query($sql);
    return $result->fetch_all(MYSQLI_ASSOC);
}

// Tratamento de ações: adicionar, atualizar ou deletar
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add':
                $name = $_POST['name'];
                $email = $_POST['email'];
                $user_type = $_POST['user_type'];
                $password = password_hash($_POST['password'], PASSWORD_DEFAULT); // Hash da senha
                $sql = "INSERT INTO users (name, email, user_type, password) VALUES (?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ssss", $name, $email, $user_type, $password);
                $stmt->execute();
                break;
            case 'update':
                $id = $_POST['id'];
                $name = $_POST['name'];
                $email = $_POST['email'];
                $user_type = $_POST['user_type'];
                $sql = "UPDATE users SET name = ?, email = ?, user_type = ? WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sssi", $name, $email, $user_type, $id);
                $stmt->execute();
                break;
            case 'delete':
                $id = $_POST['id'];
                $sql = "DELETE FROM users WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $id);
                $stmt->execute();
                break;
        }
    }
    header("Location: pages-users.php"); // Recarregar a página para evitar ressubmissão
    exit();
}

$users = fetchUsers($conn);
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">

  <title>Pages / Users</title>
  <meta content="" name="description">
  <meta content="" name="keywords">

  <!-- Favicons -->
  <link href="assits/img/favicon.png" rel="icon">
  <link href="assits/img/apple-touch-icon.png" rel="apple-touch-icon">

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
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
            color: #333;
        }

        table {
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
        }

        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background-color: #2c384e;
            color: white;
        }

        tr:hover {background-color: #f5f5f5;}

        form {
            margin-top: 20px;
        }

        input[type="text"], input[type="email"], input[type="password"], select {
            padding: 10px;
            margin: 8px 0;
            display: inline-block;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }

        button {
            background-color: #2c384e;
            color: white;
            padding: 10px 20px;
            margin: 8px 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover {
            background-color:#2c384e;
        }

        .error {
            color: #FF0000;
        }

        .success {
            color: #008000;
        }
    </style>

  <!-- ======= Header ======= -->
  <header id="header" class="header fixed-top d-flex align-items-center">

    <div class="d-flex align-items-center justify-content-between">
      <a href="pages-users.php" class="logo d-flex align-items-center">
        <img src="assits/img/logo_b_PI2.png" alt="">
        <span class="d-none d-lg-block">Emprelis</span>
      </a>
      <i class="bi bi-list toggle-sidebar-btn"></i>
    </div><!-- End Logo -->

    <nav class="header-nav ms-auto">
      <ul class="d-flex align-items-center">

        <li class="nav-item d-block d-lg-none">
          <a class="nav-link nav-icon search-bar-toggle " href="#">
            <i class="bi bi-search"></i>
          </a>
        </li><!-- End Search Icon-->

      </ul>
    </nav><!-- End Icons Navigation -->

  </header><!-- End Header -->

  <!-- ======= Sidebar ======= -->
  <aside id="sidebar" class="sidebar">

    <ul class="sidebar-nav" id="sidebar-nav">

      <li class="nav-item">
        <a class="nav-link collapsed" href="admin_page.php">
          <i class="bi bi-grid"></i>
          <span>Dashboard</span>
        </a>
      </li><!-- End Dashboard Nav -->

     

      <li class="nav-heading">Pages</li>

      <li class="nav-item">
        <a class="nav-link collapsed" href="pages-users.php">
          <i class="fa-solid fa-users"></i>
          <span>Users</span>
        </a>
      </li><!-- End users Page Nav -->

      <li class="nav-item">
        <a class="nav-link collapsed" href="pages-mensages.php">
          <i class="fa-solid fa-comment-dots"></i>
          <span>Mensagem</span>
        </a>
      </li><!-- End mensages Page Nav -->

      <li class="nav-item">
        <a class="nav-link collapsed" href="pages-companies.php">
          <i class="fa-solid fa-building"></i>
          <span>Companies</span>
        </a>
      </li><!-- End companies Page Nav -->
    </ul>
  </aside><!-- End Sidebar-->

  <main id="main" class="main">

    <div class="pagetitle">
      <h1>Gestão de Utilizadores</h1>
      <nav>
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a href="index.html">Home</a></li>
          <li class="breadcrumb-item">Pages</li>
          <li class="breadcrumb-item active">Users</li>
        </ol>
      </nav>
    </div><!-- End Page Title -->

    <section class="section faq">
<h2>Adicionar Novo Utilizador</h2>
<form method="post">
    <input type="hidden" name="action" value="add">
    Nome: <input type="text" name="name" required><br>
    Email: <input type="email" name="email" required><br>
    Tipo de Usuário: <select name="user_type" required>
        <option value="admin">Admin</option>
        <option value="user">User</option>
    </select><br>
    Senha: <input type="password" name="password" required><br>
    <button type="submit">Adicionar Usuário</button>
</form>

<h2>Lista de Usuários</h2>
<table border="1">
    <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Email</th>
        <th>Tipo de Usuário</th>
        <th>Ações</th>
    </tr>
    <?php foreach ($users as $user): ?>
        <tr>
            <td><?= htmlspecialchars($user['id']) ?></td>
            <td><?= htmlspecialchars($user['name']) ?></td>
            <td><?= htmlspecialchars($user['email']) ?></td>
            <td><?= htmlspecialchars($user['user_type']) ?></td>
            <td>
                <form method="post" style="display: inline;">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= $user['id'] ?>">
                    <button type="submit">Apagar</button>
                </form>
                <form method="post" style="display: inline;">
                    <input type="hidden" name="action" value="update">
                    <input type="hidden" name="id" value="<?= $user['id'] ?>">
                    <button type="submit">Editar</button>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
</table>
    </section>

  </main><!-- End #main -->

  <!-- ======= Footer ======= -->
  <footer id="footer" class="footer">
    <div class="copyright">
      &copy; Copyright <strong><span>Emprelis</span></strong>. All Rights Reserved
    </div>
  </footer><!-- End Footer -->

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
