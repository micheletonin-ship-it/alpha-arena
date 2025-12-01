// Test script per verificare endpoint crypto Alpaca
const https = require('https');

const ALPACA_KEY = 'PKXWI4DU5YPOUUDL45BSVDQFYR';
const ALPACA_SECRET = 'BT3qjpfSEXKVJbS6tHwxpFPtoxBkBfrCKvhPZi6GpVDD';

console.log('Testing Alpaca Crypto API...');
console.log('Key:', ALPACA_KEY.substring(0, 10) + '...');
console.log('');

// Test crypto endpoint
const cryptoOptions = {
  hostname: 'data.alpaca.markets',
  path: '/v1beta3/crypto/us/latest/bars?symbols=BTC/USD,ETH/USD,SOL/USD',
  method: 'GET',
  headers: {
    'APCA-API-KEY-ID': ALPACA_KEY,
    'APCA-API-SECRET-KEY': ALPACA_SECRET,
    'accept': 'application/json'
  }
};

const req = https.request(cryptoOptions, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('');

  if (res.statusCode === 200) {
    console.log('✅ SUCCESS! Crypto endpoint is working!');
  } else if (res.statusCode === 401 || res.statusCode === 403) {
    console.log('❌ FAILED: Unauthorized - Check if your account has crypto access');
  } else {
    console.log('⚠️  Unexpected status code');
  }

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response preview:');
      console.log(JSON.stringify(json, null, 2).substring(0, 800));
      
      if (json.bars) {
        console.log('');
        console.log('Crypto prices found:');
        for (const [symbol, bar] of Object.entries(json.bars)) {
          console.log(`  ${symbol}: $${bar.c}`);
        }
      }
    } catch (e) {
      console.log('Response (not JSON):');
      console.log(data.substring(0, 300));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();
