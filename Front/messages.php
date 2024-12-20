<?php
include('verificar_login.php');
include 'db_connection.php';

// Função para buscar todas as mensagens
function fetchAllMessages() {
    global $conn;
    $sql = "SELECT messages.id AS message_id, 
                   users.name AS user_name, 
                   messages.message AS message_content, 
                   messages.sent_at AS sent_date, 
                   messages.is_read AS read_status
            FROM messages
            JOIN users ON messages.user_id = users.id
            ORDER BY messages.sent_at DESC";
    $result = $conn->query($sql);

    if (!$result) {
        die("Erro na consulta SQL: " . $conn->error);
    }

    return $result->fetch_all(MYSQLI_ASSOC);
}

// Buscar todas as mensagens
$messages = fetchAllMessages();
?>

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mensagens</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f4f4f4;
    }
    h1 {
      text-align: center;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #007bff;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .container {
      background: #fff;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
  </style>
    <div class="container">
        <h1>Mensagens</h1>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Utilizador</th>
                    <th>Mensagem</th>
                    <th>Data</th>
                    <th>Lida</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($messages)): ?>
                    <tr>
                        <td colspan="5">Nenhuma mensagem encontrada.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($messages as $message): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($message['message_id']); ?></td>
                            <td><?php echo htmlspecialchars($message['user_name']); ?></td>
                            <td><?php echo htmlspecialchars($message['message_content']); ?></td>
                            <td><?php echo htmlspecialchars($message['sent_date']); ?></td>
                            <td><?php echo $message['read_status'] ? 'Sim' : 'Não'; ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</body>
</html>
