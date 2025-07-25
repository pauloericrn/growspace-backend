/**
 * Teste da API de Email - GrowSpace Backend
 * 
 * Para usar este arquivo:
 * 1. Certifique-se de que o servidor está rodando (npm run dev)
 * 2. Configure as variáveis de ambiente no .env
 * 3. Execute: node test-email-api.js
 */

const API_BASE_URL = 'http://localhost:3002';

// Função para fazer requisições
async function makeRequest(endpoint, data = null) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`\n📧 ${endpoint}`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error(`❌ Erro em ${endpoint}:`, error.message);
  }
}

// Testes da API de Email
async function testEmailAPI() {
  console.log('🚀 Iniciando testes da API de Email...\n');

  // 1. Teste de health check
  await makeRequest('/health');

  // 2. Teste de envio de email genérico
  await makeRequest('/email/send', {
    to: ['pauloericrn@gmail.com'], // Substitua pelo seu email
    subject: 'Teste da API GrowSpace',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e;">🌱 Teste da API GrowSpace</h1>
        <p>Olá! Este é um email de teste da API de email do GrowSpace.</p>
        <p>Se você está recebendo este email, significa que a integração com o Resend está funcionando perfeitamente!</p>
        <ul>
          <li>✅ API configurada</li>
          <li>✅ Resend integrado</li>
          <li>✅ Emails sendo enviados</li>
        </ul>
        <p>Atenciosamente,<br>Equipe GrowSpace</p>
      </div>
    `,
    text: `
      Teste da API GrowSpace
      
      Olá! Este é um email de teste da API de email do GrowSpace.
      
      Se você está recebendo este email, significa que a integração com o Resend está funcionando perfeitamente!
      
      ✅ API configurada
      ✅ Resend integrado
      ✅ Emails sendo enviados
      
      Atenciosamente,
      Equipe GrowSpace
    `
  });

  // 3. Teste de email de boas-vindas
  await makeRequest('/email/welcome', {
    email: 'pauloericrn@gmail.com', // Substitua pelo seu email
    name: 'João Silva'
  });

  // 4. Teste de email de recuperação de senha
  await makeRequest('/email/password-reset', {
    email: 'pauloericrn@gmail.com', // Substitua pelo seu email
    resetToken: 'abc123def456ghi789'
  });

  console.log('\n✅ Testes concluídos!');
}

// Executar testes
testEmailAPI().catch(console.error); 