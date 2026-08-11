async function testBase64() {
  const url = `https://image.pollinations.ai/prompt/carro%20velho%20dark%20fantasy%20rpg%20boss%20monster%20portrait%20cinematic%20detailed%208k?width=512&height=512&seed=123&nologo=true`;
  const polResp = await fetch(url);
  if (!polResp.ok) throw new Error('Fetch failed');
  const arrayBuffer = await polResp.arrayBuffer();
  console.log('Size:', arrayBuffer.byteLength);
  
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  try {
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    console.log('Base64 length:', base64.length);
  } catch (e) {
    console.error('Error during encoding:', e);
  }
}

testBase64();
