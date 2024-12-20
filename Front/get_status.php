<?php
$connection = new mysqli('localhost', 'root', '', 'db_emprelis');
if ($connection->connect_error) {
    die("Erro na conexão com o banco de dados.");
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    $id = intval($_GET['id']);
    $query = "SELECT status FROM function_status WHERE ID = ?";
    $stmt = $connection->prepare($query);
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode($result->fetch_assoc());
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Função não encontrada.']);
    }
    $stmt->close();
}
$connection->close();
?>
