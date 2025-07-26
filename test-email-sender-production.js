#!/usr/bin/env node

/**
 * Script para testar envio de emails em produção
 * Testa o fluxo completo no ambiente de produção
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

async function testEmailSendingProduction() {
  console.log('🚀 Iniciando teste de envio de emails em PRODUÇÃO...\n');

  // 1. Verificar se o serviço está online
  console.log('1️⃣ Verificando se o serviço está online...');
  const healthResult = await makeRequest(`${BASE_URL}/health`);
  
  if (!healthResult.ok) {
    console.error('❌ Serviço não está respondendo:', healthResult.error);
    return;
  }
  
  console.log('✅ Serviço online!\n');

  // 2. Buscar notificações processadas
  console.log('2️⃣ Buscando notificações pendentes...');
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

  // 3. Enviar cada email
  console.log('3️⃣ Enviando emails...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < emailData.length; i++) {
    const email = emailData[i];
    
    console.log(`📧 Email ${i + 1}/${emailData.length}:`);
    console.log(`   Para: ${email.to[0]}`);
    console.log(`   Assunto: ${email.subject}`);
    console.log(`   Template: ${email.templateKey || 'N/A'}`);
    
    try {
      const response = await fetch(`${BASE_URL}/email/send`, {
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

  // 4. Resumo
  console.log('\n📊 RESUMO DO TESTE EM PRODUÇÃO:');
  console.log('================================');
  console.log(`📧 Total de emails: ${emailData.length}`);
  console.log(`✅ Enviados com sucesso: ${successCount}`);
  console.log(`❌ Falhas: ${errorCount}`);
  console.log(`📈 Taxa de sucesso: ${((successCount / emailData.length) * 100).toFixed(1)}%`);

  if (successCount > 0) {
    console.log('\n🎉 Teste em produção concluído! Verifique sua caixa de entrada.');
  } else {
    console.log('\n⚠️  Nenhum email foi enviado. Verifique os logs acima.');
  }
}

// Executar teste
testEmailSendingProduction().catch(console.error); 