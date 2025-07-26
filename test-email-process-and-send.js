const BASE_URL = 'http://localhost:3002';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data: data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null,
    };
  }
}

async function testProcessAndSend() {
  console.log('🚀 Testando nova rota: GET /email/process-and-send\n');

  console.log('📋 Executando processamento e envio automático...');
  
  const startTime = Date.now();
  const result = await makeRequest(`${BASE_URL}/email/process-and-send`, {
    method: 'GET'
  });
  const endTime = Date.now();

  if (!result.ok) {
    console.error('❌ Erro na requisição:', result.error || result.data);
    return;
  }

  const { data } = result.data;
  
  console.log('\n📊 RESULTADO DO PROCESSAMENTO:');
  console.log('=============================');
  console.log(`⏱️  Tempo total: ${endTime - startTime}ms`);
  console.log(`📧 Processadas: ${data.processed}`);
  console.log(`✅ Enviadas: ${data.sent}`);
  console.log(`❌ Falhas: ${data.failed}`);
  console.log(`📈 Taxa de sucesso: ${data.successRate.toFixed(1)}%`);
  console.log(`⏱️  Tempo de processamento: ${data.processingTime}ms`);

  if (data.details && data.details.length > 0) {
    console.log('\n📋 DETALHES:');
    console.log('===========');
    data.details.forEach((detail, index) => {
      const status = detail.status === 'sent' ? '✅' : '❌';
      console.log(`${status} Notificação ${index + 1}: ${detail.status.toUpperCase()}`);
      if (detail.emailId) {
        console.log(`   📧 Email ID: ${detail.emailId}`);
      }
      if (detail.error) {
        console.log(`   💥 Erro: ${detail.error}`);
      }
    });
  }

  console.log('\n🎉 Teste concluído!');
  
  if (data.sent > 0) {
    console.log('📬 Verifique sua caixa de entrada para os emails enviados.');
  }
}

// Executar teste
testProcessAndSend().catch(console.error); 