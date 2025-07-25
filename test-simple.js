/**
 * Teste simples para verificar o endpoint de email
 */

const API_BASE_URL = 'http://localhost:3002';

async function testSimple() {
  console.log('🧪 Teste simples do endpoint de email...\n');

  try {
    const response = await fetch(`${API_BASE_URL}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ['pauloericrn@gmail.com'],
        subject: 'Teste Simples',
        html: '<p>Teste</p>'
      })
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testSimple(); 