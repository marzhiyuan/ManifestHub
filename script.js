document.addEventListener("DOMContentLoaded", function () {
  // ========== MODALS ==========
  const disclaimerModal = document.getElementById("disclaimerModal");
  const unsupportedModal = document.getElementById("unsupportedModal");
  const requestedModal = document.getElementById("requestedModal");

  document
    .getElementById("acceptDisclaimer")
    .addEventListener("click", function () {
      disclaimerModal.classList.add("hidden");
    });

  document
    .getElementById("closeUnsupportedModal")
    .addEventListener("click", function () {
      unsupportedModal.classList.add("hidden");
    });

  document
    .getElementById("closeRequestedModal")
    .addEventListener("click", function () {
      requestedModal.classList.add("hidden");
    });

  // ========== ACCORDION ==========
  const accordionBtn = document.getElementById("requestAccordionBtn");
  const requestFormContainer = document.getElementById("requestFormContainer");
  const accordionIcon = document.getElementById("accordionIcon");
  const appIdField = document.getElementById("appid");

  accordionBtn.addEventListener("click", function () {
    requestFormContainer.classList.toggle("hidden");
    if (requestFormContainer.classList.contains("hidden")) {
      accordionIcon.className =
        "fas fa-chevron-down text-purple-400 transition-transform duration-300";
    } else {
      accordionIcon.className =
        "fas fa-chevron-up text-purple-400 transition-transform duration-300";
      setTimeout(() => appIdField.focus(), 100);
    }
  });

  // ========== GLOBAL DATA & TRACKING ==========
  const WORKER_URL = "https://manifesthub-bridge.sadabsiperkhan.workers.dev/";
  const REPO_OWNER = "SteamAutoCracks";

  let blacklistedGames = [];
  let requestedGames = [];
  let depotKeys = {};
  let appNames = {};
  let appTypes = {};
  let appDepots = {};
  let searchable = [];
  let cooldownUntil = 0;
  const COOLDOWN_SECONDS = 60;

  // --- Tracking Ping (uses fetch so it works for both GET tracking and CORS) ---
  function trackEvent(appId, name) {
    fetch(`${WORKER_URL}?download=${appId}&name=${encodeURIComponent(name)}`, {
      method: "GET",
      mode: "no-cors",
    }).catch(() => {});
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updateStatus(message, isError = false) {
    const statusEl = document.getElementById("statusText");
    const infoBox = document.getElementById("infoBox");
    statusEl.innerHTML = message;
    if (isError) {
      infoBox.className =
        "bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-4 text-sm";
    } else {
      infoBox.className =
        "bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-4 text-sm";
    }
  }

  // ========== LOAD BLACKLIST AND REQUESTS ==========
  async function loadBlacklist() {
    try {
      const response = await fetch("blacklist.json");
      if (response.ok) {
        blacklistedGames = await response.json();
        if (!Array.isArray(blacklistedGames)) blacklistedGames = [];
      }
    } catch (e) {
      console.warn("Could not load blacklist.json");
    }
  }

  async function loadRequestedGames() {
    try {
      const response = await fetch("requests.json");
      if (response.ok) {
        requestedGames = await response.json();
        if (!Array.isArray(requestedGames)) requestedGames = [];
      }
    } catch (e) {
      console.warn("Could not load requests.json");
    }
  }

  // ========== LOAD DEPOT KEYS ==========
  async function loadDepotKeys() {
    updateStatus("Loading depot keys...");
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/fylsdy/ManifestHub/refs/heads/main/depotkeys(178%2C474)(By%20Sudama).json",
      );
      depotKeys = await response.json();
      updateStatus(`✅ Loaded ${Object.keys(depotKeys).length} depot keys`);
      document.getElementById("statDepots").textContent =
        Object.keys(depotKeys).length;
    } catch (e) {
      updateStatus("❌ Failed to load depot keys", true);
      console.error(e);
    }
  }

  // ========== LOAD APP LISTS ==========
  async function loadAppLists() {
    updateStatus("Loading game catalogues...");
    try {
      const gamesResponse = await fetch(
        "https://raw.githubusercontent.com/jsnli/steamappidlist/refs/heads/master/data/games_appid.json",
      );
      const games = await gamesResponse.json();
      games.forEach((app) => {
        appNames[app.appid] = app.name;
        appTypes[app.appid] = "game";
      });

      const dlcResponse = await fetch(
        "https://raw.githubusercontent.com/jsnli/steamappidlist/refs/heads/master/data/dlc_appid.json",
      );
      const dlcs = await dlcResponse.json();
      dlcs.forEach((app) => {
        appNames[app.appid] = app.name;
        appTypes[app.appid] = "dlc";
      });

      const softwareResponse = await fetch(
        "https://raw.githubusercontent.com/jsnli/steamappidlist/refs/heads/master/data/software_appid.json",
      );
      const software = await softwareResponse.json();
      software.forEach((app) => {
        appNames[app.appid] = app.name;
        appTypes[app.appid] = "software";
      });

      document.getElementById("statTotal").textContent =
        Object.keys(appNames).length;
      buildMapping();
    } catch (e) {
      updateStatus("❌ Failed to load app lists", true);
      console.error(e);
    }
  }

  // ========== BUILD MAPPING ==========
  function buildMapping() {
    updateStatus("Building app mapping...");
    const MAX_DISTANCE = 100;
    const sortedAppids = Object.keys(appNames)
      .map(Number)
      .sort((a, b) => a - b);
    const raw = {};

    Object.keys(depotKeys).forEach((depotStr) => {
      const depotId = parseInt(depotStr);
      let left = 0,
        right = sortedAppids.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (sortedAppids[mid] < depotId) left = mid + 1;
        else right = mid - 1;
      }
      if (left < sortedAppids.length) {
        const appId = sortedAppids[left];
        if (appId - depotId <= MAX_DISTANCE && appId >= depotId) {
          if (!raw[appId]) raw[appId] = new Set();
          raw[appId].add(depotId);
        }
      }
      if (right >= 0) {
        const appId = sortedAppids[right];
        if (depotId - appId <= MAX_DISTANCE && depotId >= appId) {
          if (!raw[appId]) raw[appId] = new Set();
          raw[appId].add(depotId);
        }
      }
    });

    appDepots = {};
    Object.keys(raw).forEach((appIdStr) => {
      const appId = parseInt(appIdStr);
      if (appNames[appId]) {
        appDepots[appId] = Array.from(raw[appId]).sort((a, b) => a - b);
      }
    });

    searchable = Object.keys(appDepots)
      .map((appId) => parseInt(appId))
      .sort((a, b) => a - b)
      .map((appId) => ({
        appId: appId,
        name: appNames[appId],
        nameLower: appNames[appId].toLowerCase(),
        appIdStr: appId.toString(),
      }));

    const supported = searchable.length;
    document.getElementById("statSupported").textContent = supported;
    document.getElementById("statsContainer").classList.remove("hidden");
    
    const searchInput = document.getElementById("gameSearchInput");
    searchInput.disabled = false;
    searchInput.placeholder = "Search for a game (e.g. Cyberpunk 2077)";
    
    updateStatus(`✅ Ready! ${supported} supported apps`);
  }

  // ========== GENERATE LUA CONTENT ==========
  function generateLuaContent(appId, depots) {
    const lua = [`addappid(${appId})`];
    let validCount = 0;
    for (const depot of depots) {
      const key = depotKeys[depot.toString()];
      if (key) {
        lua.push(`addappid(${depot},0,"${key}")`);
        validCount++;
      }
    }
    return { content: lua.join("\n"), count: validCount };
  }

  // ========== FETCH LIVE MANIFESTS ==========
  async function fetchLiveManifests(appId) {
    try {
      const response = await fetch(`https://api.steamcmd.net/v1/info/${appId}`);
      const data = await response.json();
      if (data.status === "success" && data.data[appId]) {
        const depots = data.data[appId].depots;
        const manifests = [];
        for (const depotId in depots) {
          if (
            !isNaN(depotId) &&
            depots[depotId].manifests &&
            depots[depotId].manifests.public
          ) {
            const manifestId = depots[depotId].manifests.public.gid;
            const depotName = depots[depotId].name || `Depot ${depotId}`;
            manifests.push({
              depotId,
              manifestId,
              depotName,
              downloadUrl: `https://raw.githubusercontent.com/qwe213312/k25FCdfEOoEJ42S6/main/${depotId}_${manifestId}.manifest`,
            });
          }
        }
        return manifests;
      }
    } catch (e) {
      console.log("Live manifest fetch failed:", e);
    }
    return [];
  }

  // ========== DISPLAY GAME FILES ==========
  let currentSelectedGame = null;
  let currentFiles = [];

  async function displayGameFiles(appId, gameName) {
    currentSelectedGame = { appId, gameName };

    const gameIcon = document.getElementById("selectedGameIcon");
    gameIcon.style.display = "";
    gameIcon.src = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    gameIcon.onerror = () => {
      gameIcon.style.display = "none";
    };
    document.getElementById("selectedGameName").textContent = gameName;
    document.getElementById("selectedGameId").textContent = `AppID: ${appId}`;

    const filesList = document.getElementById("availableFilesList");
    filesList.innerHTML =
      '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';
    document.getElementById("selectedGamePanel").classList.remove("hidden");

    const files = [];
    const depots = appDepots[appId] || [];

    // 1. Generate Lua keys locally
    if (depots.length > 0) {
      const luaResult = generateLuaContent(appId, depots);
      if (luaResult.count > 0) {
        const luaBlob = new Blob([luaResult.content], { type: "text/plain" });
        const luaUrl = URL.createObjectURL(luaBlob);
        files.push({
          name: `${appId}.lua`,
          type: "Lua Keys",
          size: `${luaResult.content.length} bytes`,
          icon: "fas fa-file-code",
          iconColor: "text-green-400",
          url: luaUrl,
          blob: luaBlob,
        });
      }
    }

    // 2. Fetch live manifests
    const liveManifests = await fetchLiveManifests(appId);
    for (const manifest of liveManifests) {
      files.push({
        name: `${manifest.depotId}_${manifest.manifestId}.manifest`,
        type: "Manifest (Live)",
        icon: "fas fa-file-archive",
        iconColor: "text-blue-400",
        url: manifest.downloadUrl,
        isExternal: true,
      });
    }

    // 3. Check GitHub manifest repo
    try {
      const githubCheck = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/ManifestHub/branches/${appId}`,
      );
      if (githubCheck.status === 200) {
        files.push({
          name: `${appId}.zip`,
          type: "Legacy Zip",
          icon: "fas fa-database",
          iconColor: "text-purple-400",
          url: `https://codeload.github.com/${REPO_OWNER}/ManifestHub/zip/refs/heads/${appId}`,
          isExternal: true,
        });
      }
    } catch (e) {}

    if (files.length === 0) {
      filesList.innerHTML =
        '<div class="text-center py-4 text-slate-400">No files available for this game yet. Try requesting it!</div>';
      document.getElementById("downloadAllZipBtn").classList.add("hidden");
      currentFiles = [];
      return;
    }

    // Render file list — use addEventListener (NOT onclick) so trackEvent closure works
    filesList.innerHTML = "";
    files.forEach((file) => {
      const fileDiv = document.createElement("div");
      fileDiv.className = "file-item";
      fileDiv.innerHTML = `
        <div class="file-info">
          <i class="${file.icon} ${file.iconColor} file-icon"></i>
          <div class="file-details">
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-meta">${file.type}${file.size ? ` · ${file.size}` : ""}</span>
          </div>
        </div>
        <button class="download-btn">
          <i class="fas fa-download"></i> Download
        </button>
      `;

      fileDiv.querySelector(".download-btn").addEventListener("click", () => {
        // Fire tracking ping — properly inside closure so trackEvent is reachable
        trackEvent(appId, `${gameName} - ${file.type}`);

        // Trigger the actual download programmatically
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.name;
        if (file.isExternal) a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      filesList.appendChild(fileDiv);
    });

    document.getElementById("downloadAllZipBtn").classList.remove("hidden");
    currentFiles = files;
  }

  // ========== GENERATE ZIP ==========
  async function generateZip(files, gameName, appId) {
    if (typeof JSZip === "undefined") {
      alert("Loading ZIP library, please try again...");
      return;
    }

    const zipBtn = document.getElementById("downloadAllZipBtn");
    zipBtn.disabled = true;
    zipBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Zipping...';

    const zip = new JSZip();
    for (const file of files) {
      if (file.blob) {
        const content = await file.blob.text();
        zip.file(file.name, content);
      } else if (file.url) {
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          zip.file(file.name, blob);
        } catch (e) {
          console.log("Failed to add to zip:", file.name);
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const downloadUrl = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${gameName.replace(/[^a-z0-9]/gi, "_")}_T9.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    zipBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Complete!';
    setTimeout(() => {
      zipBtn.disabled = false;
      zipBtn.innerHTML =
        '<i class="fas fa-file-archive mr-2"></i> Download All';
    }, 2000);
  }

  document.getElementById("downloadAllZipBtn").addEventListener("click", () => {
    if (currentFiles && currentFiles.length > 0 && currentSelectedGame) {
      trackEvent(
        currentSelectedGame.appId,
        currentSelectedGame.gameName + " (ZIP)",
      );
      generateZip(
        currentFiles,
        currentSelectedGame.gameName,
        currentSelectedGame.appId,
      );
    }
  });

  // ========== SEARCH FUNCTIONALITY ==========
  const gameSearchInput = document.getElementById("gameSearchInput");
  const searchResultsDiv = document.getElementById("searchResults");

  gameSearchInput.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();
    searchResultsDiv.innerHTML = "";

    if (query.length < 2) {
      document.getElementById("selectedGamePanel").classList.add("hidden");
      currentSelectedGame = null;
      currentFiles = [];
      return;
    }

    let count = 0;
    for (const item of searchable) {
      if (item.nameLower.includes(query) || item.appIdStr.includes(query)) {
        const appId = item.appId;
        const name = item.name;
        const type = appTypes[appId] || "game";
        const depotCount = (appDepots[appId] || []).length;

        const div = document.createElement("div");
        div.className = "result-item";
        div.innerHTML = `
          <img class="result-img" src="https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_184x69.jpg" alt="${escapeHtml(name)}" loading="lazy" onerror="this.style.display='none'">
          <div class="result-info">
            <strong>${escapeHtml(name)}</strong>
            <div class="result-sub">
              <span class="badge badge-${type}">${type}</span>
              <span class="badge badge-depot">${depotCount} depot${depotCount !== 1 ? "s" : ""}</span>
              <span>AppID ${appId}</span>
            </div>
          </div>
        `;
        div.addEventListener("click", () => {
          searchResultsDiv.innerHTML = "";
          gameSearchInput.value = name;
          displayGameFiles(appId, name);
        });
        searchResultsDiv.appendChild(div);
        count++;
        if (count >= 20) break;
      }
    }

    if (count === 0) {
      const div = document.createElement("div");
      div.className = "no-results";
      div.innerHTML = "🚫 No supported game matches this search.";
      searchResultsDiv.appendChild(div);
    }
  });

  gameSearchInput.addEventListener("blur", function () {
    setTimeout(() => {
      if (
        !searchResultsDiv.matches(":hover") &&
        !gameSearchInput.matches(":focus")
      ) {
        searchResultsDiv.innerHTML = "";
      }
    }, 200);
  });

  /*
  // ========== LEGACY ARCHIVE CHECK ==========
  const legacyCheckBtn = document.getElementById("legacyCheckBtn");
  const legacyAppId = document.getElementById("legacyAppId");
  const legacyResultsSection = document.getElementById("legacyResultsSection");
  const legacyTerminalOutput = document.getElementById("legacyTerminalOutput");
  const legacyDownloadSection = document.getElementById(
    "legacyDownloadSection",
  );
  const legacyDownloadLink = document.getElementById("legacyDownloadLink");
  const legacyNotFoundSection = document.getElementById(
    "legacyNotFoundSection",
  );
  const legacyNotFoundMessage = document.getElementById(
    "legacyNotFoundMessage",
  );

  async function typeLegacyText(text) {
    for (let i = 0; i < text.length; i++) {
      legacyTerminalOutput.textContent += text.charAt(i);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async function legacyCheckManifest() {
    const gameId = legacyAppId.value.trim();

    if (!gameId || !/^\d+$/.test(gameId)) {
      alert("Please enter a valid Steam AppID (numbers only)");
      return;
    }

    legacyCheckBtn.disabled = true;
    legacyCheckBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> CHECKING...';
    legacyResultsSection.classList.remove("hidden");
    legacyDownloadSection.classList.add("hidden");
    legacyNotFoundSection.classList.add("hidden");
    legacyTerminalOutput.textContent = "";

    await typeLegacyText(
      `> Initiating manifest check for Steam AppID: ${gameId}\n`,
    );
    await typeLegacyText(`> Searching GitHub repository...\n`);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/ManifestHub/branches/${gameId}`,
      );

      if (response.status === 200) {
        await typeLegacyText(`> ✅ Manifest found in database!\n`);
        await typeLegacyText(`> Preparing download link...\n`);

        const gameName = appNames[parseInt(gameId)] || "Unknown Game";
        const trackingUrl = `${WORKER_URL}?download=${gameId}&name=${encodeURIComponent(gameName + " (Legacy)")}`;

        legacyDownloadLink.removeAttribute("download");
        legacyDownloadLink.href = trackingUrl;
        legacyDownloadSection.classList.remove("hidden");

        legacyCheckBtn.innerHTML =
          '<i class="fas fa-check mr-2"></i> CHECK COMPLETE';
      } else {
        await typeLegacyText(`> ❌ Manifest not found in GitHub archive.\n`);
        await typeLegacyText(
          `> No legacy manifest available for this AppID.\n`,
        );
        legacyNotFoundMessage.textContent =
          "No manifest was found in the legacy archive for this Steam application. Please use the search bar above to check for live manifests or Lua keys.";
        legacyNotFoundSection.classList.remove("hidden");
        legacyCheckBtn.innerHTML =
          '<i class="fas fa-search mr-2"></i> CHECK AGAIN';
      }
    } catch (error) {
      await typeLegacyText(`> ⚠️ Error checking manifest. Please try again.\n`);
      legacyCheckBtn.innerHTML =
        '<i class="fas fa-search mr-2"></i> CHECK AGAIN';
    }
    legacyCheckBtn.disabled = false;
  }

  legacyCheckBtn.addEventListener("click", legacyCheckManifest);
  legacyAppId.addEventListener("keypress", function (e) {
    if (e.key === "Enter") legacyCheckManifest();
  });
  */

  // ========== REQUEST FORM HANDLING ==========
  const submitBtn = document.getElementById("submitRequestBtn");
  const formFeedback = document.getElementById("formFeedback");
  const cooldownContainer = document.getElementById("cooldownContainer");
  const cooldownSeconds = document.getElementById("cooldownSeconds");

  function isGameBlacklisted(appId) {
    return blacklistedGames.some(
      (game) => game.appId === appId.toString().trim(),
    );
  }
  function getBlacklistedGameInfo(appId) {
    return blacklistedGames.find(
      (game) => game.appId === appId.toString().trim(),
    );
  }
  function isGameAlreadyRequested(appId) {
    return requestedGames.some(
      (game) => game.appId === appId.toString().trim(),
    );
  }
  function getRequestedGameInfo(appId) {
    return requestedGames.find(
      (game) => game.appId === appId.toString().trim(),
    );
  }

  function updateCooldown() {
    const now = Date.now();
    if (cooldownUntil > now) {
      const remaining = Math.ceil((cooldownUntil - now) / 1000);
      cooldownSeconds.textContent = remaining;
      cooldownContainer.classList.remove("hidden");
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-50", "cursor-not-allowed");
      setTimeout(updateCooldown, 200);
    } else {
      cooldownContainer.classList.add("hidden");
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }

  function startCooldown() {
    cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;
    updateCooldown();
  }

  const requestForm = document.getElementById("requestForm");
  requestForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Reset feedback state on every submission attempt
    formFeedback.className = "form-feedback text-slate-400";
    formFeedback.textContent = "";

    const appId = appIdField.value.trim();
    const gameName = document.getElementById("gamename").value.trim();

    if (!appId || !gameName) {
      formFeedback.textContent = "❌ Both fields are required.";
      formFeedback.classList.add("text-red-400");
      return;
    }

    if (isGameBlacklisted(appId)) {
      const blacklistedInfo = getBlacklistedGameInfo(appId);
      const blacklistedName = blacklistedInfo
        ? escapeHtml(blacklistedInfo.name)
        : escapeHtml(gameName);
      document.getElementById("unsupportedGameMessage").innerHTML =
        `The game <span class="font-bold text-orange-400">"${blacklistedName}" (AppID: ${escapeHtml(appId)})</span> is not supported.`;
      unsupportedModal.classList.remove("hidden");
      formFeedback.textContent = "❌ This game is blacklisted.";
      formFeedback.classList.add("text-red-400");
      return;
    }

    if (isGameAlreadyRequested(appId)) {
      const requestedInfo = getRequestedGameInfo(appId);
      const requestedName = requestedInfo
        ? escapeHtml(requestedInfo.name)
        : escapeHtml(gameName);
      document.getElementById("requestedGameMessage").innerHTML =
        `The game <span class="font-bold text-blue-400">"${requestedName}" (AppID: ${escapeHtml(appId)})</span> has already been requested.`;
      requestedModal.classList.remove("hidden");
      formFeedback.textContent = "ℹ️ This game has already been requested.";
      formFeedback.classList.add("text-blue-400");
      return;
    }

    if (cooldownUntil > Date.now()) {
      const remain = Math.ceil((cooldownUntil - Date.now()) / 1000);
      formFeedback.textContent = `⏳ Please wait ${remain} seconds before requesting again.`;
      formFeedback.classList.add("text-orange-400");
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> SENDING...';

    try {
      const response = await fetch(requestForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, gameName }),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        formFeedback.textContent = "✅ Request sent! Thank you. (Cooldown 60s)";
        formFeedback.classList.add("text-green-400");
        requestForm.reset();
        startCooldown();
      } else {
        formFeedback.textContent = "❌ Submission failed. Please try again.";
        formFeedback.classList.add("text-red-400");
      }
    } catch (error) {
      formFeedback.textContent = "❌ Network error. Please check connection.";
      formFeedback.classList.add("text-red-400");
    } finally {
      // Only restore button if cooldown hasn't taken over
      if (cooldownUntil <= Date.now()) {
        submitBtn.disabled = false;
      }
      submitBtn.innerHTML = originalText;
    }
  });

  // ========== INITIALIZE ==========
  Promise.all([loadBlacklist(), loadRequestedGames()]).then(() => {
    loadDepotKeys().then(() => {
      loadAppLists();
    });
  });
});
