// api/stream.js — WHATSAPP SAFE DIRECT STREAM
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url, filename = "video.mp4" } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing url param" });
  }

  const targetUrl = decodeURIComponent(url);
  console.log("[STREAM] Target:", targetUrl);

  try {
    /* ================= HEAD REQUEST ================= */
    if (req.method === "HEAD") {
      const head = await fetch(targetUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "WhatsApp/2.24.2 Android",
          "Accept": "*/*",
          "Referer": "https://pixeldrain.com"
        }
      });

      res.setHeader(
        "Content-Type",
        head.headers.get("content-type") || "video/mp4"
      );
      res.setHeader(
        "Content-Length",
        head.headers.get("content-length") || "0"
      );
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400");

      return res.status(200).end();
    }

    /* ================= GET REQUEST ================= */
    const response = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "WhatsApp/2.24.2 Android",
        "Accept": "application/octet-stream",
        "Referer": "https://pixeldrain.com"
      }
    });

    if (!response.ok) {
      throw new Error(`Source error ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length");

    /* 🚫 BLOCK HTML (dummy file fix) */
    if (contentType.includes("text/html")) {
      console.error("[STREAM] HTML response blocked");
      return res.status(400).json({
        error: "HTML page received instead of file"
      });
    }

    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");

    /* ================= STREAM ================= */
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise(r => res.once("drain", r));
      }
    }

    res.end();
    console.log("[STREAM] Completed");

  } catch (err) {
    console.error("[STREAM] ERROR:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}
