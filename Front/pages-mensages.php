<?php
session_start();
include 'db_connection.php';

// Função para buscar mensagens
function fetchMessages($conn) {
    $query = "
        SELECT 
            messages.id AS message_id, 
            users.name AS user_name, 
            messages.message AS message_content, 
            messages.sent_at AS sent_date, 
            messages.is_read AS read_status
        FROM messages
        JOIN users ON messages.user_id = users.id
        ORDER BY messages.sent_at DESC
    ";
    $result = $conn->query($query);
    if (!$result) {
        die("Erro ao buscar mensagens: " . $conn->error);
    }
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    return $messages;
}

// Função para excluir mensagem
if (isset($_GET['delete_id'])) {
    $delete_id = intval($_GET['delete_id']);
    $conn->query("DELETE FROM messages WHERE id = $delete_id");
    header('Location: messages.php');
    exit;
}

// Função para responder mensagem
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['message_id']) && isset($_POST['response'])) {
    $message_id = intval($_POST['message_id']);
    $response = $_POST['response'];
    $stmt = $conn->prepare("UPDATE messages SET response = ? WHERE id = ?");
    $stmt->bind_param("si", $response, $message_id);
    $stmt->execute();
    $stmt->close();
    header('Location: messages.php');
    exit;
}

// Obter mensagens
$messages = fetchMessages($conn);
?>

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mensagens dos Utilizadores</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
    <style>
        /* Estilos gerais */
body {
    font-family: Arial, sans-serif;
    background-color: #f9f9f9;
    color: #333;
    margin: 0;
    padding: 0;
}

.container {
    max-width: 1200px;
    margin: 50px auto;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Título */
h1 {
    text-align: center;
    color: #007bff;
    margin-bottom: 20px;
}

/* Tabela */
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

table thead {
    background-color: #007bff;
    color: white;
}

table th,
table td {
    padding: 12px 15px;
    text-align: left;
    border: 1px solid #ddd;
}

table tbody tr:nth-child(even) {
    background-color: #f2f2f2;
}

table tbody tr:hover {
    background-color: #f1f1f1;
}

button {
    padding: 8px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    font-size: 14px;
}

button.delete {
    background-color: #dc3545;
    color: white;
}

button.delete:hover {
    background-color: #b02a37;
}

button.reply {
    background-color: #007bff;
    color: white;
}

button.reply:hover {
    background-color: #0056b3;
}

/* Formulário de resposta */
textarea {
    width: 100%;
    height: 100px;
    margin-bottom: 10px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 14px;
    resize: none;
}

    </style>
    <div class="container">
        <h1>Mensagens dos Utilizadores</h1>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome do Utilizador</th>
                    <th>Mensagem</th>
                    <th>Data</th>
                    <th>Lida</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($messages)): ?>
                    <tr>
                        <td colspan="6">Nenhuma mensagem encontrada.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($messages as $message): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($message['message_id']); ?></td>
                            <td><?php echo htmlspecialchars($message['user_name']); ?></td>
                            <td><?php echo htmlspecialchars($message['message_content']); ?></td>
                            <td><?php echo htmlspecialchars($message['sent_date']); ?></td>
                            <td><?php echo $message['read_status'] ? 'Sim' : 'Não'; ?></td>
                            <td>
                                <!-- Botão de apagar -->
                                <a href="?delete_id=<?php echo $message['message_id']; ?>" onclick="return confirm('Tem certeza que deseja apagar esta mensagem?');">
                                    <button class="delete">Apagar</button>
                                </a>
                                <!-- Formulário de resposta -->
                                <form method="POST" style="margin-top: 10px;">
                                    <textarea name="response" placeholder="Escreva sua resposta..."></textarea>
                                    <input type="hidden" name="message_id" value="<?php echo $message['message_id']; ?>">
                                    <button type="submit" class="reply">Responder</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</body>
</html>
