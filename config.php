<?php
    // Función para permitir CORS desde tu frontend
    function allowCORS() {
        $allowed_origin = 'http://webcreatio.net';

        if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === $allowed_origin) {
            header("Access-Control-Allow-Origin: $allowed_origin");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
    }
?>
