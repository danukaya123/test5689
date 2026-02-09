// api/stream.js - DIRECT WhatsApp Streaming
export default async function handler(req, res) {
  // Set CORS for WhatsApp
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { url, filename = 'movie.mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const targetUrl = decodeURIComponent(url);
    console.log(`[VERCEL] Direct streaming: ${filename}`);
    
    // Get file info first
    const headResponse = await fetch(targetUrl, { method: 'HEAD' });
    const contentLength = headResponse.headers.get('content-length');
    const contentType = headResponse.headers.get('content-type') || 'video/mp4';
    
    // WhatsApp REQUIRES these headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // CRITICAL: These headers make WhatsApp download directly
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Stream directly from source to WhatsApp
    const sourceResponse = await fetch(targetUrl);
    const reader = sourceResponse.body.getReader();
    
    // Pipe stream directly
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
