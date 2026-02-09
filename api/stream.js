// api/stream.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { url, filename = 'movie.mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const targetUrl = decodeURIComponent(url);
    console.log(`[Vercel] Streaming: ${filename}`);
    
    // Fetch with WhatsApp headers
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'WhatsApp/2.0',
        'Accept': 'video/mp4',
        'Referer': 'https://whatsapp.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Powered-By', 'DANUWA-MD Vercel');
    
    // Stream the response
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    
    res.end();
    
  } catch (error) {
    console.error('[Vercel] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
