const fs = require('fs');
const path = require('path');

const workerUrl = process.env.TRENDING_API_URL || 'https://manifesthub-bridge.trionine.workers.dev/';

async function updateTrending() {
  const url = workerUrl.endsWith('/') ? `${workerUrl}?top=true` : `${workerUrl}/?top=true`;
  console.log(`Fetching trending downloads from: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    
    // Ensure data is valid JSON array
    if (!Array.isArray(data)) {
      throw new Error("Invalid data format: Expected an array of downloads");
    }

    const outputPath = path.join(__dirname, '..', 'js', 'trending-data.json');
    
    // Ensure parent directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote ${data.length} trending items to ${outputPath}`);
  } catch (err) {
    console.error("Error updating trending downloads:", err);
    process.exit(1);
  }
}

updateTrending();
