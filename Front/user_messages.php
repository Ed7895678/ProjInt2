<?php
include 'fetch_messages.php';
session_start();
$user_id = $_SESSION['user_id'];  // Supõe-se que o ID do usuário esteja armazenado na sessão

$messages = fetchUserMessages($user_id);
?>

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Mensagens dos Usuários</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; color: #333; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        textarea { width: 100%; height: 50px; padding: 12px 20px; box-sizing: border-box; border: 2px solid #ccc; border-radius: 4px; background-color: #f8f8f8; resize: none; }
    </style>
</head>
<body>
    <h1>Mensagens dos Usuários</h1>
    <table>
        <tr>
            <th>ID</th>
            <th>Mensagem</th>
            <th>Resposta</th>
        </tr>
        <?php foreach ($messages as $message): ?>
        <tr>
            <td><?= htmlspecialchars($message['id']) ?></td>
            <td><?= htmlspecialchars($message['message']) ?></td>
            <td><?= htmlspecialchars($message['response']) ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>
