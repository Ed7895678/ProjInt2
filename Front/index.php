
<?php
session_start();  // Inicia a sessão
include 'db_connection.php'; // Conectar ao banco de dados
?>
<!DOCTYPE html>
<html lang="pt-pt">

<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <title>Emprelis</title>
  <meta name="description" content="">
  <meta name="keywords" content="">

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
  <!-- Main CSS File -->
  <link href="assets/css/main.css" rel="stylesheet">
</head>

<body class="index-page">

  <header id="header" class="header d-flex align-items-center fixed-top">
    <div class="container-fluid container-xl position-relative d-flex align-items-center justify-content-between">

      <a href="index.php" class="logo d-flex align-items-center me-auto me-lg-0">
        <img src="assets/img/logo_b_PI2.png" alt="" class="img-fluid mb-3">
        <h1 class="sitename">Emprelis</h1>
        <span>.</span>
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

      <a class="btn-getstarted" href="login.php">Login</a>
    </div>
  </header>

  <main class="main">
  
    <!--COOKIE-->

    <div id="cookie-notification" class="CookieMessage" style="display: none;">
      <div class="CookieMessage-content"> 
        <p>Este site utiliza cookies de navegação para a melhor experiência do Utilizado. <a href="pprivacy.html">Saiba mais</a></p>
        <p><a id="cookie-notification-close" class="CookieMessage-button" href="#">Aceitar</a></p>          
      </div>
    </div>
  
    <!-- Hero Section -->
    <section id="hero" class="hero section dark-background">
      <img src="assets/img/hero-bg.jpg" alt="" data-aos="fade-in"><!--Background-->
      <div class="container">
        <div class="row justify-content-center text-center" data-aos="fade-up" data-aos-delay="100">
          <div class="col-xl-6 col-lg-8">
            <h2>Bem-Vindos á Emprelis<span>.</span></h2>
            <p>Fácil acesso a informações estruturais, ações em tribunal e Insolvência, volume de negócio, resultados, gestão e análise concorrencial.</p>
          </div>
        </div>
        <br>
        <div class="search-wrapper">
    <div class="search-container">
        <form id="search-form" method="GET" action="pesquisa.php" onsubmit="return verificarLogin();">
            <input type="text" name="query" placeholder="Pesquisa por Empresas ou Marcas por Nome ou NIF" required>
        </form>
    </div>
    <button class="search-btn" type="submit" form="search-form">Pesquisar</button>
</div>

<script>
    function verificarLogin() {
        <?php if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true): ?>
            alert('Para obter o resultado das pesquisas, efetue o login!');
            window.location.href = 'login.php';
            return false; // Impede o envio do formulário
        <?php endif; ?>
        return true; // Permite o envio do formulário se o usuário estiver logado
    }
</script>

      </div>
    </section><!-- /Hero Section -->

    <!-- About Section -->
    <section id="about" class="about section">
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row gy-4">
          <div class="col-lg-6 order-1 order-lg-2">
            <img src="assets/img/about.jpg" class="img-fluid" alt="">
          </div>
          <div class="col-lg-6 order-2 order-lg-1 content">
            <h3>Qual é a evolução dos seus concorrentes e do mercado? Decisão com base em dados e factos</h3>
            <p class="fst-italic">
              A Emprelis permite aceder a informação fidedigna e atualizada que permite tomar conhecimento do que se passa à sua volta. Verifique com quem se relaciona e obtenha uma percepção da sua atividade através de diversos indicadores.
            </p>
            <ul>
              <li><i class="bi bi-check2-all"></i> <span>Pesquisa por zona.</span></li>
              <li><i class="bi bi-check2-all"></i> <span>Pesquisa por CAES</span></li>
              <li><i class="bi bi-check2-all"></i> <span>Pesquisa por destinção empresarial.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section><!-- /About Section -->
      <!-- Latest Companies Section -->
  <section class="latest-companies py-5">
    <div class="container">
      <div class="container section-title" data-aos="fade-up">
        <h2>Empresas</h2>
        <p>Últimas Empresas</p>
      </div>
      <div class="row">
        <?php
        // Consulta para obter as 9 últimas empresas adicionadas
        $sql = "SELECT companies.ID, companies.Name, addresses.County, addresses.Address 
        FROM companies 
        LEFT JOIN addresses ON companies.ID = addresses.IDBrand 
        ORDER BY companies.Created_at DESC LIMIT 9";
$result = $conn->query($sql);

// Verifique se há empresas no resultado
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo '<div class="col-lg-4 col-md-6 mb-4 text-decoration-none">';
        echo '<div class="card border-0 shadow-sm h-100">';
        echo '<div class="card-body d-flex align-items-center justify-content-between">';
        
        // Exibe as informações da empresa
        echo '<div class="company-info">';
        echo '<h5 class="card-title">' . htmlspecialchars($row['Name']) . '</h5>';
        echo '<p class="card-text text-muted mb-1">' . (isset($row['County']) ? htmlspecialchars($row['County']) : 'Localização não disponível') . '</p>';
        echo '<p class="text-muted small">' . (isset($row['Address']) ? htmlspecialchars($row['Address']) : 'Morada não disponível') . '</p>';
        echo '</div>';
        

        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
} else {
    echo '<p class="text-center">Nenhuma empresa encontrada.</p>';
}

        $conn->close();
        ?>
      </div>
    </div>
  </section>

    <!-- Contact Section -->
    <section id="contact" class="contact section">

      <!-- Section Title -->
      <div class="container section-title" data-aos="fade-up">
        <h2>Emprelis Customer Support</h2>
        <p>Contact us</p>
      </div><!-- End Section Title -->

      <div class="container" data-aos="fade-up" data-aos-delay="100">

        <div class="mb-4" data-aos="fade-up" data-aos-delay="200">
          <iframe style="border:0; width: 100%; height: 270px;" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d49189.74350071397!2d-8.376046748388342!3d39.59659537589849!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd187956a5d8cdb5%3A0x70374064acbb5e52!2sInstituto%20Polit%C3%A9cnico%20de%20Tomar!5e0!3m2!1spt-PT!2spt!4v1726842620276!5m2!1spt-PT!2spt"></iframe>
        </div><!-- End Google Maps -->

        <div class="row gy-4">

          <div class="col-lg-4">
            <div class="info-item d-flex" data-aos="fade-up" data-aos-delay="300">
              <i class="bi bi-geo-alt flex-shrink-0"></i>
              <div>
                <h3>Address</h3>
                <p>Av. Dr. Aurélio Ribeiro 3, Tomar</p>
              </div>
            </div><!-- End Info Item -->

            <div class="info-item d-flex" data-aos="fade-up" data-aos-delay="400">
              <i class="bi bi-telephone flex-shrink-0"></i>
              <div>
                <h3>Call us</h3>
                <p>249 328 100</p>
              </div>
            </div><!-- End Info Item -->

            <div class="info-item d-flex" data-aos="fade-up" data-aos-delay="500">
              <i class="bi bi-envelope flex-shrink-0"></i>
              <div>
                <h3>Send us an email</h3>
                <p>Send us an email</p>
              </div>
            </div><!-- End Info Item -->

          </div>

          <div class="col-lg-8">
            <form action="contact.php" method="post" class="php-email-form" data-aos="fade-up" data-aos-delay="200" onsubmit="return verificarLogin();">
              <div class="row gy-4">

                <div class="col-md-6">
                  <input type="text" name="name" class="form-control" placeholder="Name" required="">
                </div>

                <div class="col-md-6 ">
                  <input type="email" class="form-control" name="email" placeholder="Email" required="">
                </div>

                <div class="col-md-12">
                  <input type="text" class="form-control" name="subject" placeholder="Subject" required="">
                </div>

                <div class="col-md-12">
                  <textarea class="form-control" name="message" rows="6" placeholder="Message" required=""></textarea>
                </div>

                <div class="col-md-12 text-center">
                  <div class="loading">Loading...</div>
                  <div class="error-message"></div>
                  <div class="sent-message">Your message has been sent. Thanks!</div>

                  <button type="submit">Send message</button>
                </div>

              </div>
            </form>
          </div><!-- End Contact Form -->

        </div>

      </div>

    </section><!-- /Contact Section -->
    <script>
    function verificarLogin() {
        <?php if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true): ?>
            alert('Para enviar uma mensagem, efetue o login!');
            window.location.href = 'login.php';
            return false; // Impede o envio do formulário
        <?php endif; ?>
        return true; // Permite o envio do formulário se o usuário estiver logado
    }
</script>

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
                <li><i class="bi bi-chevron-right"></i> <a href="#contact"> Apoio Cliente</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="termsU.html"> Terms of service</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="pprivacy.html"> Privacy policy</a></li>
              </ul>
            </div>

            <div class="col-lg-2 col-md-3 footer-links">
              <h4>Nossos Serviços</h4>
              <ul>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Informações sobre empresas</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Indicadores financeiros</a></li>
                <li><i class="bi bi-chevron-right"></i> <a href="#"> Histórico da empresa</a></li>
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

    <!-- Scroll Top -->
    <a href="#" id="scroll-top" class="scroll-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a>

    <!-- Preloader -->
    <div id="preloader"></div>

    <!-- Vendor JS Files -->
    <script src="assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="assets/vendor/php-email-form/validate.js"></script>
    <script src="assets/vendor/aos/aos.js"></script>
    <script src="assets/vendor/swiper/swiper-bundle.min.js"></script>
    <script src="assets/vendor/glightbox/js/glightbox.min.js"></script>
    <script src="assets/vendor/imagesloaded/imagesloaded.pkgd.min.js"></script>
    <script src="assets/vendor/isotope-layout/isotope.pkgd.min.js"></script>
    <script src="assets/vendor/purecounter/purecounter_vanilla.js"></script>
    <!-- Main JS File -->
    <script src="assets/js/main.js"></script>
</body>

</html>
