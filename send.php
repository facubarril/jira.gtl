<?php
    require 'config.php';
    allowCORS();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['error' => 'Método no permitido']);
        exit;
    }

    // Recibir JSON
    $data = json_decode(file_get_contents('php://input'), true);

    $domain = $data['domain'] ?? null;
    $email = $data['email'] ?? null;
    $apiToken = $data['apiToken'] ?? null;
    $item = $data['item'] ?? null;
    $date = $data['date'] ?? null;

    if (!$domain || !$email || !$apiToken || !$item || !$date) {
        echo json_encode(['error' => 'Faltan datos obligatorios']);
        exit;
    }

    // Formatear fecha para Jira
    $jiraDate = $date."T12:00:00.000-0300";

    // Parsear tiempo trabajado
    $timeRegex = '/^(\d+)h(\d+)?m/';
    preg_match($timeRegex, $item['tiempo'], $timeMatch);

    if (!isset($timeMatch[1])) {
        echo json_encode(['error' => 'Formato de tiempo inválido', 'tiempo' => $item['tiempo']]);
        exit;
    }

    $hours = intval($timeMatch[1]);
    $minutes = intval($timeMatch[2] ?? 0);
    $timeSpentSeconds = ($hours * 3600) + ($minutes * 60);

    // Validar ID del issue
    $issueKey = $item['id'] ?? null;
    if (!$issueKey) {
        echo json_encode(['error' => 'ID de tarea inválido']);
        exit;
    }

    // Payload final para Jira
    $payload = [
        'started' => $jiraDate,
        'timeSpentSeconds' => $timeSpentSeconds,
        'comment' => [
            'type' => 'doc',
            'version' => 1,
            'content' => [[
                'type' => 'paragraph',
                'content' => [[
                    'type' => 'text',
                    'text' => $item['desc']
                ]]
            ]]
        ]
    ];

    // URL final de la API de Jira
    $jiraWorklogUrl = "$domain/rest/api/3/issue/$issueKey/worklog";

    // Iniciar cURL
    $ch = curl_init($jiraWorklogUrl);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode("$email:$apiToken")
        ],
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status >= 400) {
        echo json_encode([
            'error' => "Error HTTP $status",
            'response' => json_decode($response, true)
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'response' => json_decode($response, true)
    ]);
?>
