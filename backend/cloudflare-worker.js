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
    const userIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    const sbUrl = env.SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;

    // --- JOB 1: FETCH DYNAMIC TRENDING DATA (Calls Production RPC) ---
    if (request.method === "GET" && url.searchParams.get("top") === "true") {
      try {
        const response = await fetch(
          `${sbUrl}/rest/v1/rpc/get_popular_downloads`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sbKey}`,
              apikey: sbKey,
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.text();
        return new Response(data, {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers,
        });
      }
    }

    // --- JOB 2: LOGGING INCOMING DOWNLOADS ---
    if (request.method === "GET" && downloadId) {
      const rawGameName = url.searchParams.get("name") || "Unknown Game";
      const userId = url.searchParams.get("uid") || null;
      const isPing = request.headers.get("Sec-Fetch-Mode") === "cors";

      let gameName = rawGameName;
      let downloadType = "Legacy";

      if (rawGameName.includes(" - ")) {
        const parts = rawGameName.split(" - ");
        gameName = parts[0];
        const suffix = parts[1].toLowerCase();
        if (suffix.includes("lua")) {
          downloadType = ".lua";
        } else if (suffix.includes("manifest")) {
          downloadType = ".manifest";
        }
      } else if (rawGameName.toLowerCase().includes("zip")) {
        gameName = rawGameName
          .replace(/\s*\(zip\)/gi, "")
          .replace(/\s*[-–]\s*zip/gi, "");
        downloadType = "ZIP";
      } else if (rawGameName.toLowerCase().includes("legacy")) {
        gameName = rawGameName
          .replace(/\s*\(legacy\)/gi, "")
          .replace(/\s*[-–]\s*legacy/gi, "");
        downloadType = "Legacy";
      }

      const logTask = (async () => {
        // 1. Send cleanly formatted alert message to Discord
        if (env.DOWNLOAD_WEBHOOK_URL) {
          try {
            await fetch(env.DOWNLOAD_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `⬇️ **Download**: \`${gameName}\` (${downloadType})`,
              }),
            });
          } catch (e) {
            console.error("Discord notice failed:", e);
          }
        }

        // 2. Write real-time download signature row into public.download_history (logged-in users only)
        if (userId) {
          try {
            await fetch(`${sbUrl}/rest/v1/download_history`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sbKey}`,
                apikey: sbKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_id: userId,
                app_id: parseInt(downloadId),
                download_type: downloadType,
                game_name: gameName,
              }),
            });
          } catch (e) {
            console.error("History insert failed:", e);
          }
        }

        // 3. Log to Google Sheets as backup (uses existing DOWNLOAD_SHEET_URL secret)
        if (env.DOWNLOAD_SHEET_URL) {
          try {
            const sheetRes = await fetch(env.DOWNLOAD_SHEET_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timestamp: new Date().toISOString(),
                appId: downloadId,
                gameName: gameName,
                downloadType: downloadType,
                ipAddress: userIp,
              }),
            });
            if (!sheetRes.ok) {
              console.error(
                "Google Sheet HTTP error:",
                sheetRes.status,
                sheetRes.statusText,
              );
            } else {
              const body = await sheetRes.text();
              let parsed;
              try {
                parsed = JSON.parse(body);
              } catch (_) {
                parsed = null;
              }
              if (parsed && parsed.status === "error") {
                console.error(
                  "Google Sheet app error:",
                  parsed.message || body,
                );
              }
            }
          } catch (e) {
            console.error("Google Sheet log failed:", e);
          }
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

    return new Response("ManifestHub Bridge Active", {
      status: 200,
      headers: { ...headers, "Content-Type": "text/plain" },
    });
  },
};
