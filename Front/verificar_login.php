<?php
session_start();

// Verificar se o usuário está logado, seja como admin ou user
if (!isset($_SESSION['user_name']) && !isset($_SESSION['admin_name'])) {
    header('Location: login.php');
    exit();
}
?>
