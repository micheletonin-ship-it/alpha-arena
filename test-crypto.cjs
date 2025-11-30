// Test per verificare supporto crypto Alpaca
const https = require('https');

const ALPACA_KEY = 'AKHHZXTTH7Q72CYQAQBNN72QQH';
const ALPACA_SECRET = '7vqCxHfGd3H23xYdnXcLt4bTfKDeExqe4yiLJnziirUb';

// Test con diversi endpoint
const tests = [
  {
    name: 'Crypto con feed=iex',
    path: '/v2/stocks/snapshots?symbols=BTCUSD,ETHUSD&feed=iex'
  },
  {
    name: 'Crypto senza feed',
    path: '/v2/stocks/snapshots?symbols=BTCUSD,ETHUSD'
  },
  {
    name: 'Crypto con feed=us_stocks',
    path: '/v2/stocks/snapshots?symbols=BTCUSD,ETHUSD&feed=us_stocks'
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'data.alpaca.markets',
      path: test.path,
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': ALPACA_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET,
        'accept': 'application/json'
      }
    };

    console.log(`\n=== ${test.name} ===`);
    console.log(`Path: ${test.path}`);

    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.BTCUSD) {
            console.log('✅ BTCUSD trovato!');
            const price = json.BTCUSD.latestTrade?.p || json.BTCUSD.dailyBar?.c;
            console.log(`   Prezzo: $${price}`);
          } else {
            console.log('❌ BTCUSD non trovato nella risposta');
          }
          if (json.ETHUSD) {
            console.log('✅ ETHUSD trovato!');
            const price = json.ETHUSD.latestTrade?.p || json.ETHUSD.dailyBar?.c;
            console.log(`   Prezzo: $${price}`);
          }
        } catch (e) {
          console.log('⚠️  Errore parsing JSON');
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Errore:', error.message);
      resolve();
    });

    req.end();
  });
}

async function runAllTests() {
  for (const test of tests) {
    await runTest(test);
    await new Promise(r => setTimeout(r, 500)); // Pausa tra test
  }
  console.log('\n=== Test completati ===\n');
}

runAllTests();
