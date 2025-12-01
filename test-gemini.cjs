// Test Gemini API Connection
// Run with: node test-gemini.cjs

const API_KEY = 'AIzaSyBumyjViqi15Ju2WiEi0uXfXxDm0Gn30Pw';

async function testGeminiConnection() {
    console.log('\n🧪 Testing Gemini API Connection...\n');
    console.log('API Key:', API_KEY.substring(0, 15) + '...');
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: 'Say hello in Italian'
                                }
                            ]
                        }
                    ]
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ API Error:', error);
            console.error('\nStatus:', response.status, response.statusText);
            return false;
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            const text = data.candidates[0].content.parts[0].text;
            console.log('✅ Connection Successful!\n');
            console.log('Response from Gemini:');
            console.log('---');
            console.log(text);
            console.log('---\n');
            return true;
        } else {
            console.error('❌ Unexpected response format:', data);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        return false;
    }
}

// Run test
testGeminiConnection().then(success => {
    if (success) {
        console.log('✅ Gemini API is working correctly!');
        console.log('Your ChatBot should now work properly.\n');
    } else {
        console.log('❌ Gemini API test failed.');
        console.log('Check your API key at: https://aistudio.google.com/apikey\n');
    }
    process.exit(success ? 0 : 1);
});
