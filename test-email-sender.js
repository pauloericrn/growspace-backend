#!/usr/bin/env node

/**
 * Script para testar envio de emails processados
 * Testa o fluxo completo: buscar notificações -> processar -> enviar emails
 */

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
    
    // Debug: mostrar resposta completa
    if (url.includes('/process-notifications')) {
      console.log('🔍 DEBUG - Resposta completa da API:');
      console.log('   Status:', response.status);
      console.log('   Data keys:', Object.keys(data));
      console.log('   Data.data keys:', data.data ? Object.keys(data.data) : 'undefined');
      console.log('   Data.data.emailData length:', data.data?.emailData?.length || 0);
      if (data.data?.emailData?.length > 0) {
        console.log('   Data.data.emailData[0] keys:', Object.keys(data.data.emailData[0]));
        console.log('   Data.data.emailData[0] templateKey:', data.data.emailData[0].templateKey);
      }
      console.log('');
    }

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

async function testEmailSending() {
  console.log('🚀 Iniciando teste de envio de emails...\n');

  // 1. Buscar notificações processadas
  console.log('1️⃣ Buscando notificações pendentes...');
  const processResult = await makeRequest(`${BASE_URL}/email/process-notifications`);
  
  if (!processResult.ok) {
    console.error('❌ Erro ao buscar notificações:', processResult.error || processResult.data);
    return;
  }

  const { processed, emailData } = processResult.data.data;
  
  if (processed === 0) {
    console.log('ℹ️  Nenhuma notificação pendente encontrada');
    return;
  }

  console.log(`✅ Encontradas ${processed} notificações para processar\n`);
  
  // Debug: mostrar estrutura dos dados
  console.log('🔍 DEBUG - Estrutura dos dados recebidos:');
  console.log('   processed:', processed);
  console.log('   emailData length:', emailData.length);
  if (emailData.length > 0) {
    console.log('   emailData[0] keys:', Object.keys(emailData[0]));
    console.log('   emailData[0] templateKey:', emailData[0].templateKey);
    console.log('   emailData[0] template_key:', emailData[0].template_key);
    console.log('   emailData[0] type:', emailData[0].type);
    console.log('   emailData[0] notificationId:', emailData[0].notificationId);
    console.log('   emailData[0] completo:', JSON.stringify(emailData[0], null, 2));
    
    // Verificar todos os emails
    console.log('   🔍 Verificando todos os emails:');
    emailData.forEach((email, index) => {
      console.log(`     Email ${index + 1}:`);
      console.log(`       keys: ${Object.keys(email).join(', ')}`);
      console.log(`       templateKey: ${email.templateKey || 'undefined'}`);
      console.log(`       template_key: ${email.template_key || 'undefined'}`);
      console.log(`       type: ${email.type}`);
    });
  }
  console.log('');

  // 2. Enviar cada email
  console.log('2️⃣ Enviando emails...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < emailData.length; i++) {
    const email = emailData[i];
    
    console.log(`📧 Email ${i + 1}/${emailData.length}:`);
    console.log(`   Para: ${email.to[0]}`);
    console.log(`   Assunto: ${email.subject}`);
    console.log(`   Template: ${email.templateKey || 'N/A'}`);
    
    try {
      const response = await fetch('http://localhost:3002/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ Enviado com sucesso! ID: ${result.data?.id || 'N/A'}`);
        successCount++;
      } else {
        console.log(`   ❌ Erro: ${result.message || result.error || 'Erro desconhecido'}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`   ❌ Erro de rede: ${error.message}`);
      errorCount++;
    }
    
    console.log('   ---');
    
    // Delay para respeitar rate limit do Resend (2 requests/segundo)
    if (i < emailData.length - 1) {
      console.log(`   ⏳ Aguardando 600ms para respeitar rate limit...`);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  // 3. Resumo
  console.log('\n📊 RESUMO DO TESTE:');
  console.log('==================');
  console.log(`📧 Total de emails: ${emailData.length}`);
  console.log(`✅ Enviados com sucesso: ${successCount}`);
  console.log(`❌ Falhas: ${errorCount}`);
  console.log(`📈 Taxa de sucesso: ${((successCount / emailData.length) * 100).toFixed(1)}%`);

  if (successCount > 0) {
    console.log('\n🎉 Teste concluído! Verifique sua caixa de entrada.');
  } else {
    console.log('\n⚠️  Nenhum email foi enviado. Verifique os logs acima.');
  }
}

// Executar teste
testEmailSending().catch(console.error); 