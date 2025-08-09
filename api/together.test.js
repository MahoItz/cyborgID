import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './together.js';

const originalFetch = global.fetch;

function createRes() {
  return {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
}

test('returns 500 when API key missing', async () => {
  delete process.env.TOGETHER_API_KEY;
  global.fetch = () => {
    throw new Error('fetch should not be called');
  };

  const req = {
    body: {
      systemPrompt: 'sys',
      userPrompt: 'hi',
      temperature: 0.5,
      provider: 'META_LLAMA',
      mode: 'autofill',
    },
    headers: {},
  };
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.jsonData, { error: 'Missing Together API key' });

  global.fetch = originalFetch;
});

test('uses Referer header for QWEN2 provider', async () => {
  let receivedHeaders;
  global.fetch = async (url, options) => {
    receivedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({ message: 'ok' }),
    };
  };

  const req = {
    body: {
      systemPrompt: 'sys',
      userPrompt: 'hi',
      temperature: 0.5,
      provider: 'QWEN2',
      mode: 'autofill',
      apiKey: 'test',
    },
    headers: { origin: 'https://example.com' },
  };
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(receivedHeaders.Referer, 'https://example.com');
  assert.ok(!('HTTP-Referer' in receivedHeaders));

  global.fetch = originalFetch;
});
