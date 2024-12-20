<?php
// Conexão com a base de dados
$servername = "localhost";
$username = "root"; // Altere conforme necessário
$password = ""; // Altere conforme necessário
$dbname = "db_emprelis";

$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar a conexão
if ($conn->connect_error) {
    die("Falha na conexão: " . $conn->connect_error);
}

// Verificar se o utilizador administrador já existe
$email = "admin@gmail.com";
$check_admin = "SELECT * FROM users WHERE email = '$email' LIMIT 1";
$result = $conn->query($check_admin);

if ($result->num_rows === 0) {
    // Inserir o utilizador administrador se ele não existir
    $name = "Admin";
    $password = password_hash("admin123", PASSWORD_BCRYPT); // Senha hashada
    $user_type = "admin";

    $insert_admin = "INSERT INTO users (name, email, password, user_type)
                     VALUES ('$name', '$email', '$password', '$user_type')";

    if ($conn->query($insert_admin) === TRUE) {
        echo "Administrador criado com sucesso.";
    } else {
        echo "Erro ao criar administrador: " . $conn->error;
    }
}

//FUNCAO