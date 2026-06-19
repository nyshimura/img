<?php
// Desativar a exibição de erros em produção para segurança
// error_reporting(0);
// ini_set('display_errors', 0);

// --- INFORMAÇÕES DO BANCO DE DADOS (fornecidas por você) ---
$servername = "localhost";
$username   = "USSERNAME";
$password   = "SENHA";
$dbname     = "NOMEDOBD";

// --- CABEÇALHOS DA API ---
// Permite que seu aplicativo acesse este script (CORS)
header("Access-Control-Allow-Origin: *"); // Para produção, restrinja ao seu domínio
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Responde à requisição prévia OPTIONS do navegador
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- CONEXÃO COM O BANCO DE DADOS ---
try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        throw new Exception("Falha na conexão: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Erro interno do servidor: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// --- LÓGICA DA API ---

if ($method == 'GET') {
    // Busca as configurações salvas no banco de dados
    $stmt = $conn->prepare("SELECT logo, watermark, blackShield, whiteShield FROM branding_settings WHERE setting_key = 'default'");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        http_response_code(200);
        echo json_encode($settings);
    } else {
        // Se nenhuma configuração for encontrada (improvável após o Passo 1)
        http_response_code(404);
        echo json_encode(['message' => 'Nenhuma configuração encontrada.']);
    }
    $stmt->close();

} elseif ($method == 'POST') {
    // Recebe os dados JSON do aplicativo
    $data = json_decode(file_get_contents('php://input'));

    // Valida se todos os dados esperados foram recebidos
    if (isset($data->logo) && isset($data->watermark) && isset($data->blackShield) && isset($data->whiteShield)) {
        
        // Prepara o comando SQL para ATUALIZAR as configurações existentes
        $stmt = $conn->prepare("UPDATE branding_settings SET logo = ?, watermark = ?, blackShield = ?, whiteShield = ? WHERE setting_key = 'default'");
        
        // 'ssss' significa que estamos enviando 4 strings (os dados base64)
        $stmt->bind_param("ssss", $data->logo, $data->watermark, $data->blackShield, $data->whiteShield);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(['message' => 'Configurações salvas com sucesso no banco de dados.']);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'Erro ao salvar no banco de dados: ' . $stmt->error]);
        }
        $stmt->close();

    } else {
        http_response_code(400);
        echo json_encode(['message' => 'Erro: Dados inválidos ou incompletos.']);
    }

} else {
    http_response_code(405);
    echo json_encode(['message' => 'Método não permitido.']);
}

// Fecha a conexão com o banco de dados
$conn->close();

?>