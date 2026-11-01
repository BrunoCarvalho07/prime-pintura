/**
 * Testes automatizados da Netlify Function do Flandão
 * Testa cenários:
 * 1. GET 405 (método não permitido)
 * 2. Sem mensagens 400
 * 3. JSON inválido 400
 * 4. Origem estranha 403
 * 5. Sem chave 500
 * 6. Sucesso 200 (com fetch simulado)
 * 7. Limite de 500 caracteres
 * 8. Chave no cabeçalho e não na URL
 * 9. Gemini 429 virando 503
 * 10. Limite por IP 429
 */

const assert = require('assert');
const path = require('path');

const functionPath = path.resolve(__dirname, '../netlify/functions/flandao.js');

async function runTests() {
  console.log('--- INICIANDO TESTES DO FLANDÃO (netlify/functions/flandao.js) ---');

  const { handler } = require(functionPath);

  // 1. GET retorna 405
  {
    const res = await handler({ httpMethod: 'GET', headers: {} });
    assert.strictEqual(res.statusCode, 405, 'GET deve retornar 405');
    console.log('✔ Teste 1: GET retorna 405');
  }

  // 2. Sem mensagens retorna 400
  {
    const res = await handler({
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagens: [] })
    });
    assert.strictEqual(res.statusCode, 400, 'Sem mensagens deve retornar 400');
    console.log('✔ Teste 2: Sem mensagens retorna 400');
  }

  // 3. JSON inválido retorna 400
  {
    const res = await handler({
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ json invalido...'
    });
    assert.strictEqual(res.statusCode, 400, 'JSON inválido deve retornar 400');
    console.log('✔ Teste 3: JSON inválido retorna 400');
  }

  // 4. Origem estranha retorna 403
  {
    const res = await handler({
      httpMethod: 'POST',
      headers: {
        'Origin': 'https://site-malicioso.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensagens: [{ papel: 'user', texto: 'Oi' }] })
    });
    assert.strictEqual(res.statusCode, 403, 'Origem estranha deve retornar 403');
    console.log('✔ Teste 4: Origem estranha retorna 403');
  }

  // 5. Sem chave no ambiente retorna 500
  {
    delete process.env.GEMINI_API_KEY;
    const res = await handler({
      httpMethod: 'POST',
      headers: {
        'Origin': 'https://pinturaprime.com.br',
        'x-forwarded-for': '189.1.2.3',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensagens: [{ papel: 'user', texto: 'Olá' }] })
    });
    assert.strictEqual(res.statusCode, 500, 'Sem GEMINI_API_KEY deve retornar 500');
    console.log('✔ Teste 5: Sem chave de API retorna 500');
  }

  // 6, 7, 8. Sucesso 200, chave no cabeçalho x-goog-api-key e texto cortado em 500 chars
  {
    process.env.GEMINI_API_KEY = 'TEST_KEY_SECRET_123';
    let interceptedUrl = null;
    let interceptedHeaders = null;
    let interceptedBody = null;

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      interceptedUrl = url;
      interceptedHeaders = options.headers;
      interceptedBody = JSON.parse(options.body);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Olá! Como posso ajudar na sua pintura?' }]
              }
            }
          ]
        })
      };
    };

    const textoLongo = 'A'.repeat(800);
    const res = await handler({
      httpMethod: 'POST',
      headers: {
        'Origin': 'https://pinturaprime.com.br',
        'x-forwarded-for': '189.10.20.30',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensagens: [{ papel: 'user', texto: textoLongo }] })
    });

    global.fetch = originalFetch;

    assert.strictEqual(res.statusCode, 200, 'Deve retornar 200 no sucesso');
    const resBody = JSON.parse(res.body);
    assert.strictEqual(resBody.resposta, 'Olá! Como posso ajudar na sua pintura?');
    
    // Verifica chave no cabeçalho e NÃO na URL
    assert.strictEqual(interceptedHeaders['x-goog-api-key'], 'TEST_KEY_SECRET_123');
    assert.ok(!interceptedUrl.includes('key='), 'Chave NÃO deve estar presente na URL');
    assert.ok(!interceptedUrl.includes('TEST_KEY_SECRET_123'), 'Chave secreta não deve vazar na query da URL');

    // Verifica que o texto foi cortado em 500 chars
    const enviadoGemini = interceptedBody.contents[0].parts[0].text;
    assert.strictEqual(enviadoGemini.length, 500, 'Texto deve ser limitado a 500 caracteres');

    console.log('✔ Teste 6: Sucesso 200 com resposta simulada');
    console.log('✔ Teste 7: Texto cortado em 500 caracteres');
    console.log('✔ Teste 8: Chave no cabeçalho x-goog-api-key e ausente da URL');
  }

  // 9. Gemini retornando 429 vira 503
  {
    process.env.GEMINI_API_KEY = 'TEST_KEY_SECRET_123';
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({})
    });

    const res = await handler({
      httpMethod: 'POST',
      headers: {
        'Origin': 'http://localhost:8888',
        'x-forwarded-for': '189.10.20.31',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mensagens: [{ papel: 'user', texto: 'Teste rate limit gemini' }] })
    });

    global.fetch = originalFetch;
    assert.strictEqual(res.statusCode, 503, '429 da API Gemini deve ser mapeado para 503');
    console.log('✔ Teste 9: 429 da API Gemini vira 503');
  }

  // 10. Limite por IP (20 msgs na hora) retorna 429
  {
    process.env.GEMINI_API_KEY = 'TEST_KEY_SECRET_123';
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Ok' }] } }]
      })
    });

    const testIp = '200.50.60.70';
    let lastStatus = 200;

    for (let i = 0; i < 22; i++) {
      const res = await handler({
        httpMethod: 'POST',
        headers: {
          'Origin': 'https://pinturaprime.com.br',
          'x-forwarded-for': testIp,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mensagens: [{ papel: 'user', texto: `Msg ${i}` }] })
      });
      lastStatus = res.statusCode;
    }

    global.fetch = originalFetch;
    assert.strictEqual(lastStatus, 429, 'Mais de 20 mensagens por IP na hora deve retornar 429');
    console.log('✔ Teste 10: Limite por IP retorna 429');
  }

  console.log('\n--- TODOS OS 10 TESTES PASSARAM COM SUCESSO! ---');
}

runTests().catch(err => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
