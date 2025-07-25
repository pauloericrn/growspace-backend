/**
 * Teste Local da API de Email
 * Execute: node test-local.js
 */

const API_URL = 'http://localhost:3000';

// Função para testar endpoint
async function testEndpoint(name, endpoint, data = null) {
  console.log(`\n🧪 Testando: ${name}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  
  try {
    const url = `${API_URL}${endpoint}`;
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
      console.log('📤 Dados enviados:', JSON.stringify(data, null, 2));
    }

    const response = await fetch(url, options);
    const result = await response.json();

    console.log(`📊 Status: ${response.status}`);
    console.log('📥 Resposta:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ SUCESSO!');
    } else {
      console.log('❌ FALHOU!');
    }

    return result;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return null;
  }
}

// Testes
async function runTests() {
  console.log('🚀 Iniciando testes locais da API de Email...\n');

  // 1. Health Check
  await testEndpoint('Health Check', '/health');

  // 2. Teste simples de email
  await testEndpoint('Email Simples', '/email/send', {
    to: ['pauloericrn@gmail.com'], // ⚠️ SUBSTITUA PELO SEU EMAIL
    subject: 'Teste Local - GrowSpace',
    html: '<h1>Teste Local</h1><p>Se você recebeu este email, a API está funcionando!</p>'
  });

  // 3. Email de boas-vindas
  await testEndpoint('Email Boas-vindas', '/email/welcome', {
    email: 'pauloericrn@gmail.com', // ⚠️ SUBSTITUA PELO SEU EMAIL
    name: 'João Silva'
  });

  console.log('\n🎉 Testes concluídos!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Verifique se recebeu os emails');
  console.log('2. Se não recebeu, verifique:');
  console.log('   - Se o servidor está rodando (npm run dev)');
  console.log('   - Se as variáveis de ambiente estão corretas');
  console.log('   - Se a chave do Resend está válida');
  console.log('   - Se o email de destino está correto');
}

// Executar testes
runTests().catch(console.error); 