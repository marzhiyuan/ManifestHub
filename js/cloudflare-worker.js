export default {
  async fetch(request, env, ctx) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);
    const downloadId = url.searchParams.get("download");

    // --- 📩 CONFIGURATION: REQUESTS ---
    const requestWebhookUrl =
      "https://ptb.discord.com/api/webhooks/1475958160324952145/rQSLjOekVzrRGraM_WR62x3pDXiv8aPdeqFj2stfVkLJqV0nYpr_lLidOw-4fdqBjQmB";
    const requestSheetUrl =
      "https://script.google.com/macros/s/AKfycbzp8pgrM-gQNPPdCRRu9gfxvrTvcQ4R7JqGsKSRj499keXhmyhE5r2WNhBKV4AMOJsgCA/exec";

    // --- 📥 CONFIGURATION: DOWNLOADS ---
    const downloadWebhookUrl =
      "https://ptb.discord.com/api/webhooks/1476278568492339272/SY1pLHDVnWLd9y7NHLD3SadNItQwKk6ppzqUHB5qBW-Lbu-qk_zOtt0wUyG_a6jbRqV6";
    const downloadSheetUrl =
      "https://script.google.com/macros/s/AKfycbyro8fNoBiryHgqDb-tj661LTPA2Y6Jkjc0u44eCszFSQ7r0L5Q5ArlGaJx3JMKNV-9Xg/exec";

    const userIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    // ==========================================
    // JOB 1: DOWNLOAD & LUA TRACKING (GET)
    // ==========================================
    if (request.method === "GET" && url.searchParams.get("history") === "true") {
      try {
        const response = await fetch(`${downloadSheetUrl}?ip=${encodeURIComponent(userIp)}`);
        const data = await response.text();
        return new Response(data, {
          status: 200,
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        });
      }
    }

    if (request.method === "GET" && downloadId) {
      const gameName = url.searchParams.get("name") || "Unknown Game";
      const isPing = request.headers.get("Sec-Fetch-Mode") === "cors";

      const logTask = (async () => {
        try {
          await Promise.all([
            // Discord: Clean notification, no IP
            fetch(downloadWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `✨ **Download**: \`${gameName}\` (AppID: ${downloadId})`,
              }),
            }),
            // Google Sheets: Hidden IP logging
            fetch(downloadSheetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "download_log",
                timestamp: new Date().toISOString(),
                appId: downloadId,
                gameName: gameName,
                ipAddress: userIp,
              }),
            }),
          ]);
        } catch (err) {
          console.error("Tracking failed:", err);
        }
      })();

      ctx.waitUntil(logTask);

      if (isPing) {
        return new Response("Logged", { status: 200, headers });
      }

      return Response.redirect(
        `https://codeload.github.com/SteamAutoCracks/ManifestHub/zip/refs/heads/${downloadId}`,
        302,
      );
    }

    // ==========================================
    // JOB 2: GAME REQUEST FORM (POST)
    // ==========================================
    if (request.method === "POST") {
      try {
        const data = await request.json();

        data.type = "request";
        data.ipAddress = userIp;
        data.timestamp = new Date().toISOString();

        const processRequest = (async () => {
          try {
            await Promise.all([
              // Discord: Clean notification, no IP
              fetch(requestWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `**📩 New Request!**\n**Name:** ${data.gameName}\n**AppID:** ${data.appId}`,
                }),
              }),
              // Google Sheets: Hidden IP logging
              fetch(requestSheetUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }),
            ]);
          } catch (err) {
            console.error("Request logging failed:", err);
          }
        })();

        ctx.waitUntil(processRequest);

        return new Response(JSON.stringify({ status: "success" }), {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ status: "error", message: err.message }),
          {
            status: 500,
            headers,
          },
        );
      }
    }

    return new Response("ManifestHub Bridge is Active", {
      status: 200,
      headers,
    });
  },
};
