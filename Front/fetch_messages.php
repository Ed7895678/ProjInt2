<?php
include 'db_connection.php';

function fetchAllMessages() {
    global $conn;
    $messages = [];
    $sql = "SELECT id, name, email, message, response FROM messages ORDER BY id DESC";

    if ($stmt = $conn->prepare($sql)) {
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $messages[] = $row;
        }
        $stmt->close();
    }
    return $messages;
}

function countUnreadMessages() {
    global $conn;
    $count = 0;

    $sql = "SELECT COUNT(*) AS unread_count FROM messages WHERE is_read = 0";
    if ($result = $conn->query($sql)) {
        $row = $result->fetch_assoc();
        $count = $row['unread_count'];
    }
    return $count;
}
?>
