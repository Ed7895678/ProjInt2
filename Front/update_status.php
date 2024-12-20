<?php
$connection = new mysqli('localhost', 'root', '', 'db_emprelis');
if ($connection->connect_error) {
    die("Erro na conexão com o banco de dados.");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['id']) && isset($data['status'])) {
        $id = intval($data['id']);
        $status = intval($data['status']);

        $query = "UPDATE function_status SET status = ? WHERE ID = ?";
        $stmt = $connection->prepare($query);
        $stmt->bind_param('ii', $status, $id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Erro ao atualizar o status.']);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Dados inválidos.']);
    }
}
$connection->close();
?>
