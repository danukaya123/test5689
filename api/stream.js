// api/stream.js - UPDATED
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { url, filename = 'movie.mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const targetUrl = decodeURIComponent(url);
    
    // Handle HEAD request (Baileys checks this first)
    if (req.method === 'HEAD') {
      console.log(`[VERCEL] HEAD request for: ${filename}`);
      
      const headResponse = await fetch(targetUrl, { method: 'HEAD' });
      
      res.setHeader('Content-Type', headResponse.headers.get('content-type') || 'video/mp4');
      res.setHeader('Content-Length', headResponse.headers.get('content-length') || '0');
      res.setHeader('Accept-Ranges', 'bytes');
      
      return res.status(200).end();
    }
    
    // Handle GET request (actual streaming)
    console.log(`[VERCEL] GET streaming: ${filename}`);
    
    const response = await fetch(targetUrl);
    
    // Forward headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Length', response.headers.get('content-length') || '0');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Stream the response
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    
    res.end();
    
  } catch (error) {
    console.error('[VERCEL] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
