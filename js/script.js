document.addEventListener("DOMContentLoaded", function () {
  // ========== SUPABASE SETUP ==========
  const supabaseUrl = "https://fbmlbukvzyrzevjmaujp.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibWxidWt2enlyemV2am1hdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM3NDMsImV4cCI6MjA5MzkxOTc0M30.HXnKhqT8Gq8WFUxqOsofjE-dSC9Oo4Yem8FTANUnX30";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  let currentUser = null;

  // ========== AUTH MODAL & LOGIC ==========
  const authModal = document.getElementById("authModal");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const closeAuthModal = document.getElementById("closeAuthModal");
  const authForm = document.getElementById("authForm");
  const authTitle = document.getElementById("authTitle");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const authError = document.getElementById("authError");
  const authSwitchBtn = document.getElementById("authSwitchBtn");
  const authSwitchText = document.getElementById("authSwitchText");
  let authMode = "login"; // "login", "signup", "forgot"

  function openAuthModal(mode) {
    authMode = mode;
    updateAuthModalMode();
    if (authError) authError.classList.add("hidden");
    authModal.classList.remove("hidden");
  }

  function updateAuthModalMode() {
    const displayNameGroup = document.getElementById("displayNameGroup");
    const passwordInput = document.getElementById("authPassword");
    const passwordGroup = passwordInput?.closest(".auth-input-group");
    const forgotPasswordWrap = document.getElementById("forgotPasswordWrap");

    if (authMode === "login") {
      authTitle.textContent = "Sign In";
      authSubmitBtn.textContent = "Sign In";
      if (displayNameGroup) displayNameGroup.classList.add("hidden");
      if (passwordGroup) passwordGroup.classList.remove("hidden");
      if (forgotPasswordWrap) forgotPasswordWrap.classList.remove("hidden");
      if (passwordInput) passwordInput.required = true;
      if (authSwitchText) authSwitchText.textContent = "Don't have an account?";
      if (authSwitchBtn) authSwitchBtn.textContent = "Sign Up";
    } else if (authMode === "signup") {
      authTitle.textContent = "Sign Up";
      authSubmitBtn.textContent = "Sign Up";
      if (displayNameGroup) displayNameGroup.classList.remove("hidden");
      if (passwordGroup) passwordGroup.classList.remove("hidden");
      if (forgotPasswordWrap) forgotPasswordWrap.classList.add("hidden");
      if (passwordInput) passwordInput.required = true;
      if (authSwitchText) authSwitchText.textContent = "Already have an account?";
      if (authSwitchBtn) authSwitchBtn.textContent = "Sign In";
    } else if (authMode === "forgot") {
      authTitle.textContent = "Reset Password";
      authSubmitBtn.textContent = "Send reset email";
      if (displayNameGroup) displayNameGroup.classList.add("hidden");
      if (passwordGroup) passwordGroup.classList.add("hidden");
      if (forgotPasswordWrap) forgotPasswordWrap.classList.add("hidden");
      if (passwordInput) passwordInput.required = false;
      if (authSwitchText) authSwitchText.textContent = "Remember your password?";
      if (authSwitchBtn) authSwitchBtn.textContent = "Sign In";
    }
    if (authError) authError.classList.add("hidden");
  }

  if (authSwitchBtn) {
    authSwitchBtn.addEventListener("click", () => {
      if (authMode === "login") {
        authMode = "signup";
      } else {
        authMode = "login";
      }
      updateAuthModalMode();
    });
  }

  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
      authMode = "forgot";
      updateAuthModalMode();
    });
  }

  if (loginBtn)
    loginBtn.addEventListener("click", () => openAuthModal("login"));
  if (signupBtn)
    signupBtn.addEventListener("click", () => openAuthModal("signup"));
  if (closeAuthModal)
    closeAuthModal.addEventListener("click", () =>
      authModal.classList.add("hidden"),
    );

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authError.classList.add("hidden");
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = "Please wait...";

      const email = document.getElementById("authEmail").value;
      const password = document.getElementById("authPassword").value;

      let error = null;
      if (authMode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        error = signInError;
      } else if (authMode === "signup") {
        const displayName =
          document.getElementById("authDisplayName")?.value || "";
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        });
        error = signUpError;
      } else if (authMode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/profile",
        });
        error = resetError;
        if (!error) {
          alert("Password reset email sent! Check your inbox.");
          authModal.classList.add("hidden");
        }
      }

      if (error) {
        console.error("Auth Error:", error);
        authError.textContent = error.message;
        authError.classList.remove("hidden");
      } else if (authMode !== "forgot") {
        authModal.classList.add("hidden");
      }
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = authMode === "login" ? "Sign In" : (authMode === "signup" ? "Sign Up" : "Send reset email");
    });
  }

  function updateAuthUI() {
    const authSection = document.getElementById("authSection");

    if (currentUser) {
      const displayName =
        currentUser.user_metadata?.display_name ||
        currentUser.email?.split("@")[0] ||
        "User";
      const initials = displayName[0].toUpperCase();
      authSection.innerHTML = `
        <div class="user-menu-wrap" style="position:relative;">
          <button id="userMenuBtn" style="display:flex;align-items:center;gap:0.5rem;background:#21262d;border:1px solid #30363d;border-radius:6px;padding:0.3rem 0.6rem;cursor:pointer;color:#c9d1d9;font-size:0.875rem;font-weight:600;">
            <div style="width:20px;height:20px;background:#238636;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;">${initials}</div>
            <span>${displayName}</span>
            <i class="fas fa-chevron-down" style="font-size:0.7rem;color:#8b949e;"></i>
          </button>
          <div id="userDropdown" class="user-dropdown hidden">
            <div style="padding:0.75rem 1rem;border-bottom:1px solid #30363d;font-size:0.8rem;color:#8b949e;">Signed in as<br><strong style="color:#c9d1d9;">${currentUser.email}</strong></div>
            <a href="profile" style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 1rem;font-size:0.875rem;color:#c9d1d9;text-decoration:none;" onmouseover="this.style.backgroundColor='#21262d'" onmouseout="this.style.backgroundColor=''"><i class="fas fa-user" style="width:1rem;"></i> Your Profile</a>
            <div style="border-top:1px solid #30363d;">
              <button id="logoutBtn" style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 1rem;font-size:0.875rem;color:#f85149;background:none;border:none;cursor:pointer;width:100%;text-align:left;" onmouseover="this.style.backgroundColor='#21262d'" onmouseout="this.style.backgroundColor=''"><i class="fas fa-sign-out-alt" style="width:1rem;"></i> Sign out</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById("userMenuBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("userDropdown").classList.toggle("hidden");
      });
      document.addEventListener(
        "click",
        () => {
          const dd = document.getElementById("userDropdown");
          if (dd) dd.classList.add("hidden");
        },
        { once: false },
      );
      document
        .getElementById("logoutBtn")
        .addEventListener("click", async () => {
          await supabase.auth.signOut();
        });
    } else {
      authSection.innerHTML = `
        <button id="loginBtn" class="btn-secondary" style="padding:0.25rem 0.75rem;border-radius:6px;font-size:0.875rem;font-weight:600;">Sign in</button>
        <button id="signupBtn" class="btn-primary" style="padding:0.25rem 0.75rem;border-radius:6px;font-size:0.875rem;font-weight:600;">Sign up</button>
      `;
      document
        .getElementById("loginBtn")
        .addEventListener("click", () => openAuthModal("login"));
      document
        .getElementById("signupBtn")
        .addEventListener("click", () => openAuthModal("signup"));
    }
  }

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
  });

  // ========== MODALS ==========
  const disclaimerModal = document.getElementById("disclaimerModal");
  const unsupportedModal = document.getElementById("unsupportedModal");
  const requestedModal = document.getElementById("requestedModal");

  // Check LocalStorage for disclaimer
  if (!localStorage.getItem("disclaimerAccepted")) {
    disclaimerModal.classList.remove("hidden");
  }

  document
    .getElementById("acceptDisclaimer")
    .addEventListener("click", function () {
      const dontShow = document.getElementById("dontShowAgain").checked;
      if (dontShow) {
        localStorage.setItem("disclaimerAccepted", "true");
      }
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

  // ========== LOAD FAQ ==========
  async function loadFAQ() {
    try {
      const response = await fetch("data/faq.json");
      if (response.ok) {
        const faqs = await response.json();
        const container = document.getElementById("faqContainer");
        faqs.forEach((faq) => {
          const item = document.createElement("div");
          item.className = "faq-item";
          item.innerHTML = `
            <div class="faq-question">
              <span>${escapeHtml(faq.question)}</span>
              <i class="fas fa-chevron-down text-github-muted transition-transform"></i>
            </div>
            <div class="faq-answer">${faq.answer}</div>
          `;
          const questionDiv = item.querySelector(".faq-question");
          const answerDiv = item.querySelector(".faq-answer");
          const icon = item.querySelector("i");

          questionDiv.addEventListener("click", () => {
            const isOpen = answerDiv.classList.contains("open");
            // Close all other open ones (optional, good for accordion)
            document.querySelectorAll(".faq-answer.open").forEach((el) => {
              if (el !== answerDiv) {
                el.classList.remove("open");
                el.previousElementSibling.querySelector("i").style.transform =
                  "rotate(0deg)";
              }
            });

            if (isOpen) {
              answerDiv.classList.remove("open");
              icon.style.transform = "rotate(0deg)";
            } else {
              answerDiv.classList.add("open");
              icon.style.transform = "rotate(180deg)";
            }
          });
          container.appendChild(item);
        });
      }
    } catch (e) {
      console.warn("Could not load data/faq.json");
    }
  }

  // ========== GLOBAL DATA & TRACKING ==========
  const WORKER_URL = "https://manifesthub-bridge.trionine.workers.dev/";
  const REPO_OWNER = "SSMGAlt";

  let depotKeys = {};
  let appNames = {};
  let appTypes = {};
  let appDepots = {};
  let searchable = [];

  async function trackEvent(appId, name) {
    // External tracking ping for Google Sheet / Discord logging
    fetch(`${WORKER_URL}?download=${appId}&name=${encodeURIComponent(name)}`, {
      method: "GET",
      mode: "no-cors",
    }).catch(() => {});

    // Save to Supabase if user is logged in
    if (currentUser) {
      try {
        let gameName = name;
        let type = "Download";

        if (name.includes(" - ")) {
          const parts = name.split(" - ");
          gameName = parts[0];
          type = parts[1];
        } else if (name.endsWith(" (ZIP)")) {
          gameName = name.replace(" (ZIP)", "");
          type = "ZIP Archive";
        } else if (name.endsWith(" (Legacy)")) {
          gameName = name.replace(" (Legacy)", "");
          type = "Legacy Archive";
        }

        const { error } = await supabase.from("download_history").insert({
          user_id: currentUser.id,
          game_name: gameName,
          type: type,
          game_id: appId.toString()
        });

        if (error) {
          console.error("Supabase insert error:", error);
        }
      } catch (err) {
        console.error("Error saving download history:", err);
      }
    }
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
    const icon = infoBox.querySelector("i");
    statusEl.innerHTML = message;
    if (isError) {
      statusEl.style.color = "#f85149";
      if (icon) {
        icon.className = "fas fa-exclamation-triangle mr-2";
        icon.style.color = "#f85149";
      }
    } else {
      statusEl.style.color = "";
    }
  }

  // ========== LOAD DATA ==========
  async function loadDepotKeys() {
    updateStatus("Loading depot keys...");
    try {
      // Source: fylsdy/ManifestHub
      // Purpose: Downloads depot keys to locally generate the .lua files.
      const response = await fetch(
        "https://raw.githubusercontent.com/fylsdy/ManifestHub/main/depotkeys.json",
      );
      depotKeys = await response.json();
      updateStatus(`Loaded ${Object.keys(depotKeys).length} depot keys`);
    } catch (e) {
      updateStatus("Failed to load depot keys", true);
    }
  }

  async function loadAppLists() {
    updateStatus("Loading game catalogues...");

    async function fetchJson(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }

    async function fetchWithFallback(path) {
      // Source: jsnli/steamappidlist
      // Purpose: Main database to map game names to Steam AppIDs for lookup.
      const bases = [
        "https://raw.githubusercontent.com/jsnli/steamappidlist/refs/heads/main/data/",
        "https://raw.githubusercontent.com/jsnli/steamappidlist/refs/heads/master/data/",
      ];
      for (const base of bases) {
        try {
          return await fetchJson(base + path);
        } catch (e) {
          /* try next */
        }
      }
      throw new Error("All mirrors failed for " + path);
    }

    let loaded = 0;
    const tasks = [
      fetchWithFallback("games_appid.json")
        .then((games) => {
          games.forEach((app) => {
            appNames[app.appid] = app.name;
            appTypes[app.appid] = "game";
          });
          loaded++;
          updateStatus(`Loading... (${loaded}/3 catalogues)`);
        })
        .catch(() => console.warn("games list failed")),

      fetchWithFallback("dlc_appid.json")
        .then((dlcs) => {
          dlcs.forEach((app) => {
            appNames[app.appid] = app.name;
            appTypes[app.appid] = "dlc";
          });
          loaded++;
          updateStatus(`Loading... (${loaded}/3 catalogues)`);
        })
        .catch(() => console.warn("dlc list failed")),

      fetchWithFallback("software_appid.json")
        .then((sw) => {
          sw.forEach((app) => {
            appNames[app.appid] = app.name;
            appTypes[app.appid] = "software";
          });
          loaded++;
          updateStatus(`Loading... (${loaded}/3 catalogues)`);
        })
        .catch(() => console.warn("software list failed")),
    ];

    await Promise.all(tasks);

    if (Object.keys(appNames).length === 0) {
      updateStatus("Failed to load app lists. Check connection.", true);
      return;
    }
    buildMapping();
  }

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
        appId,
        name: appNames[appId],
        nameLower: appNames[appId].toLowerCase(),
        appIdStr: appId.toString(),
      }));

    const supported = searchable.length;

    const searchInput = document.getElementById("mainSearchInput");
    searchInput.disabled = false;
    searchInput.style.opacity = "1";
    searchInput.style.cursor = "";
    searchInput.placeholder = "Search for a game (e.g. Cyberpunk 2077)";

    const infoBox = document.getElementById("infoBox");
    const icon = infoBox.querySelector("i");
    if (icon) {
      icon.className = "fas fa-check mr-2";
      icon.style.color = "#3fb950";
    }
    updateStatus(`Ready! ${supported.toLocaleString()} supported apps.`);
  }

  // ========== SEARCH ENGINE SWITCHER ==========
  const searchEngineSelect = document.getElementById("searchEngineSelect");
  const mainSearchInput = document.getElementById("mainSearchInput");
  const legacyCheckBtn = document.getElementById("legacyCheckBtn");
  const searchResultsDiv = document.getElementById("searchResults");
  const legacyResultsSection = document.getElementById("legacyResultsSection");
  const searchIcon = document.getElementById("searchIcon");

  searchEngineSelect.addEventListener("change", function () {
    mainSearchInput.value = "";
    searchResultsDiv.classList.add("hidden");
    legacyResultsSection.classList.add("hidden");
    document.getElementById("selectedGamePanel").classList.add("hidden");

    if (this.value === "database") {
      mainSearchInput.placeholder = "Search for a game (e.g. Cyberpunk 2077)";
      legacyCheckBtn.classList.add("hidden");
      searchIcon.className = "fas fa-search text-github-muted";
      mainSearchInput.classList.remove("rounded-r-none");
    } else {
      mainSearchInput.placeholder = "Enter Steam AppID (e.g., 220968)";
      legacyCheckBtn.classList.remove("hidden");
      searchIcon.className = "fas fa-archive text-purple-400";
      mainSearchInput.classList.add("rounded-r-none");
    }
  });

  // Database Search Input Event
  mainSearchInput.addEventListener("input", function () {
    if (searchEngineSelect.value === "legacy") return;

    const query = this.value.toLowerCase().trim();
    searchResultsDiv.innerHTML = "";

    if (query.length < 2) {
      searchResultsDiv.classList.add("hidden");
      document.getElementById("selectedGamePanel").classList.add("hidden");
      return;
    }

    searchResultsDiv.classList.remove("hidden");

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
          searchResultsDiv.classList.add("hidden");
          mainSearchInput.value = name;
          displayGameFiles(appId, name);
        });
        searchResultsDiv.appendChild(div);
        count++;
        if (count >= 20) break;
      }
    }

    if (count === 0) {
      searchResultsDiv.innerHTML =
        '<div class="no-results">🚫 No supported game matches this search.</div>';
    }
  });

  mainSearchInput.addEventListener("blur", function () {
    setTimeout(() => {
      if (
        !searchResultsDiv.matches(":hover") &&
        !mainSearchInput.matches(":focus")
      ) {
        searchResultsDiv.classList.add("hidden");
      }
    }, 200);
  });

  mainSearchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && searchEngineSelect.value === "legacy") {
      legacyCheckManifest();
    }
  });

  // ========== DISPLAY GAME FILES ==========
  let currentSelectedGame = null;
  let currentFiles = [];

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

  async function fetchLiveManifests(appId) {
    try {
      // Source: api.steamcmd.net
      // Purpose: Queries dynamically to find the latest live manifestId for the game's depots.
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
              // Source: qwe213312/k25FCdfEOoEJ42S6
              // Purpose: Direct download URL for the actual live .manifest file.
              downloadUrl: `https://raw.githubusercontent.com/qwe213312/k25FCdfEOoEJ42S6/main/${depotId}_${manifestId}.manifest`,
            });
          }
        }
        return manifests;
      }
    } catch (e) {}
    return [];
  }

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
      '<div class="text-center py-4 text-github-muted"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';
    document.getElementById("selectedGamePanel").classList.remove("hidden");

    const files = [];
    const depots = appDepots[appId] || [];

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

    try {
      // Source: SSMGAlt/ManifestHub2 (Legacy Archive)
      // Purpose: Checks if a legacy branch named by AppID exists.
      const githubCheck = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/ManifestHub2/branches/${appId}`,
      );
      if (githubCheck.status === 200) {
        files.push({
          name: `${appId}.zip`,
          type: "Legacy Zip",
          icon: "fas fa-database",
          iconColor: "text-purple-400",
          // Source: SSMGAlt/ManifestHub2 (Legacy Archive)
          // Purpose: Direct URL to download the branch as a ZIP file.
          url: `https://codeload.github.com/${REPO_OWNER}/ManifestHub2/zip/refs/heads/${appId}`,
          isExternal: true,
        });
      }
    } catch (e) {}

    if (files.length === 0) {
      filesList.innerHTML =
        '<div class="text-center py-4 text-github-muted">No files available for this game yet.</div>';
      document.getElementById("downloadAllZipBtn").classList.add("hidden");
      currentFiles = [];
      return;
    }

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
        <button class="download-btn"><i class="fas fa-download mr-1"></i> Download</button>
      `;
      fileDiv.querySelector(".download-btn").addEventListener("click", () => {
        trackEvent(appId, `${gameName} - ${file.type}`);
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

  // ========== ZIP DOWNLOAD ==========
  document
    .getElementById("downloadAllZipBtn")
    .addEventListener("click", async () => {
      if (currentFiles && currentFiles.length > 0 && currentSelectedGame) {
        trackEvent(
          currentSelectedGame.appId,
          currentSelectedGame.gameName + " (ZIP)",
        );
        if (typeof JSZip === "undefined") {
          alert("Loading ZIP library, please try again...");
          return;
        }
        const zipBtn = document.getElementById("downloadAllZipBtn");
        zipBtn.disabled = true;
        zipBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Zipping...';

        const zip = new JSZip();
        for (const file of currentFiles) {
          if (file.blob) {
            const content = await file.blob.text();
            zip.file(file.name, content);
          } else if (file.url) {
            try {
              const response = await fetch(file.url);
              const blob = await response.blob();
              zip.file(file.name, blob);
            } catch (e) {}
          }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const downloadUrl = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${currentSelectedGame.gameName.replace(/[^a-z0-9]/gi, "_")}_T9.zip`;
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
    });

  // ========== LEGACY ARCHIVE CHECK LOGIC ==========
  const legacyTerminalOutput = document.getElementById("legacyTerminalOutput");

  async function typeLegacyText(text) {
    for (let i = 0; i < text.length; i++) {
      legacyTerminalOutput.textContent += text.charAt(i);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async function legacyCheckManifest() {
    const gameId = mainSearchInput.value.trim();
    if (!gameId || !/^\d+$/.test(gameId)) {
      alert("Please enter a valid Steam AppID (numbers only)");
      return;
    }

    legacyCheckBtn.disabled = true;
    legacyCheckBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> Checking';
    legacyResultsSection.classList.remove("hidden");
    document.getElementById("legacyDownloadSection").classList.add("hidden");
    document.getElementById("legacyNotFoundSection").classList.add("hidden");
    legacyTerminalOutput.textContent = "";

    await typeLegacyText(
      `> Initiating manifest check for Steam AppID: ${gameId}\n`,
    );
    await typeLegacyText(`> Searching GitHub repository...\n`);

    try {
      // Source: SSMGAlt/ManifestHub2 (Legacy Archive)
      // Purpose: Checks if the branch exists for the requested Legacy AppID.
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/ManifestHub2/branches/${gameId}`,
      );
      if (response.status === 200) {
        await typeLegacyText(`> ✅ Manifest found in database!\n`);
        const gameName = appNames[parseInt(gameId)] || "Unknown Game";
        // Source: SSMGAlt/ManifestHub2 (Legacy Archive)
        // Purpose: URL to download the specific legacy archive zip.
        const githubUrl = `https://codeload.github.com/${REPO_OWNER}/ManifestHub2/zip/refs/heads/${gameId}`;

        const dl = document.getElementById("legacyDownloadLink");
        dl.href = githubUrl;
        dl.target = "_blank";

        // Add one-time click listener for tracking
        dl.onclick = () => {
          trackEvent(gameId, gameName + " (Legacy)");
        };

        document
          .getElementById("legacyDownloadSection")
          .classList.remove("hidden");
        legacyCheckBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Check';
      } else {
        await typeLegacyText(`> ❌ Manifest not found in GitHub archive.\n`);
        document
          .getElementById("legacyNotFoundSection")
          .classList.remove("hidden");
        legacyCheckBtn.innerHTML = "Check Again";
      }
    } catch (error) {
      await typeLegacyText(`> ⚠️ Error checking manifest.\n`);
      legacyCheckBtn.innerHTML = "Check Again";
    }
    legacyCheckBtn.disabled = false;
  }
  legacyCheckBtn.addEventListener("click", legacyCheckManifest);

  /*
  // ========== REQUEST FORM HANDLING ==========
  const requestAccordionBtn = document.getElementById("requestAccordionBtn");
  const requestFormContainer = document.getElementById("requestFormContainer");
  const accordionIcon = document.getElementById("accordionIcon");
  const requestForm = document.getElementById("requestForm");
  const submitRequestBtn = document.getElementById("submitRequestBtn");
  const formFeedback = document.getElementById("formFeedback");
  const cooldownContainer = document.getElementById("cooldownContainer");
  const cooldownSeconds = document.getElementById("cooldownSeconds");
  const appIdField = document.getElementById("appid");
  let cooldownUntil = 0;
  const COOLDOWN_SECONDS = 60;

  if (requestAccordionBtn) {
    requestAccordionBtn.addEventListener("click", function () {
      requestFormContainer.classList.toggle("hidden");
      if (requestFormContainer.classList.contains("hidden")) {
        accordionIcon.style.transform = "rotate(0deg)";
      } else {
        accordionIcon.style.transform = "rotate(180deg)";
        setTimeout(() => appIdField.focus(), 100);
      }
    });
  }

  function isGameBlacklisted(appId) {
    return blacklistedGames.some(game => game.appId === appId.toString().trim());
  }
  function getBlacklistedGameInfo(appId) {
    return blacklistedGames.find(game => game.appId === appId.toString().trim());
  }
  function isGameAlreadyRequested(appId) {
    return requestedGames.some(game => game.appId === appId.toString().trim());
  }
  function getRequestedGameInfo(appId) {
    return requestedGames.find(game => game.appId === appId.toString().trim());
  }

  function updateCooldown() {
    const now = Date.now();
    if (cooldownUntil > now) {
      const remaining = Math.ceil((cooldownUntil - now) / 1000);
      if (cooldownSeconds) cooldownSeconds.textContent = remaining;
      if (cooldownContainer) cooldownContainer.classList.remove("hidden");
      if (submitRequestBtn) {
        submitRequestBtn.disabled = true;
        submitRequestBtn.style.opacity = "0.5";
      }
      setTimeout(updateCooldown, 1000);
    } else {
      if (cooldownContainer) cooldownContainer.classList.add("hidden");
      if (submitRequestBtn) {
        submitRequestBtn.disabled = false;
        submitRequestBtn.style.opacity = "1";
      }
    }
  }

  function startCooldown() {
    cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;
    updateCooldown();
  }

  if (requestForm) {
    requestForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      formFeedback.textContent = "";
      formFeedback.style.color = "#8b949e";

      const appId = appIdField.value.trim();
      const gameName = document.getElementById("gamename").value.trim();

      if (!appId || !gameName) {
        formFeedback.textContent = "❌ Both fields are required.";
        formFeedback.style.color = "#f85149";
        return;
      }

      if (isGameBlacklisted(appId)) {
        const blacklistedInfo = getBlacklistedGameInfo(appId);
        const blacklistedName = blacklistedInfo ? blacklistedInfo.name : gameName;
        document.getElementById("unsupportedGameMessage").innerHTML = `The game <span style="font-weight:700;color:#d29922;">"${blacklistedName}" (AppID: ${appId})</span> is not supported.`;
        unsupportedModal.classList.remove("hidden");
        formFeedback.textContent = "❌ This game is blacklisted.";
        formFeedback.style.color = "#f85149";
        return;
      }

      if (isGameAlreadyRequested(appId)) {
        const requestedInfo = getRequestedGameInfo(appId);
        const requestedName = requestedInfo ? requestedInfo.name : gameName;
        document.getElementById("requestedGameMessage").innerHTML = `The game <span style="font-weight:700;color:#58a6ff;">"${requestedName}" (AppID: ${appId})</span> has already been requested.`;
        requestedModal.classList.remove("hidden");
        formFeedback.textContent = "ℹ️ This game has already been requested.";
        formFeedback.style.color = "#58a6ff";
        return;
      }

      const originalText = submitRequestBtn.innerHTML;
      submitRequestBtn.disabled = true;
      submitRequestBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';

      try {
        const response = await fetch(requestForm.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId, gameName }),
        });

        const result = await response.json();
        if (response.ok && result.status === "success") {
          formFeedback.textContent = "✅ Request sent successfully!";
          formFeedback.style.color = "#3fb950";
          requestForm.reset();
          startCooldown();
        } else {
          formFeedback.textContent = "❌ Failed to send request.";
          formFeedback.style.color = "#f85149";
        }
      } catch (error) {
        formFeedback.textContent = "❌ Network error. Please try again.";
        formFeedback.style.color = "#f85149";
      } finally {
        if (cooldownUntil <= Date.now()) {
          submitRequestBtn.disabled = false;
        }
        submitRequestBtn.innerHTML = originalText;
      }
    });
  }
  */

  async function loadTrendingDownloads() {
    const grid = document.getElementById("trendingGrid");
    if (!grid) return;
    try {
      const response = await fetch("data/trending-data.json");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      
      if (!data || data.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-github-muted text-center py-4">No trending data available.</div>';
        return;
      }

      grid.innerHTML = "";
      // Show only top 10 items
      const topItems = data.slice(0, 10);
      
      topItems.forEach((item) => {
        let name = item.gameName;
        // Fallback to local catalog if the sheet name is missing or "Unknown Game"
        if ((!name || name.toLowerCase() === "unknown game") && appNames[item.appId]) {
          name = appNames[item.appId];
        }
        
        if (name) {
          name = escapeHtml(name);
        } else {
          name = "App ID " + item.appId;
        }

        const formattedCount = parseInt(item.count).toLocaleString();

        const card = document.createElement("div");
        card.className = "flex items-center gap-3 bg-[#161b22] border border-[#30363d] rounded-md p-2 cursor-pointer hover:border-[#8b949e] transition-all hover:scale-[1.02] duration-200";
        card.innerHTML = `
          <img class="w-[60px] h-[35px] object-cover rounded bg-[#0d1117] flex-shrink-0" src="https://cdn.akamai.steamstatic.com/steam/apps/${item.appId}/capsule_184x69.jpg" alt="${name}" onerror="this.src='assets/mhub.png'; this.className='w-6 h-6 object-contain flex-shrink-0'">
          <div class="flex flex-col min-w-0 flex-grow">
            <strong class="text-xs font-semibold truncate" style="color: #c9d1d9;" title="${name}">${name}</strong>
            <span class="text-[0.65rem] text-github-muted flex items-center gap-1 mt-0.5">
              <i class="fas fa-download"></i> ${formattedCount}
            </span>
          </div>
        `;

        card.addEventListener("click", () => {
          mainSearchInput.value = name;
          displayGameFiles(item.appId, name);
          const selectPanel = document.getElementById("selectedGamePanel");
          if (selectPanel) selectPanel.scrollIntoView({ behavior: "smooth" });
        });

        grid.appendChild(card);
      });
    } catch (err) {
      console.warn("Failed to load trending downloads:", err);
      grid.innerHTML = '<div class="col-span-full text-github-muted text-center py-4">Could not load trending downloads.</div>';
    }
  }

  // ========== INIT ==========
  loadFAQ();
  loadDepotKeys().then(() => loadAppLists().then(() => loadTrendingDownloads()));
});
