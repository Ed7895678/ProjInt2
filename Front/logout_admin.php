<?php
// Inicia a sessão
session_start();

// Limpar todos os dados da sessão
session_unset();
session_destroy();

// Apagar os cookies de sessão
setcookie(session_name(), '', time() - 3600, '/'); // Expira o cookie da sessão

// Redireciona para a página de login
header('Location: login.php');
exit();
?>
