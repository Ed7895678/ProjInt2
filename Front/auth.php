<?php
session_start();

// Definir tempo de expiração da sessão (em segundos)
$session_timeout = 3600; // 1 hora

// Verificar se a sessão expirou
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $session_timeout) {
    session_unset();  // Limpa todas as variáveis de sessão
    session_destroy(); // Destrói a sessão
    header('Location: login.php'); // Redireciona para o login se a sessão expirou
    exit();
}

// Atualizar o tempo de atividade da sessão
$_SESSION['last_activity'] = time();

// Verificar se o usuário está logado
if (!isset($_SESSION['user_name'])) {
    header('Location: login.php'); // Redireciona para o login se não estiver logado
    exit();
}
?>
