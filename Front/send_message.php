<?php
include 'db_connection.php';
header('Content-Type: application/json');

$response = [
    'status' => 'error',
    'message' => 'Form submission failed and no error message returned.'
];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $message = $_POST['message'] ?? '';

    if (empty($name) || empty($email) || empty($message)) {
        $response['message'] = "All fields are required.";
    } else {
        // Verificar se o usuário existe
        $sql_user = "SELECT id FROM users WHERE email = ?";
        if ($stmt_user = $conn->prepare($sql_user)) {
            $stmt_user->bind_param("s", $email);
            $stmt_user->execute();
            $stmt_user->bind_result($user_id);
            $stmt_user->fetch();
            $stmt_user->close();

            if (empty($user_id)) {
                // Se o usuário não existir, insira-o
                $sql_insert_user = "INSERT INTO users (name, email, password, user_type) VALUES (?, ?, '', 'user')";
                if ($stmt_insert_user = $conn->prepare($sql_insert_user)) {
                    $stmt_insert_user->bind_param("ss", $name, $email);
                    if ($stmt_insert_user->execute()) {
                        $user_id = $stmt_insert_user->insert_id; // Obter o ID do novo usuário
                    } else {
                        $response['message'] = "Error inserting user: " . $stmt_insert_user->error;
                    }
                    $stmt_insert_user->close();
                }
            }

            // Inserir a mensagem
            if (!empty($user_id)) {
                $sql_message = "INSERT INTO messages (user_id, message) VALUES (?, ?)";
                if ($stmt_message = $conn->prepare($sql_message)) {
                    $stmt_message->bind_param("is", $user_id, $message);
                    if ($stmt_message->execute()) {
                        $response['status'] = 'success';
                        $response['message'] = "Message sent successfully.";
                    } else {
                        $response['message'] = "Error inserting message: " . $stmt_message->error;
                    }
                    $stmt_message->close();
                }
            } else {
                $response['message'] = "Unable to associate user with message.";
            }
        } else {
            $response['message'] = "SQL error: " . $conn->error;
        }
    }
    $conn->close();
} else {
    $response['message'] = "Invalid request method.";
}

// Apenas um echo json_encode ao final após todos os processamentos.
echo json_encode($response);
?>

<script>
document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent the form from submitting via the browser.

    var form = this;
    var data = new FormData(form);

    fetch('send_message.php', {
        method: 'POST',
        body: data
    })
    .then(response => response.json())  // Ensure the response is treated as JSON
    .then(data => {
        if (data.status === 'success') {
            alert(data.message);  // Show success message
            form.reset(); // Clear the form
        } else {
            alert("Error: " + data.message);  // Show error message
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert("Error handling response.");
    });
});
</script>



<script>
ddocument.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent the form from submitting via the browser.

    var form = this;
    var data = new FormData(form);

    fetch('send_message.php', {
        method: 'POST',
        body: data
    })
    .then(response => response.json())  // Ensure the response is treated as JSON
    .then(data => {
        if (data.status === 'success') {
            alert(data.message);  // Show success message
            // Optionally clear the form or redirect the user
        } else {
            alert("Error: " + data.message);  // Show error message
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert("Error handling response.");
    });
});

</script>
