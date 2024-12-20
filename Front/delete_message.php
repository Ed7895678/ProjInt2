<?php
include 'db_connection.php'; // Conexão com o banco de dados

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['message_id'])) {
    $message_id = intval($_POST['message_id']); // Garantir que o ID é um número inteiro

    $sql = "DELETE FROM messages WHERE id = ?";
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("i", $message_id);

        if ($stmt->execute()) {
            // Redireciona com sucesso
            header("Location: messages.php?status=success");
            exit();
        } else {
            // Redireciona com erro
            header("Location: messages.php?status=error");
            exit();
        }
    }
    $stmt->close();
}
$conn->close();
header("Location: messages.php?status=error");
exit();
?>
