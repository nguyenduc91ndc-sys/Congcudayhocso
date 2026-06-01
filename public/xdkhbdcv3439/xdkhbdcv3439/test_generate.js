async function testGenerate() {
  const dummyImage = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
  
  const form = new FormData();
  form.append('apiKey', process.env.GEMINI_API_KEY || '');
  form.append('lessonImage', new Blob([dummyImage], { type: 'image/png' }), 'test.png');
  
  try {
    const res = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      body: form
    });
    
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('RESPONSE:', text);
  } catch(e) {
    console.error(e);
  }
}

testGenerate();
