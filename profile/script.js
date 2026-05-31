const SUPABASE_URL = "https://fbmlbukvzyrzevjmaujp.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibWxidWt2enlyemV2am1hdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM3NDMsImV4cCI6MjA5MzkxOTc0M30.HXnKhqT8Gq8WFUxqOsofjE-dSC9Oo4Yem8FTANUnX30";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let isLoginMode = true;

// ===== AUTH MODAL =====
function openAuthModal(mode) {
  isLoginMode = mode === "login";
  updateAuthModalMode();
  document.getElementById("authModal").classList.remove("hidden");
}

function updateAuthModalMode() {
  const isLogin = isLoginMode;
  const displayNameGroup = document.getElementById("displayNameGroup");
  document.getElementById("authTitle").textContent = isLogin ? "Sign In" : "Sign Up";
  document.getElementById("authSubmitBtn").textContent = isLogin ? "Sign In" : "Sign Up";
  const switchText = document.getElementById("authSwitchText");
  const switchBtn = document.getElementById("authSwitchBtn");
  if (switchText) switchText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
  if (switchBtn) switchBtn.textContent = isLogin ? "Sign Up" : "Sign In";
  if (displayNameGroup) {
    if (isLogin) displayNameGroup.classList.add("hidden");
    else displayNameGroup.classList.remove("hidden");
  }
  document.getElementById("authError").classList.add("hidden");
}

const switchBtn = document.getElementById("authSwitchBtn");
if (switchBtn) {
  switchBtn.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
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

  if (isLoginMode) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    error = result.error;
  } else {
    const displayName = document.getElementById("authDisplayName")?.value || "";
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    error = result.error;
  }

  if (error) {
    console.error("Auth Error:", error);
    errEl.textContent = error.message;
    errEl.classList.remove("hidden");
  } else {
    document.getElementById("authModal").classList.add("hidden");
  }
  btn.disabled = false;
  btn.textContent = isLoginMode ? "Sign In" : "Sign Up";
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

// ===== LOAD HISTORY =====
async function loadHistory(user) {
  const tbody = document.getElementById("historyTableBody");
  const meta = document.getElementById("historyMeta");
  if (!tbody || !meta) return;
  try {
    const { data, error } = await supabase
      .from("download_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    meta.textContent = `${data.length} download${data.length !== 1 ? "s" : ""} total`;

    if (data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No downloads yet. Go search for a game!</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    data.forEach((item) => {
      const tr = document.createElement("tr");
      const date = new Date(item.created_at).toLocaleString();
      tr.innerHTML = `
        <td style="font-weight:500;">${escHtml(item.game_name || "Unknown")}</td>
        <td style="color:#8b949e;">${escHtml(item.type || "Download")}</td>
        <td style="color:#8b949e;font-size:0.8rem;">${date}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3" style="color:#f85149;">Could not load history.</td></tr>';
    meta.textContent = "";
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
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    if (session?.user) showProfile(session.user);
  } else if (event === "SIGNED_OUT") {
    showAuthGate();
  }
});
