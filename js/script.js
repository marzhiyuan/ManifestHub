// =============================================================
// script.js — Homepage Controller
// =============================================================
// [00]  SUPABASE SETUP + LIVE VIEWER COUNT
// [01]  AUTH MODAL & LOGIC
// [02]  DISCLAIMER MODAL
// [03]  FAQ ACCORDION
// [04]  GLOBAL DATA & UTILITIES
// [05]  DATABASE INIT (Apps, Names, Depot Keys, Trending)
// [06]  SEARCH ENGINE SWITCHER
// [07]  DISPLAY GAME FILES + DOWNLOAD BUTTONS
// [08]  ZIP DOWNLOAD
// [09]  LEGACY ARCHIVE CHECK
// [10]  TRENDING DOWNLOADS
// [10.5] ANNOUNCEMENT ROTATOR
// [11]  COMMUNITY POLL WIDGET
// [12]  INIT
// =============================================================

document.addEventListener("DOMContentLoaded", function () {
  // [00] SUPABASE SETUP ==========
  const supabaseUrl = window.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_ANON_KEY;
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  let currentUser = null;

  // [00] LIVE VIEWER COUNT ==========
  // Replace the channel config key with a stable per-session ID
  let sessionId = sessionStorage.getItem("mhub_sid");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("mhub_sid", sessionId);
  }

  const presenceChannel = supabase.channel("site-presence", {
    config: { presence: { key: sessionId } },
  });

  let rafId = null;
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const count = Object.keys(presenceChannel.presenceState()).length;
        const el = document.getElementById("viewerCountNum");
        if (el) el.textContent = count;
        rafId = null;
      });
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ joined_at: Date.now() });
      }
    });

  window.addEventListener("beforeunload", () => {
    presenceChannel.untrack();
  });

  // [01] AUTH MODAL & LOGIC ==========
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
      if (authSwitchText)
        authSwitchText.textContent = "Already have an account?";
      if (authSwitchBtn) authSwitchBtn.textContent = "Sign In";
    } else if (authMode === "forgot") {
      authTitle.textContent = "Reset Password";
      authSubmitBtn.textContent = "Send reset email";
      if (displayNameGroup) displayNameGroup.classList.add("hidden");
      if (passwordGroup) passwordGroup.classList.add("hidden");
      if (forgotPasswordWrap) forgotPasswordWrap.classList.add("hidden");
      if (passwordInput) passwordInput.required = false;
      if (authSwitchText)
        authSwitchText.textContent = "Remember your password?";
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
      authError.style.color = ""; // Reset to default error color before each attempt
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
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        });
        error = signUpError;
        if (!error && signUpData && !signUpData.session) {
          window.handleSignupConfirmation(authError, email, authSubmitBtn, supabase);
          return;
        }
      } else if (authMode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: window.location.origin + "/profile",
          },
        );
        error = resetError;
        if (!error) {
          alert("Password reset email sent! Check your inbox.");
          authModal.classList.add("hidden");
        }
      }

      if (error) {
        console.error("Auth Error:", error);
        // Friendlier message for unconfirmed email
        if (error.message === "Email not confirmed") {
          window.handleUnconfirmedEmail(authError, "authEmail", supabase);
        } else {
          authError.textContent = error.message;
          authError.classList.remove("hidden");
        }
      } else if (authMode !== "forgot") {
        authModal.classList.add("hidden");
      }
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent =
        authMode === "login"
          ? "Sign In"
          : authMode === "signup"
            ? "Sign Up"
            : "Send reset email";
    });
  }

  // Registered once — closes the user dropdown when clicking anywhere outside it.
  // Uses AbortController so the old listener is removed if auth state changes.
  let _dropdownListenerController = null;

  function updateAuthUI() {
    const authSection = document.getElementById("authSection");

    if (currentUser) {
      const displayName =
        currentUser.user_metadata?.display_name ||
        currentUser.email?.split("@")[0] ||
        "User";
      const initials = displayName[0].toUpperCase();
      authSection.innerHTML = `
        <div class="user-menu-wrap">
          <button id="userMenuBtn" class="user-menu-btn">
            <div class="user-menu-avatar">${initials}</div>
            <span>${displayName}</span>
            <i class="fas fa-chevron-down user-menu-chevron"></i>
          </button>
          <div id="userDropdown" class="user-dropdown hidden">
            <div class="user-dropdown-header">Signed in as<br><strong class="user-dropdown-email">${currentUser.email}</strong></div>
            <a href="profile" class="user-dropdown-link"><i class="fas fa-user user-dropdown-icon"></i> Your Profile</a>
            <div class="user-dropdown-divider">
              <button id="logoutBtn" class="user-dropdown-btn"><i class="fas fa-sign-out-alt user-dropdown-icon"></i> Sign out</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById("userMenuBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("userDropdown").classList.toggle("hidden");
      });

      // Remove any previous document-level listener before adding a new one
      if (_dropdownListenerController) _dropdownListenerController.abort();
      _dropdownListenerController = new AbortController();
      document.addEventListener(
        "click",
        () => {
          const dd = document.getElementById("userDropdown");
          if (dd) dd.classList.add("hidden");
        },
        { signal: _dropdownListenerController.signal },
      );

      document
        .getElementById("logoutBtn")
        .addEventListener("click", async () => {
          await supabase.auth.signOut();
        });
    } else {
      authSection.innerHTML = `
        <button id="loginBtn" class="btn-secondary auth-btn-small">Sign in</button>
        <button id="signupBtn" class="btn-primary auth-btn-small">Sign up</button>
      `;
      document
        .getElementById("loginBtn")
        .addEventListener("click", () => openAuthModal("login"));
      document
        .getElementById("signupBtn")
        .addEventListener("click", () => openAuthModal("signup"));
    }
  }

  // Re-render UI and poll widget on every auth state change (login, logout, token refresh)
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    initializePollWidget();
  });

  // [02] MODALS ==========
  const disclaimerModal = document.getElementById("disclaimerModal");

  // Show disclaimer on first visit; suppressed permanently if user checks "Don't show again"
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

  // [03] LOAD FAQ ==========
  async function loadFAQ() {
    try {
      const response = await fetch("/data/faq.json");
      if (response.ok) {
        const faqs = await response.json();
        const container = document.getElementById("faqContainer");
        faqs.forEach((faq) => {
          const item = document.createElement("div");
          item.className = "faq-item";
          item.innerHTML = `
            <div class="faq-question">
              <span>${window.escapeHtml(faq.question)}</span>
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

  // [04] GLOBAL DATA & UTILITIES ==========
  const WORKER_URL = "https://manifesthub-bridge.trionine.workers.dev/";
  const REPO_OWNER = "SSMGAlt";

  let depotKeys = {};
  let appNames = {};
  let appTypes = {};
  let appDepots = {};
  let searchable = [];
  let denuvoAppIds = new Set();

  // Debounce window: ignore repeated download signals for the same item within 30 seconds.
  // Prevents double-counting when a user clicks a download button multiple times rapidly.
  const TRACK_DEBOUNCE_MS = 30_000;

  const _debounceMap = JSON.parse(sessionStorage.getItem("_dm") || "{}");

  async function trackEvent(appId, name) {
    const now = Date.now();
    const key = `${appId}:${name}`;
    const last = _debounceMap[key];
    if (last && now - last < TRACK_DEBOUNCE_MS) return;
    _debounceMap[key] = now;
    sessionStorage.setItem("_dm", JSON.stringify(_debounceMap));

    const sessionUserId = currentUser?.id || "";
    fetch(
      `${WORKER_URL}?download=${appId}&name=${encodeURIComponent(name)}&uid=${sessionUserId}`,
      { method: "GET", mode: "no-cors" },
    ).catch((err) => console.error("Worker signal error:", err));
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

  // [05] DATABASE INIT ==========
  async function initializeDatabase() {
    updateStatus("Initializing database...");

    const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

    async function fetchCachedJson(url, maxAgeMs = CACHE_DURATION) {
      if (!('caches' in window)) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }
      try {
        const cache = await caches.open('manifesthub-db-cache');
        const cachedResponse = await cache.match(url);
        const lastFetch = localStorage.getItem('cache-time-' + url);
        if (cachedResponse && lastFetch && (Date.now() - parseInt(lastFetch) < maxAgeMs)) {
          return await cachedResponse.json();
        }
      } catch (e) {
        console.warn("Cache read failed, fetching fresh...", e);
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      try {
        const cache = await caches.open('manifesthub-db-cache');
        await cache.put(url, res.clone());
        localStorage.setItem('cache-time-' + url, Date.now().toString());
      } catch (e) {
        console.warn("Cache write failed...", e);
      }
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
          return await fetchCachedJson(base + path);
        } catch (e) {
          /* try next */
        }
      }
      throw new Error("All mirrors failed for " + path);
    }

    try {
      const [depotKeysData, games, dlcs, sw, denuvoData] = await Promise.all([
        // Source: fylsdy/ManifestHub
        // Purpose: Downloads depot keys to locally generate the .lua files.
        fetchCachedJson("https://raw.githubusercontent.com/fylsdy/ManifestHub/main/depotkeys.json"),
        fetchWithFallback("games_appid.json"),
        fetchWithFallback("dlc_appid.json"),
        fetchWithFallback("software_appid.json"),
        fetch("data/denuvo-games.json").then(r => r.json()).catch(() => [])
      ]);

      depotKeys = depotKeysData;
      denuvoAppIds = new Set(denuvoData);
      updateStatus(`Loaded ${Object.keys(depotKeys).length} depot keys`);

      games.forEach((app) => {
        appNames[app.appid] = app.name;
        appTypes[app.appid] = "game";
      });
      dlcs.forEach((app) => {
        appNames[app.appid] = app.name;
        appTypes[app.appid] = "dlc";
      });
      sw.forEach((app) => {
        appNames[app.appid] = app.name;
        appTypes[app.appid] = "software";
      });

      if (Object.keys(appNames).length === 0) {
        updateStatus("Failed to load app lists. Check connection.", true);
        return;
      }

      buildMapping();
      await loadTrendingDownloads();
    } catch (err) {
      console.error("Database initialization failed:", err);
      updateStatus("Failed to initialize database. Check connection.", true);
    }
  }

  function buildMapping() {
    updateStatus("Building app mapping...");
    // Max numeric distance between a depot ID and its parent AppID in the Steam catalog.
    // Steam depot IDs are always numerically close to their parent AppID (empirically within 100).
    const DEPOT_MAP_MAX_DISTANCE = 100;
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
        if (appId - depotId <= DEPOT_MAP_MAX_DISTANCE && appId >= depotId) {
          if (!raw[appId]) raw[appId] = new Set();
          raw[appId].add(depotId);
        }
      }
      if (right >= 0) {
        const appId = sortedAppids[right];
        if (depotId - appId <= DEPOT_MAP_MAX_DISTANCE && depotId >= appId) {
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
    startStatusAnnouncementCarousel(supported);

    // Handle URL query parameters for search routing
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q") || urlParams.get("search");
      const appIdParam = urlParams.get("appid") || urlParams.get("appId");

      if (appIdParam) {
        const appIdNum = parseInt(appIdParam);
        if (appIdNum && appNames[appIdNum]) {
          searchInput.value = appNames[appIdNum];
          displayGameFiles(appIdNum, appNames[appIdNum]);
        } else if (appIdNum) {
          // Switch to legacy check and trigger search
          const searchSelect = document.getElementById("searchEngineSelect");
          if (searchSelect) {
            searchSelect.value = "legacy";
            searchSelect.dispatchEvent(new Event("change"));
          }
          searchInput.value = appIdParam;
          const checkBtn = document.getElementById("legacyCheckBtn");
          if (checkBtn) {
            checkBtn.click();
          }
        }
      } else if (query) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event("input"));
      }
    } catch (e) {
      console.warn("Failed to parse URL query parameters:", e);
    }
  }

  // [06] SEARCH ENGINE SWITCHER ==========
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
          <img class="result-img" src="https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg" alt="${window.escapeHtml(name)}" loading="lazy" onerror="this.style.display='none'">
          <div class="result-info">
            <strong>${window.escapeHtml(name)}</strong>
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

  // [07] DISPLAY GAME FILES ==========
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
    } catch (e) { }
    return [];
  }

  async function checkDenuvoStatus(appId) {
    return denuvoAppIds.has(Number(appId));
  }

  async function displayGameFiles(appId, gameName) {
    currentSelectedGame = { appId, gameName };

    // Reset Denuvo warning and badge
    const denuvoBadge = document.getElementById("denuvoBadge");
    const denuvoWarning = document.getElementById("denuvoWarning");
    if (denuvoBadge) denuvoBadge.classList.add("hidden");
    if (denuvoWarning) denuvoWarning.classList.add("hidden");

    // Check Denuvo status asynchronously
    checkDenuvoStatus(appId).then((hasDenuvo) => {
      if (currentSelectedGame && currentSelectedGame.appId === appId && hasDenuvo) {
        if (denuvoBadge) denuvoBadge.classList.remove("hidden");
        if (denuvoWarning) denuvoWarning.classList.remove("hidden");
      }
    });

    const gameIcon = document.getElementById("selectedGameIcon");
    gameIcon.style.display = "";
    gameIcon.src = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    gameIcon.alt = gameName;
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
    } catch (e) { }

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
            <span class="file-name">${window.escapeHtml(file.name)}</span>
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

  // [08] ZIP DOWNLOAD ==========
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
            } catch (e) { }
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

  // [09] LEGACY ARCHIVE CHECK LOGIC ==========
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

  // [10] TRENDING DOWNLOADS ==========
  async function loadTrendingDownloads() {
    const grid = document.getElementById("trendingGrid");
    if (!grid) return;
    try {
      const response = await fetch(`/data/trending-data.json?v=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      if (!data || data.length === 0) {
        grid.innerHTML =
          '<div class="col-span-full text-github-muted text-center py-4">No trending data available.</div>';
        return;
      }

      grid.innerHTML = "";
      // Show only top 12 items
      const topItems = data.slice(0, 12);

      topItems.forEach((item) => {
        let name = item.gameName;
        if (name) {
          name = name.replace(/\s*\(LUA\)/gi, "").trim();
        }
        // Fallback to local catalog if the sheet name is missing or "Unknown Game"
        if (
          (!name || name.toLowerCase() === "unknown game") &&
          appNames[item.appId]
        ) {
          name = appNames[item.appId];
        }

        if (name) {
          name = window.escapeHtml(name);
        } else {
          name = "App ID " + item.appId;
        }

        const formattedCount = parseInt(item.count).toLocaleString();

        const card = document.createElement("div");
        card.className =
          "flex items-center gap-3 bg-[#161b22] border border-[#30363d] rounded-md p-2 cursor-pointer hover:border-[#8b949e] transition-all hover:scale-[1.02] duration-200";
        card.innerHTML = `
          <img class="w-[60px] h-[35px] object-cover rounded bg-[#0d1117] flex-shrink-0" src="https://cdn.akamai.steamstatic.com/steam/apps/${item.appId}/header.jpg" alt="${name}">
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
      grid.innerHTML =
        '<div class="col-span-full text-github-muted text-center py-4">Could not load trending downloads.</div>';
    }
  }

  // [10.5] ANNOUNCEMENT ROTATOR ==========
  // Cycles between the "Ready!" status and active Supabase announcements every 6 seconds.
  async function startStatusAnnouncementCarousel(supportedCount) {
    const statusText = document.getElementById("statusText");
    if (!statusText) return;

    let activeAnnouncements = [];
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("message")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });

      if (!error && data) {
        activeAnnouncements = data.map(ann => ann.message);
      }
    } catch (e) {
      console.warn("Failed to fetch announcements:", e);
    }

    if (activeAnnouncements.length === 0) return;

    const defaultMsg = `Ready! ${supportedCount.toLocaleString()} supported apps.`;
    const messages = [defaultMsg, ...activeAnnouncements];
    let currentIndex = 0;

    setInterval(() => {
      // Don't cycle if the status box is showing an error (red text)
      if (statusText.style.color) return;

      // Fade out
      statusText.style.opacity = 0;

      setTimeout(() => {
        if (statusText.style.color) {
          statusText.style.opacity = 1;
          return;
        }

        currentIndex = (currentIndex + 1) % messages.length;
        statusText.innerHTML = messages[currentIndex];

        // Fade in
        statusText.style.opacity = 1;
      }, 500); // 500ms matches the CSS transition time
    }, 6000); // Cycle every 6 seconds
  }

  // [11] COMMUNITY POLL WIDGET ==========
  /**
   * Fetches the active poll from Supabase, checks if the current user has
   * already voted, and renders either the voting interface or results view.
   * Re-called on every auth state change.
   */
  async function initializePollWidget() {
    const pollCard = document.getElementById("pollCard");
    const pollQuestionText = document.getElementById("pollQuestionText");
    const pollVoteInterface = document.getElementById("pollVoteInterface");
    const pollOptionsContainer = document.getElementById("pollOptionsContainer");
    const pollAuthWarning = document.getElementById("pollAuthWarning");
    const pollLoginBtn = document.getElementById("pollLoginBtn");
    const pollResultsInterface = document.getElementById("pollResultsInterface");
    const pollResultsContainer = document.getElementById("pollResultsContainer");
    const pollTotalVotes = document.getElementById("pollTotalVotes");
    const pollVoteReceipt = document.getElementById("pollVoteReceipt");

    if (!pollCard) return;

    try {
      // 1. Fetch the active poll from Supabase
      const { data: activePoll, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pollError) {
        console.warn("Failed to fetch active poll from Supabase:", pollError);
        pollCard.classList.add("hidden");
        return;
      }

      if (!activePoll) {
        pollCard.classList.add("hidden");
        return;
      }

      // 2. Fetch all votes for this active poll to calculate totals
      const { data: votesData, error: votesError } = await supabase
        .from("poll_votes")
        .select("vote_option")
        .eq("poll_id", activePoll.id);

      if (votesError) {
        console.warn("Failed to fetch poll votes:", votesError);
      }

      // Map votes in memory
      const votesMap = {};
      activePoll.options.forEach(opt => votesMap[opt] = 0);
      if (votesData) {
        votesData.forEach(v => {
          votesMap[v.vote_option] = (votesMap[v.vote_option] || 0) + 1;
        });
      }

      // 3. Check if the current user has already voted on this poll
      let userVotedOption = null;
      if (currentUser) {
        const { data: userVoteData, error: userVoteError } = await supabase
          .from("poll_votes")
          .select("vote_option")
          .eq("poll_id", activePoll.id)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (!userVoteError && userVoteData) {
          userVotedOption = userVoteData.vote_option;
        }
      }

      // Render active poll UI
      pollCard.classList.remove("hidden");
      pollQuestionText.textContent = activePoll.question;

      if (userVotedOption) {
        renderPollResults(activePoll, votesMap, userVotedOption);
      } else {
        renderPollVoting(activePoll);
      }

      // Setup sign-in warning trigger
      if (pollLoginBtn) {
        pollLoginBtn.onclick = (e) => {
          e.preventDefault();
          if (typeof openAuthModal === "function") {
            openAuthModal("login");
          }
        };
      }

      function renderPollVoting(poll) {
        pollVoteInterface.classList.remove("hidden");
        pollResultsInterface.classList.add("hidden");
        pollOptionsContainer.innerHTML = "";

        // Show login warning if guest
        if (!currentUser) {
          pollAuthWarning.classList.remove("hidden");
        } else {
          pollAuthWarning.classList.add("hidden");
        }

        poll.options.forEach(option => {
          const btn = document.createElement("button");
          btn.className = "poll-option-btn";
          btn.textContent = option;
          btn.disabled = !currentUser; // disabled for guests
          btn.onclick = () => castVote(poll.id, option);
          pollOptionsContainer.appendChild(btn);
        });
      }

      function renderPollResults(poll, vMap, userVotedOption) {
        pollVoteInterface.classList.add("hidden");
        pollResultsInterface.classList.remove("hidden");
        pollResultsContainer.innerHTML = "";

        const total = Object.values(vMap).reduce((sum, count) => sum + count, 0);

        pollTotalVotes.textContent = `${total} vote${total === 1 ? "" : "s"}`;
        if (userVotedOption) {
          pollVoteReceipt.textContent = `You voted: ${userVotedOption}`;
        } else {
          pollVoteReceipt.textContent = "";
        }

        poll.options.forEach(option => {
          const count = vMap[option] || 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          const row = document.createElement("div");
          row.className = "poll-result-row";
          if (option === userVotedOption) {
            row.classList.add("user-voted");
          }

          row.innerHTML = `
            <div class="poll-result-header">
              <span>${window.escapeHtml(option)}</span>
              <strong>${percent}% (${count})</strong>
            </div>
            <div class="poll-result-bar-bg">
              <div class="poll-result-bar-fill" style="width: 0%;"></div>
            </div>
          `;

          pollResultsContainer.appendChild(row);

          // Animate the bar width with a small timeout for render completion
          setTimeout(() => {
            const fill = row.querySelector(".poll-result-bar-fill");
            if (fill) fill.style.width = `${percent}%`;
          }, 50);
        });
      }

      async function castVote(pollId, option) {
        if (!currentUser) return;

        // 1. Submit vote to Supabase
        const { error: castError } = await supabase
          .from("poll_votes")
          .insert([{ poll_id: pollId, user_id: currentUser.id, vote_option: option }]);

        if (castError) {
          console.error("Failed to cast vote in Supabase:", castError);
          if (typeof showToast === "function") {
            showToast("Failed to cast vote: " + castError.message, "error");
          }
          return;
        }

        if (typeof showToast === "function") {
          showToast(`Vote cast for: ${option}!`, "success");
        }

        // 2. Re-initialize widget to fetch latest counts and display results
        initializePollWidget();
      }
    } catch (err) {
      console.error("Error initializing poll widget:", err);
      pollCard.classList.add("hidden");
    }
  }

  // [12] INIT ==========
  loadFAQ();
  initializeDatabase();
  // Note: initializePollWidget() is intentionally NOT called here.
  // It is invoked by onAuthStateChange (above), which fires immediately
  // on page load with the current session, ensuring correct auth context.

  // Wire up the donate address copy button
  const donateCopyBtn = document.getElementById("donateCopyBtn");
  if (donateCopyBtn) {
    donateCopyBtn.addEventListener("click", () => {
      navigator.clipboard
        .writeText("TFErnymvTdBtw9g79QHfuRojjwwA6HEc6B")
        .then(() => {
          donateCopyBtn.textContent = "Copied!";
          setTimeout(() => (donateCopyBtn.textContent = "Copy"), 2000);
        });
    });
  }
});
