
<?php
@include 'db_connection.php'; // Incluir conexão ao banco de dados

// Verificar se a conexão foi bem-sucedida
if (!$conn) {
    die("Conexão falhou: " . mysqli_connect_error());
}

if (isset($_POST['submit'])) {
    // Obter os dados do formulário de registro
    $name = mysqli_real_escape_string($conn, $_POST['name']);
    $email = mysqli_real_escape_string($conn, $_POST['email']);
    $password = $_POST['password']; // A senha fornecida pelo usuário

    // Verificar se o email já está registrado
    $select = "SELECT * FROM users WHERE email = '$email' LIMIT 1";
    $result = mysqli_query($conn, $select);

    // Se o email já existir, exibe erro
    if ($result && mysqli_num_rows($result) > 0) {
        $error[] = 'Este email já está registrado!';
    } else {
        // Criar um hash seguro para a senha
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Inserir os dados do usuário no banco de dados com a senha segura
        $insert = "INSERT INTO users (name, email, password, user_type) VALUES ('$name', '$email', '$hashed_password', 'user')";
        if (mysqli_query($conn, $insert)) {
            echo "Registro bem-sucedido!";
            // Redirecionar para a página de login ou qualquer outra página desejada
            header('Location: login.php');
            exit();
        } else {
            $error[] = 'Erro ao registrar usuário: ' . mysqli_error($conn);
        }
    }
}
?>

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register Page-Emprelis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

     <!-- Favicons -->
  <link href="assets/img/favicon_pi2.png" rel="icon">
  <link href="assets/img/apple-touch-icon.png" rel="apple-touch-icon">

  <!-- Fonts -->
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">

  <!-- Vendor CSS Files -->
  <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
  <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
  <link href="assets/vendor/aos/aos.css" rel="stylesheet">
  <link href="assets/vendor/swiper/swiper-bundle.min.css" rel="stylesheet">
  <link href="assets/vendor/glightbox/css/glightbox.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css">

  <link href="assets/css/main.css" rel="stylesheet">
</head>
<body>
<header id="header" class="header d-flex align-items-center fixed-top">
    <div class="container-fluid container-xl position-relative d-flex align-items-center justify-content-between">

      <a href="login.php" class="logo d-flex align-items-center me-auto me-lg-0">
        <img src="assets/img/logo_b_PI2.png" alt="" class="img-fluid mb-3">
        <h1 class="sitename">Register Page</h1>
        <span>.</span>
      </a>

      <nav id="navmenu" class="navmenu">
        <i class="mobile-nav-toggle d-xl-none bi bi-list"></i>
      </nav>

      <a class="btn-getstarted" href="index.php">Inicial Page</a>
    </div>
  </header>
  <br><br><br>
<style>
    .btn-color {
      background-color: #0e1c36;
      color: #fff;
    }
    .profile-image-pic {
      height: 200px;
      width: 200px;
      object-fit: cover;
    }
    .cardbody-color {
      background-color: #ebf2fa;
    }
    a {
      text-decoration: none;
    }
    .mb-3 select {
      width: 100%;
      padding: 10px 15px;
      font-size: 17px;
      margin: 8px 0;
      background: #eee;
      border-radius: 5px;
    }
    .mb-3 select option {
      background: #fff;
    }
    .text-center .btn-color {
      background: #708090;
      color: #fff;
      text-transform: capitalize;
      font-size: 20px;
      cursor: pointer;
    }
    .text-center .btn-color:hover {
      background: #B0C4DE;
      color: #fff;
    }
    .erro-msg {
      margin: 10px 0;
      display: block;
      background: crimson;
      color: #fff;
      border-radius: 5px;
      font-size: 20px;
      padding: 10px;
    }
</style>

<div class="container">
    <div class="row">
      <div class="col-md-6 offset-md-3">
        <h2 class="text-center text-dark mt-5">Register Form</h2>
        <div class="text-center mb-5 text-dark">BEM-VINDO A EMPRELIS</div>
        <div class="card my-5">
          <form class="card-body cardbody-color p-lg-5" method="POST">
            <!-- Exibição de erros -->
            <?php
            if(isset($error)){
              foreach($error as $err){
                echo '<span class="erro-msg">'.$err.'</span>';
              }
            }
            ?>
            <div class="text-center">
              <img src="assets/img/logo-lo.png" class="img-fluid profile-image-pic img-thumbnail rounded-circle my-3"
                width="200px" alt="profile">
            </div>
            <div class="mb-3">
              <input type="text" name="name" class="form-control" placeholder="enter your name">
            </div>
            <div class="mb-3">
              <input type="email" name="email" class="form-control" placeholder="enter your email">
            </div>
            <div class="mb-3">
              <input type="password" name="password" class="form-control" placeholder="enter your password">
            </div>
            <div class="mb-3">
              <input type="password" name="cpassword" class="form-control" placeholder="confirm your password">
            </div>
            <div class="text-center">
              <button type="submit" name="submit" class="btn btn-color px-5 mb-5 w-100">Register</button>
            </div>
            <div id="index.php" class="form-text text-center mb-5 text-dark">Já tens conta? <a href="login.php" class="text-dark fw-bold">Login</a></div>
          </form>
        </div>
      </div>
    </div>
</div>
 <!-- Footer -->
 <footer id="footer" class="footer dark-background">
      <div class="footer-top">
        <div class="container">
          <div class="row gy-4">
            <div class="col-lg-4 col-md-6 footer-about">
              <a href="index.html" class="logo d-flex align-items-center">
                <span class="sitename">Emprelis</span>
              </a>
              <div class="footer-contact pt-3">
                <p>Av. Dr. Aurélio</p>
                <p>Ribeiro 3, Tomar</p>
                <p class="mt-3"><strong>Telefone:</strong> <span>249 328 100</span></p>
                <p><strong>Email:</strong> <span>emprelis.pi2@gmail.com</span></p>
              </div>
              <div class="social-links d-flex mt-4">
                <a href="https://x.com/emprelis"><i class="bi bi-twitter-x"></i></a>
                <a href="https://www.facebook.com/share/NVxtPKYd6nAXGkWh/?mibextid=LQQJ4d"><i class="bi bi-facebook"></i></a>
                <a href="https://www.instagram.com/emprelis/profilecard/?igsh=MTFlbGIzcWJnd21tZw=="><i class="bi bi-instagram"></i></a>
                <a href="https://www.linkedin.com/in/emprelis-pi2-a522b6332/"><i class="bi bi-linkedin"></i></a>
              </div>
            </div>

            <div class="col-lg-2 col-md-3 footer-links">
              <h4>Links úteis</h4>
              <ul>
                <li><i class="bi bi-chevron-right"></i> <a href="#services"> Serviços</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#empresas"> Empresa</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#contact"> Apoio Cliente</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="termsU.html"> Terms of service</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="pprivacy.html"> Privacy policy</a></li>
              </ul>
            </div>

            <div class="col-lg-2 col-md-3 footer-links">
              <h4>Nossos Serviços</h4>
              <ul>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Informações sobre empresas</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Relatórios financeiros</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Indicadores financeiros</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Histórico da empresa</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Rating e solvabilidade</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Monitorização de empresas</a></li>
              </ul>
            </div>
            <div class="col-lg-4 col-md-12 footer-newsletter">
              <h4>Our Newsletter</h4>
              <p>Subscribe to our newsletter and receive the latest news about our products and services!</p>
              <form action="forms/newsletter.php" method="post" class="php-email-form">
                <div class="newsletter-form"><input type="email" name="email"><input type="submit" value="Subscribe"></div>
                <div class="loading">Loading</div>
                <div class="error-message"></div>
                <div class="sent-message">Your subscription request has been sent. Thank you!</div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div class="copyright">
        <div class="container text-center">
          <p>© <span>Copyright</span> <strong class="px-1 sitename">Emprelis</strong> <span>All Rights Reserved</span></p>
          <div class="credits">Designed by <a href="">projeto integrado 2</a></div>
        </div>
      </div>
    </footer>
</body>
</html>
