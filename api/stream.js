// api/stream.js - COMPLETE FIXED VERSION
export default async function handler(req, res) {
  // IMPORTANT: Set headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { url, filename = 'movie.mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const targetUrl = decodeURIComponent(url);
    console.log(`[VERCEL] Streaming: ${filename} from ${targetUrl.substring(0, 50)}...`);
    
    // Handle HEAD request (WhatsApp checks this)
    if (req.method === 'HEAD') {
      console.log(`[VERCEL] HEAD request received`);
      
      try {
        // Try to get file info from pixeldrain
        const response = await fetch(targetUrl, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*'
          }
        });
        
        // Set response headers
        res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
        res.setHeader('Content-Length', response.headers.get('content-length') || '1000000');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        return res.status(200).end();
        
      } catch (headError) {
        console.error('[VERCEL] HEAD error:', headError.message);
        // Return default headers if HEAD fails
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '100000000'); // 100MB default
        return res.status(200).end();
      }
    }
    
    // ========== ACTUAL STREAMING ==========
    console.log(`[VERCEL] Starting stream for: ${filename}`);
    
    let response;
    try {
      // Fetch with proper headers
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,application/octet-stream,*/*;q=0.8',
          'Referer': 'https://whatsapp.com/'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Source returned ${response.status}: ${response.statusText}`);
      }
      
    } catch (fetchError) {
      console.error('[VERCEL] Fetch error:', fetchError.message);
      return res.status(502).json({ error: `Cannot fetch source: ${fetchError.message}` });
    }
    
    // Get content info
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length') || '0';
    
    console.log(`[VERCEL] Response: ${response.status}, Type: ${contentType}, Size: ${contentLength}`);
    
    // Set FINAL headers (MUST be set before writing)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Set Content-Length if available
    if (contentLength && contentLength !== '0') {
      res.setHeader('Content-Length', contentLength);
    }
    
    // ========== STREAM THE DATA ==========
    const reader = response.body.getReader();
    let bytesStreamed = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log(`[VERCEL] Stream complete. Total: ${bytesStreamed} bytes`);
          break;
        }
        
        bytesStreamed += value.length;
        
        // Write chunk to response
        const writeSuccess = res.write(value);
        
        // Log progress every 5MB
        if (bytesStreamed % (5 * 1024 * 1024) < value.length) {
          console.log(`[VERCEL] Streamed: ${(bytesStreamed / 1024 / 1024).toFixed(2)}MB`);
        }
        
        // Handle backpressure
        if (!writeSuccess) {
          await new Promise(resolve => {
            res.once('drain', resolve);
          });
        }
      }
      
      // End the response
      res.end();
      
    } catch (streamError) {
      console.error('[VERCEL] Stream error:', streamError.message);
      // Don't try to send error if headers already sent
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      }
    }
    
  } catch (error) {
    console.error('[VERCEL] Fatal error:', error.message);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
}
