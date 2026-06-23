document.addEventListener("DOMContentLoaded", function () {
const SUPABASE_URL = "https://fbmlbukvzyrzevjmaujp.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibWxidWt2enlyemV2am1hdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM3NDMsImV4cCI6MjA5MzkxOTc0M30.HXnKhqT8Gq8WFUxqOsofjE-dSC9Oo4Yem8FTANUnX30";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let authMode = "login"; // "login", "signup", "forgot"

// ===== AUTH MODAL =====
function openAuthModal(mode) {
  authMode = mode;
  updateAuthModalMode();
  document.getElementById("authModal").classList.remove("hidden");
}

function updateAuthModalMode() {
  const displayNameGroup = document.getElementById("displayNameGroup");
  const passwordInput = document.getElementById("authPassword");
  const passwordGroup = passwordInput?.closest(".auth-input-group");
  const forgotPasswordWrap = document.getElementById("forgotPasswordWrap");
  const authTitle = document.getElementById("authTitle");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const switchText = document.getElementById("authSwitchText");
  const switchBtn = document.getElementById("authSwitchBtn");

  document.getElementById("authError").classList.add("hidden");

  if (authMode === "login") {
    authTitle.textContent = "Sign In";
    authSubmitBtn.textContent = "Sign In";
    if (displayNameGroup) displayNameGroup.classList.add("hidden");
    if (passwordGroup) passwordGroup.classList.remove("hidden");
    if (forgotPasswordWrap) forgotPasswordWrap.classList.remove("hidden");
    if (passwordInput) passwordInput.required = true;
    if (switchText) switchText.textContent = "Don't have an account?";
    if (switchBtn) switchBtn.textContent = "Sign Up";
  } else if (authMode === "signup") {
    authTitle.textContent = "Sign Up";
    authSubmitBtn.textContent = "Sign Up";
    if (displayNameGroup) displayNameGroup.classList.remove("hidden");
    if (passwordGroup) passwordGroup.classList.remove("hidden");
    if (forgotPasswordWrap) forgotPasswordWrap.classList.add("hidden");
    if (passwordInput) passwordInput.required = true;
    if (switchText) switchText.textContent = "Already have an account?";
    if (switchBtn) switchBtn.textContent = "Sign In";
  } else if (authMode === "forgot") {
    authTitle.textContent = "Reset Password";
    authSubmitBtn.textContent = "Send reset email";
    if (displayNameGroup) displayNameGroup.classList.add("hidden");
    if (passwordGroup) passwordGroup.classList.add("hidden");
    if (forgotPasswordWrap) forgotPasswordWrap.classList.add("hidden");
    if (passwordInput) passwordInput.required = false;
    if (switchText) switchText.textContent = "Remember your password?";
    if (switchBtn) switchBtn.textContent = "Sign In";
  }
}

const switchBtn = document.getElementById("authSwitchBtn");
if (switchBtn) {
  switchBtn.addEventListener("click", () => {
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

document.getElementById("closeAuthModal").addEventListener("click", () => {
  document.getElementById("authModal").classList.add("hidden");
});

document.getElementById("gateLoginBtn").addEventListener("click", () => openAuthModal("login"));
document.getElementById("gateSignupBtn").addEventListener("click", () => openAuthModal("signup"));

document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("authSubmitBtn");
  const errEl = document.getElementById("authError");
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Please wait...";

  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  let error = null;

  if (authMode === "login") {
    const result = await supabase.auth.signInWithPassword({ email, password });
    error = result.error;
  } else if (authMode === "signup") {
    const displayName = document.getElementById("authDisplayName")?.value || "";
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    error = result.error;
  } else if (authMode === "forgot") {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/profile",
    });
    error = result.error;
    if (!error) {
      alert("Password reset email sent! Check your inbox.");
      document.getElementById("authModal").classList.add("hidden");
    }
  }

  if (error) {
    console.error("Auth Error:", error);
    errEl.textContent = error.message;
    errEl.classList.remove("hidden");
  } else if (authMode !== "forgot") {
    document.getElementById("authModal").classList.add("hidden");
  }
  btn.disabled = false;
  btn.textContent = authMode === "login" ? "Sign In" : (authMode === "signup" ? "Sign Up" : "Send reset email");
});

// ===== TAB SWITCHING =====
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

if (window.location.hash === "#history") {
  document.querySelector('[data-tab="history"]').click();
}

// ===== RENDER HISTORY TABLE =====
function renderHistoryTable(items, dbErrorOccurred = false) {
  const tbody = document.getElementById("historyTableBody");
  const meta = document.getElementById("historyMeta");
  if (!tbody || !meta) return;

  meta.textContent = `${items.length} download${items.length !== 1 ? "s" : ""} total`;

  if (items.length === 0) {
    if (dbErrorOccurred) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3" style="color:#f85149;">Could not load history.</td></tr>';
      meta.textContent = "";
    } else {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No downloads yet. Go search for a game!</td></tr>';
    }
    return;
  }

  tbody.innerHTML = "";
  items.forEach((item) => {
    const tr = document.createElement("tr");
    const date = new Date(item.created_at).toLocaleString();
    tr.innerHTML = `
      <td style="font-weight:500;">${escHtml(item.game_name || "Unknown")}</td>
      <td style="color:#8b949e;">${escHtml(item.type || "Download")}</td>
      <td style="color:#8b949e;font-size:0.8rem;">${date}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== LOAD HISTORY =====
async function loadHistory(user) {
  const tbody = document.getElementById("historyTableBody");
  const meta = document.getElementById("historyMeta");
  if (!tbody || !meta) return;

  const cacheKey = `download_history_${user.id}`;
  let cachedData = null;
  try {
    const rawCache = localStorage.getItem(cacheKey);
    if (rawCache) {
      cachedData = JSON.parse(rawCache);
    }
  } catch (err) {
    console.error("Cache load error:", err);
  }

  // 1. Render cache immediately if it exists
  if (cachedData && Array.isArray(cachedData)) {
    renderHistoryTable(cachedData);
    meta.innerHTML = `${cachedData.length} download${cachedData.length !== 1 ? "s" : ""} total <span style="color:#8b949e; font-size: 0.8rem; margin-left: 8px;"><i class="fas fa-spinner fa-spin"></i> Checking for updates...</span>`;
  } else {
    // If no cache, show main table loading state
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3"><i class="fas fa-spinner spinner"></i> Loading...</td></tr>';
    meta.textContent = "Loading your downloads...";
  }

  // 2. Fetch fresh data in the background
  try {
    let dbData = [];
    let dbErrorOccurred = false;
    try {
      const { data, error } = await supabase
        .from("download_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      dbData = data || [];
    } catch (dbErr) {
      console.error("Failed to load Supabase history:", dbErr);
      dbErrorOccurred = true;
    }

    let sheetData = [];
    try {
      const sheetRes = await fetch("https://manifesthub-bridge.trionine.workers.dev/?history=true");
      if (sheetRes.ok) {
        sheetData = await sheetRes.json();
      }
    } catch (sheetErr) {
      console.error("Failed to load Google Sheet history:", sheetErr);
    }

    // Merge lists without duplicates
    let merged = [...dbData];
    if (Array.isArray(sheetData)) {
      sheetData.forEach((sheetItem) => {
        const sheetTime = new Date(sheetItem.created_at).getTime();
        const isDuplicate = dbData.some((dbItem) => {
          const dbTime = new Date(dbItem.created_at).getTime();
          const sameGame = dbItem.game_name === sheetItem.game_name || dbItem.game_id === sheetItem.game_id;
          const sameType = dbItem.type === sheetItem.type;
          const closeTime = Math.abs(dbTime - sheetTime) < 120000; // within 2 minutes
          return sameGame && sameType && closeTime;
        });
        if (!isDuplicate) {
          merged.push(sheetItem);
        }
      });
    }

    // Sort by date descending
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Only update UI if the data changed or if there is no cache
    const shouldUpdate = !cachedData || JSON.stringify(cachedData) !== JSON.stringify(merged) || dbErrorOccurred;

    if (shouldUpdate) {
      renderHistoryTable(merged, dbErrorOccurred);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(merged));
      } catch (cacheWriteErr) {
        console.error("Failed to write history cache:", cacheWriteErr);
      }
    } else {
      // Clear the "Checking for updates..." spinner if data is unchanged
      meta.textContent = `${merged.length} download${merged.length !== 1 ? "s" : ""} total`;
    }
  } catch (e) {
    // If no cache, show error state
    if (!cachedData) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3" style="color:#f85149;">Could not load history.</td></tr>';
      meta.textContent = "";
    }
    console.error(e);
  }
}

// ===== UPDATE UI based on session =====
function showProfile(user) {
  currentUser = user;
  document.getElementById("authGate").style.display = "none";
  document.getElementById("profileContent").style.display = "block";

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
  const initials = displayName[0].toUpperCase();
  document.getElementById("avatarCircle").textContent = initials;
  document.getElementById("profileDisplayName").textContent = displayName;
  document.getElementById("profileEmail").textContent = user.email;
  document.getElementById("settingsEmail").textContent = user.email;
  document.getElementById("settingsDisplayName").textContent = displayName;

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : "";
  document.getElementById("profileMeta").textContent = joinDate
    ? `Member since ${joinDate}`
    : "ManifestHub Member";

  document.getElementById("updateNameBtn").onclick = async () => {
    const newName = prompt("Enter your new display name:", displayName);
    if (newName !== null && newName !== displayName) {
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: newName } });
      if (error) alert(error.message);
      else { alert("Display name updated!"); showProfile(data.user); }
    }
  };

  document.getElementById("changePasswordBtn").onclick = async () => {
    const newPassword = prompt("Enter your new password:");
    if (newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) alert(error.message);
      else alert("Password updated successfully!");
    }
  };

  loadHistory(user);
}

function showAuthGate() {
  currentUser = null;
  document.getElementById("authGate").style.display = "block";
  document.getElementById("profileContent").style.display = "none";
}

// Sign out buttons
document.getElementById("signOutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
});
document.getElementById("signOutEverywhereBtn").addEventListener("click", async () => {
  if (confirm("Sign out from all sessions?")) {
    await supabase.auth.signOut({ scope: "global" });
  }
});

// Helper
function escHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Initial session check — getSession() is the authoritative source
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    showProfile(session.user);
  } else {
    showAuthGate();
  }
})();

// Handle subsequent auth changes (sign in / sign out after page load)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    const newPassword = prompt("Enter your new password to reset it:");
    if (newPassword) {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        alert("Error resetting password: " + error.message);
      } else {
        alert("Password updated successfully! You are now logged in.");
        showProfile(data.user);
      }
    }
  } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    if (session?.user) showProfile(session.user);
  } else if (event === "SIGNED_OUT") {
    showAuthGate();
  }
});
});
