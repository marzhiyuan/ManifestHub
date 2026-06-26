const fs = require("fs");
const path = require("path");

const gsheetUrl = process.env.GSHEET_TRENDING_URL;

const trendingPath = path.join(__dirname, "..", "data", "trending-data.json");
const TOP_N = 50;

async function updateTrending() {
  if (!gsheetUrl) {
    console.error("GSHEET_TRENDING_URL env var not set");
    process.exit(1);
  }

  const url = gsheetUrl.includes("?") ? `${gsheetUrl}&action=top` : `${gsheetUrl}?action=top`;
  console.log(`Fetching trending downloads from Google Sheets: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid data format: Expected an array of downloads");
    }

    const allGames = data
      .map((entry) => ({
        appId: String(entry.appId),
        gameName: entry.gameName || "Unknown Game",
        count: Number(entry.count) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const dir = path.dirname(trendingPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const top = allGames.slice(0, TOP_N);
    fs.writeFileSync(trendingPath, JSON.stringify(top, null, 2), "utf8");
    console.log(`trending-data.json updated: top ${top.length} games`);
  } catch (err) {
    console.error("Error updating trending downloads:", err);
    process.exit(1);
  }
}

updateTrending();
