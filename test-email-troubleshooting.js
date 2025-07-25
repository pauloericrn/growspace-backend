#!/usr/bin/env node

/**
 * Script de troubleshooting para o sistema de email do GrowSpace
 * Testa todos os endpoints e fornece diagnóstico detalhado
 */

const BASE_URL = 'https://growspace-backend-production.up.railway.app';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries()),
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

async function runTests() {
  console.log('🔍 Iniciando troubleshooting do sistema de email...\n');

  // Teste 1: Health Check
  console.log('1️⃣ Testando Health Check...');
  const healthResult = await makeRequest(`${BASE_URL}/health`);
  console.log(`   Status: ${healthResult.status}`);
  console.log(`   Sucesso: ${healthResult.ok}`);
  if (healthResult.data) {
    console.log(`   Resposta: ${JSON.stringify(healthResult.data, null, 2)}`);
  }
  console.log('');

  // Teste 2: Diagnóstico de Email
  console.log('2️⃣ Testando Diagnóstico de Email...');
  const diagnosticsResult = await makeRequest(`${BASE_URL}/email/diagnostics`);
  console.log(`   Status: ${diagnosticsResult.status}`);
  console.log(`   Sucesso: ${diagnosticsResult.ok}`);
  if (diagnosticsResult.data) {
    console.log(`   Configuração:`, {
      nodeEnv: diagnosticsResult.data.data?.environment?.nodeEnv,
      hasResendApiKey: diagnosticsResult.data.data?.environment?.hasResendApiKey,
      apiKeyLength: diagnosticsResult.data.data?.environment?.apiKeyLength,
      fromEmail: diagnosticsResult.data.data?.environment?.fromEmail,
      serviceType: diagnosticsResult.data.data?.service?.type,
      isMock: diagnosticsResult.data.data?.service?.isMock,
    });
    console.log(`   Recomendações:`, diagnosticsResult.data.data?.recommendations);
  }
  console.log('');

  // Teste 3: Envio de Email
  console.log('3️⃣ Testando Envio de Email...');
  const emailResult = await makeRequest(`${BASE_URL}/email/send`, {
    method: 'POST',
    body: JSON.stringify({
      to: ['teste@growspace.com'],
      subject: 'Teste de Troubleshooting',
      html: '<h1>Teste</h1><p>Este é um teste de troubleshooting.</p>',
      text: 'Teste de troubleshooting.',
    }),
  });
  console.log(`   Status: ${emailResult.status}`);
  console.log(`   Sucesso: ${emailResult.ok}`);
  if (emailResult.data) {
    console.log(`   Resposta:`, {
      success: emailResult.data.success,
      message: emailResult.data.message,
      service: emailResult.data.service,
      emailId: emailResult.data.data?.id,
    });
  }
  console.log('');

  // Teste 4: Email de Boas-vindas
  console.log('4️⃣ Testando Email de Boas-vindas...');
  const welcomeResult = await makeRequest(`${BASE_URL}/email/welcome`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'teste@growspace.com',
      name: 'Usuário Teste',
    }),
  });
  console.log(`   Status: ${welcomeResult.status}`);
  console.log(`   Sucesso: ${welcomeResult.ok}`);
  if (welcomeResult.data) {
    console.log(`   Resposta:`, {
      success: welcomeResult.data.success,
      message: welcomeResult.data.message,
      emailId: welcomeResult.data.data?.id,
    });
  }
  console.log('');

  // Resumo
  console.log('📊 RESUMO DO TROUBLESHOOTING:');
  console.log('================================');
  console.log(`✅ Health Check: ${healthResult.ok ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Diagnóstico: ${diagnosticsResult.ok ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Envio de Email: ${emailResult.ok ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Email de Boas-vindas: ${welcomeResult.ok ? 'OK' : 'FALHOU'}`);

  if (diagnosticsResult.data?.data?.service?.isMock) {
    console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
    console.log('   O sistema está usando MockEmailService (não envia emails reais)');
    console.log('   Para resolver:');
    console.log('   1. Configure RESEND_API_KEY no Railway');
    console.log('   2. Verifique se a chave está correta');
    console.log('   3. Reinicie o serviço após configurar');
  }

  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('   1. Verifique os logs do Railway para mais detalhes');
  console.log('   2. Configure RESEND_API_KEY se necessário');
  console.log('   3. Teste novamente após as configurações');
}

// Executar testes
runTests().catch(console.error); 