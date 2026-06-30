document.addEventListener("DOMContentLoaded", function () {
  const SUPABASE_URL = "https://fbmlbukvzyrzevjmaujp.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibWxidWt2enlyemV2am1hdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM3NDMsImV4cCI6MjA5MzkxOTc0M30.HXnKhqT8Gq8WFUxqOsofjE-dSC9Oo4Yem8FTANUnX30";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser = null;
  let authMode = "login"; // "login", "signup", "forgot"

  // ===== CUSTOM UI HELPERS =====

  let toastTimer = null;
  function showToast(message, type = "success") {
    const toast = document.getElementById("profileToast");
    const icon = document.getElementById("profileToastIcon");
    const msg = document.getElementById("profileToastMsg");
    if (!toast) return;

    toast.className =
      "profile-toast " + (type === "error" ? "toast-error" : "toast-success");
    icon.className =
      "fas " + (type === "error" ? "fa-exclamation-circle" : "fa-check-circle");
    msg.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
  }

  function openProfileModal(id) {
    document.getElementById(id)?.classList.remove("hidden");
  }
  function closeProfileModal(id) {
    document.getElementById(id)?.classList.add("hidden");
  }

  // Generic confirm modal (replaces window.confirm)
  function openCustomConfirm(message, onConfirm) {
    document.getElementById("confirmModalMessage").textContent = message;
    openProfileModal("confirmModal");

    const okBtn = document.getElementById("confirmModalOk");
    const cancelBtn = document.getElementById("confirmModalCancel");

    const cleanup = () => {
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
      closeProfileModal("confirmModal");
    };
    const handleOk = () => {
      cleanup();
      onConfirm();
    };
    const handleCancel = () => cleanup();

    okBtn.addEventListener("click", handleOk);
    cancelBtn.addEventListener("click", handleCancel);
  }

  // Close modals by clicking the backdrop or the × button
  document.querySelectorAll(".profile-modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  });
  document
    .querySelectorAll(".profile-modal-close, .profile-modal-cancel")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.close;
        if (id) closeProfileModal(id);
      });
    });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".profile-modal-overlay:not(.hidden)")
        .forEach((el) => {
          el.classList.add("hidden");
        });
    }
  });

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
      authMode = authMode === "login" ? "signup" : "login";
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

  document
    .getElementById("gateLoginBtn")
    .addEventListener("click", () => openAuthModal("login"));
  document
    .getElementById("gateSignupBtn")
    .addEventListener("click", () => openAuthModal("signup"));

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
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = result.error;
    } else if (authMode === "signup") {
      const displayName =
        document.getElementById("authDisplayName")?.value || "";
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
        document.getElementById("authModal").classList.add("hidden");
        showToast("Password reset email sent! Check your inbox.");
      }
    }

    if (error) {
      console.error("Auth Error:", error);
      // Friendlier message for unconfirmed email
      if (error.message === "Email not confirmed") {
        window.handleUnconfirmedEmail(errEl, "authEmail", supabase);
      } else {
        errEl.textContent = error.message;
        errEl.classList.remove("hidden");
      }
    } else if (authMode !== "forgot") {
      document.getElementById("authModal").classList.add("hidden");
    }

    btn.disabled = false;
    btn.textContent =
      authMode === "login"
        ? "Sign In"
        : authMode === "signup"
          ? "Sign Up"
          : "Send reset email";
  });

  // ===== TAB SWITCHING =====
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-panel")
        .forEach((p) => p.classList.remove("active"));
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
        tbody.innerHTML =
          '<tr class="empty-row"><td colspan="3" style="color:#f85149;">Could not load history.</td></tr>';
        meta.textContent = "";
      } else {
        tbody.innerHTML =
          '<tr class="empty-row"><td colspan="3">No downloads yet. Go search for a game!</td></tr>';
      }
      return;
    }

    tbody.innerHTML = "";
    items.forEach((item) => {
      const tr = document.createElement("tr");
      const date = new Date(item.created_at).toLocaleString();
      const gameLabel = item.game_name
        ? item.game_name
        : `App ${item.app_id || "Unknown"}`;
      tr.innerHTML = `
      <td style="font-weight:500;">${escHtml(gameLabel)}</td>
      <td style="color:#8b949e;">${escHtml(item.type || "Download")}</td>
      <td style="color:#8b949e;font-size:0.8rem;">${date}</td>
    `;
      tbody.appendChild(tr);
    });
  }

  async function loadHistory(user) {
    const tbody = document.getElementById("historyTableBody");
    const meta = document.getElementById("historyMeta");
    if (!tbody || !meta) return;

    const cacheKey = `download_history_${user.id}`;
    let cachedData = null;
    try {
      const rawCache = localStorage.getItem(cacheKey);
      if (rawCache) cachedData = JSON.parse(rawCache);
    } catch (err) {
      console.error("Cache load error:", err);
    }

    if (cachedData && Array.isArray(cachedData)) {
      renderHistoryTable(cachedData);
      meta.innerHTML = `${cachedData.length} download${cachedData.length !== 1 ? "s" : ""} total <span style="color:#8b949e; font-size:0.8rem; margin-left:8px;"><i class="fas fa-spinner fa-spin"></i> Checking for updates...</span>`;
    } else {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="3"><i class="fas fa-spinner spinner"></i> Loading...</td></tr>';
      meta.textContent = "Loading your downloads...";
    }

    try {
      let dbData = [];
      let dbErrorOccurred = false;

      try {
        const { data: historyData, error: historyError } = await supabase
          .from("download_history")
          .select("created_at, download_type, app_id, game_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (historyError) throw historyError;

        dbData = (historyData || []).map((row) => ({
          created_at: row.created_at,
          type: row.download_type,
          app_id: row.app_id,
          game_name: row.game_name || null,
        }));

        localStorage.setItem(cacheKey, JSON.stringify(dbData));
      } catch (dbErr) {
        console.error("Failed to load production Supabase history:", dbErr);
        dbErrorOccurred = true;
      }

      const shouldUpdate = !cachedData || JSON.stringify(cachedData) !== JSON.stringify(dbData) || dbErrorOccurred;
      if (shouldUpdate) {
        renderHistoryTable(dbData, dbErrorOccurred);
      } else {
        meta.textContent = `${dbData.length} download${dbData.length !== 1 ? "s" : ""} total`;
      }
    } catch (e) {
      if (!cachedData) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3" style="color:#f85149;">Could not load history.</td></tr>';
        meta.textContent = "";
      }
      console.error(e);
    }
  }

  // ===== UPDATE DISPLAY NAME MODAL =====
  function setupUpdateNameModal(displayName) {
    const btn = document.getElementById("updateNameBtn");
    const nameInput = document.getElementById("newDisplayNameInput");
    let confirmBtn = document.getElementById("confirmUpdateNameBtn");

    btn.onclick = () => {
      nameInput.value = displayName;
      openProfileModal("updateNameModal");
      setTimeout(() => nameInput.focus(), 50);
    };

    // Replace button to remove stale listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener("click", async () => {
      const newName = nameInput.value.trim();
      if (!newName || newName === displayName) {
        closeProfileModal("updateNameModal");
        return;
      }
      newConfirmBtn.disabled = true;
      newConfirmBtn.textContent = "Saving...";

      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: newName },
      });
      newConfirmBtn.disabled = false;
      newConfirmBtn.textContent = "Save Changes";

      if (error) {
        showToast(error.message, "error");
      } else {
        closeProfileModal("updateNameModal");
        showToast("Display name updated!");
        showProfile(data.user);
      }
    });

    nameInput.onkeydown = (e) => {
      if (e.key === "Enter") newConfirmBtn.click();
    };
  }

  // ===== CHANGE PASSWORD MODAL =====
  function setupChangePasswordModal() {
    const btn = document.getElementById("changePasswordBtn");
    let confirmBtn = document.getElementById("confirmChangePasswordBtn");
    const pwInput = document.getElementById("newPasswordInput");
    const cfInput = document.getElementById("confirmPasswordInput");
    const errEl = document.getElementById("passwordModalError");

    btn.onclick = () => {
      pwInput.value = "";
      cfInput.value = "";
      errEl.classList.add("hidden");
      openProfileModal("changePasswordModal");
      setTimeout(() => pwInput.focus(), 50);
    };

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener("click", async () => {
      const pw = pwInput.value;
      const cf = cfInput.value;

      if (!pw) {
        errEl.textContent = "Please enter a new password.";
        errEl.classList.remove("hidden");
        return;
      }
      if (pw !== cf) {
        errEl.textContent = "Passwords do not match.";
        errEl.classList.remove("hidden");
        return;
      }
      errEl.classList.add("hidden");

      newConfirmBtn.disabled = true;
      newConfirmBtn.textContent = "Updating...";
      const { error } = await supabase.auth.updateUser({ password: pw });
      newConfirmBtn.disabled = false;
      newConfirmBtn.textContent = "Update Password";

      if (error) {
        errEl.textContent = error.message;
        errEl.classList.remove("hidden");
      } else {
        closeProfileModal("changePasswordModal");
        showToast("Password updated successfully!");
      }
    });
  }

  // ===== SHOW / HIDE PROFILE =====
  function showProfile(user) {
    currentUser = user;
    document.getElementById("authGate").style.display = "none";
    document.getElementById("profileContent").style.display = "block";

    const displayName =
      user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
    document.getElementById("avatarCircle").textContent =
      displayName[0].toUpperCase();
    document.getElementById("profileDisplayName").textContent = displayName;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("settingsEmail").textContent = user.email;
    document.getElementById("settingsDisplayName").textContent = displayName;

    const joinDate = user.created_at
      ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
      : "";
    document.getElementById("profileMeta").textContent = joinDate
      ? `Member since ${joinDate}`
      : "ManifestHub Member";

    setupUpdateNameModal(displayName);
    setupChangePasswordModal();
    loadHistory(user);

    // Check if user is an admin dynamically to avoid leaking emails in the public repository
    (async () => {
      try {
        const { data, error } = await supabase
          .from("admins")
          .select("email")
          .eq("email", user.email)
          .maybeSingle();

        if (!error && data) {
          document.getElementById("adminTabBtn")?.classList.remove("hidden");
          setupAdminPanel(user);
        } else {
          document.getElementById("adminTabBtn")?.classList.add("hidden");
        }
      } catch (e) {
        document.getElementById("adminTabBtn")?.classList.add("hidden");
      }
    })();
  }
  function showAuthGate() {
    currentUser = null;
    document.getElementById("authGate").style.display = "block";
    document.getElementById("profileContent").style.display = "none";
  }

  // ===== SIGN OUT BUTTONS =====
  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
  document
    .getElementById("signOutEverywhereBtn")
    .addEventListener("click", () => {
      openCustomConfirm("Sign out from all sessions?", async () => {
        await supabase.auth.signOut({ scope: "global" });
      });
    });

  // ===== HELPER =====
  function escHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ===== INIT =====
  (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) showProfile(session.user);
    else showAuthGate();
  })();

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      const recoveryInput = document.getElementById("recoveryPasswordInput");
      let recoveryBtn = document.getElementById("confirmRecoveryPasswordBtn");
      const recoveryErr = document.getElementById("recoveryModalError");

      recoveryInput.value = "";
      recoveryErr.classList.add("hidden");
      openProfileModal("passwordRecoveryModal");

      const newBtn = recoveryBtn.cloneNode(true);
      recoveryBtn.parentNode.replaceChild(newBtn, recoveryBtn);

      newBtn.addEventListener("click", async () => {
        const newPassword = recoveryInput.value;
        if (!newPassword) {
          recoveryErr.textContent = "Please enter a new password.";
          recoveryErr.classList.remove("hidden");
          return;
        }
        newBtn.disabled = true;
        newBtn.textContent = "Saving...";

        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        newBtn.disabled = false;
        newBtn.textContent = "Set New Password";

        if (error) {
          recoveryErr.textContent = error.message;
          recoveryErr.classList.remove("hidden");
        } else {
          closeProfileModal("passwordRecoveryModal");
          showToast("Password updated successfully! You are now logged in.");
          showProfile(data.user);
        }
      });
    } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.user) showProfile(session.user);
    } else if (event === "SIGNED_OUT") {
      showAuthGate();
    }
  });

  // ===== ADMIN PANEL ANNOUNCEMENTS =====
  async function setupAdminPanel(user) {
    const form = document.getElementById("adminAnnouncementForm");
    if (!form) return;

    // Reset listener to prevent duplicates if user signs in/out
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    const announceDays = newForm.querySelector("#announceDays");
    const announceHours = newForm.querySelector("#announceHours");
    const announceMins = newForm.querySelector("#announceMins");
    const announcePermanent = newForm.querySelector("#announcePermanent");
    const durationInputs = newForm.querySelector("#durationInputs");

    // Populate dropdowns
    if (announceDays && announceDays.options.length === 0) {
      for (let i = 0; i <= 7; i++) {
        announceDays.add(new Option(i, i));
      }
      for (let i = 0; i <= 23; i++) {
        announceHours.add(new Option(i, i));
      }
      for (let i = 0; i <= 59; i++) {
        announceMins.add(new Option(i, i));
      }
      announceDays.value = "1";
    }

    // Toggle inputs when Infinite is clicked
    announcePermanent.addEventListener("click", () => {
      const isCurrentlyActive = announcePermanent.classList.toggle("active");
      if (isCurrentlyActive) {
        durationInputs.style.opacity = "0.5";
        announceDays.disabled = true;
        announceHours.disabled = true;
        announceMins.disabled = true;
      } else {
        durationInputs.style.opacity = "1";
        announceDays.disabled = false;
        announceHours.disabled = false;
        announceMins.disabled = false;
      }
    });

    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = newForm.querySelector("#announceSubmitBtn");
      const msgInput = newForm.querySelector("#announceMessage");

      const message = msgInput.value.trim();
      if (!message) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      let expiresAt = null;
      if (!announcePermanent.classList.contains("active")) {
        const d = parseInt(announceDays.value, 10) || 0;
        const h = parseInt(announceHours.value, 10) || 0;
        const m = parseInt(announceMins.value, 10) || 0;
        
        const totalMs = (d * 24 * 60 * 60 * 1000) +
                        (h * 60 * 60 * 1000) +
                        (m * 60 * 1000);
        
        if (totalMs > 0) {
          expiresAt = new Date(Date.now() + totalMs).toISOString();
        } else {
          showToast("Duration must be greater than 0 if not Infinite.", "error");
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-plus"></i>';
          return;
        }
      }

      const { error } = await supabase
        .from("announcements")
        .insert([{ message, expires_at: expiresAt, created_by: user.id }]);

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-plus"></i>';

      if (error) {
        showToast("Failed to create announcement: " + error.message, "error");
      } else {
        showToast("Announcement added successfully!");
        msgInput.value = "";
        announceDays.value = "1";
        announceHours.value = "0";
        announceMins.value = "0";
        announcePermanent.classList.remove("active");
        durationInputs.style.opacity = "1";
        announceDays.disabled = false;
        announceHours.disabled = false;
        announceMins.disabled = false;
        loadAnnouncements();
      }
    });

    loadAnnouncements();
  }

  async function loadAnnouncements() {
    const listEl = document.getElementById("announcementList");
    if (!listEl) return;

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      listEl.innerHTML = `<div style="color: #f85149; text-align: center; padding: 1.5rem; background: #161b22; border: 1px solid #30363d; border-radius: 6px;">Failed to load announcements: ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      listEl.innerHTML = `<div style="color: #8b949e; text-align: center; padding: 1.5rem; background: #161b22; border: 1px solid #30363d; border-radius: 6px;">No announcements configured.</div>`;
      return;
    }

    listEl.innerHTML = "";
    data.forEach((ann) => {
      const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
      const div = document.createElement("div");
      div.className = "announcement-item";
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#161b22; border:1px solid #30363d; border-radius:6px; padding:0.75rem 1rem; font-size:0.875rem; margin-top: 0.5rem;";

      let expiryLabel = "Permanent";
      if (ann.expires_at) {
        const dateStr = new Date(ann.expires_at).toLocaleString();
        expiryLabel = isExpired ? `<span style="color:#f85149">Expired at ${dateStr}</span>` : `Expires at ${dateStr}`;
      }

      div.innerHTML = `
        <div style="flex:1; padding-right:1rem; text-align: left;">
          <div style="font-weight:500; color:${isExpired ? '#8b949e' : '#c9d1d9'}; margin-bottom:0.25rem;">${escHtml(ann.message)}</div>
          <div style="font-size:0.75rem; color:#8b949e;">${expiryLabel}</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <button class="toggle-active-btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" data-id="${ann.id}" data-active="${ann.is_active}">
            ${ann.is_active ? '<i class="fas fa-eye"></i> Active' : '<i class="fas fa-eye-slash"></i> Inactive'}
          </button>
          <button class="delete-ann-btn btn-danger" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#fff;" data-id="${ann.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;

      // Toggle active status
      div.querySelector(".toggle-active-btn").addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const currentActive = e.currentTarget.dataset.active === "true";
        e.currentTarget.disabled = true;

        const { error } = await supabase
          .from("announcements")
          .update({ is_active: !currentActive })
          .eq("id", id);

        if (error) {
          showToast("Failed to toggle status: " + error.message, "error");
          e.currentTarget.disabled = false;
        } else {
          loadAnnouncements();
        }
      });

      // Delete announcement
      div.querySelector(".delete-ann-btn").addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        openCustomConfirm("Delete this announcement?", async () => {
          const { error } = await supabase
            .from("announcements")
            .delete()
            .eq("id", id);

          if (error) {
            showToast("Failed to delete: " + error.message, "error");
          } else {
            showToast("Announcement deleted!");
            loadAnnouncements();
          }
        });
      });

      listEl.appendChild(div);
    });
  }
});
