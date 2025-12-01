// Test script per verificare chiavi Alpaca
const https = require('https');

const ALPACA_KEY = 'PKXWI4DU5YPOUUDL45BSVDQFYR';
const ALPACA_SECRET = 'BT3qjpfSEXKVJbS6tHwxpFPtoxBkBfrCKvhPZi6GpVDD';

const options = {
  hostname: 'data.alpaca.markets',
  path: '/v2/stocks/snapshots?symbols=AAPL,BTCUSD,ETHUSD&feed=iex',
  method: 'GET',
  headers: {
    'APCA-API-KEY-ID': ALPACA_KEY,
    'APCA-API-SECRET-KEY': ALPACA_SECRET,
    'accept': 'application/json'
  }
};

console.log('Testing Alpaca API keys...');
console.log('Key:', ALPACA_KEY.substring(0, 10) + '...');
console.log('');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('');

  if (res.statusCode === 200) {
    console.log('✅ SUCCESS! Keys are valid and working!');
  } else if (res.statusCode === 401) {
    console.log('❌ FAILED: 401 Unauthorized - Keys are invalid or expired');
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
      console.log(JSON.stringify(json, null, 2).substring(0, 500));
      
      if (json.AAPL) {
        const aaplPrice = json.AAPL.latestTrade?.p || json.AAPL.dailyBar?.c;
        console.log('');
        console.log('Sample price - AAPL:', aaplPrice ? `$${aaplPrice}` : 'N/A');
      }
    } catch (e) {
      console.log('Response (not JSON):');
      console.log(data.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.end();
