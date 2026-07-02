// Shared utilities attached to window for global access
window.handleUnconfirmedEmail = function (errEl, emailInputId, supabase) {
  if (errEl.dataset.resendHandled) return;
  errEl.dataset.resendHandled = "true";

  errEl.innerHTML = `Please verify your email before signing in. Check your inbox for a confirmation link. <em>(Also check your spam/junk folder.)</em>
    <button type="button" class="resend-confirm-btn">Resend email</button>`;
  errEl.classList.remove("hidden");

  errEl
    .querySelector(".resend-confirm-btn")
    .addEventListener("click", async () => {
      const email = document.getElementById(emailInputId).value;
      await supabase.auth.resend({ type: "signup", email });
      errEl.textContent = "Confirmation email resent! Check your inbox.";
    });
};

/**
 * Handles a successful signup that requires email confirmation
 * (i.e. Supabase returns a user but no session).
 * Keeps the auth modal open and shows a styled success notice
 * with a "Resend email" button.
 *
 * @param {HTMLElement} errEl     - The error/status container element.
 * @param {string}      email     - The email address just signed up with.
 * @param {HTMLElement} submitBtn - The form submit button to re-enable.
 * @param {object}      supabase  - The Supabase client instance.
 */
window.handleSignupConfirmation = function (errEl, email, submitBtn, supabase) {
  errEl.innerHTML = `Registration successful! Check your inbox for a confirmation link. <em>(Also check your spam/junk folder.)</em> <button type="button" class="resend-confirm-btn">Resend email</button>`;
  errEl.style.color = "#3fb950";
  errEl.classList.remove("hidden");

  errEl
    .querySelector(".resend-confirm-btn")
    .addEventListener("click", async () => {
      await supabase.auth.resend({ type: "signup", email });
      errEl.textContent = "Confirmation email resent! Check your inbox.";
    });

  submitBtn.disabled = false;
  submitBtn.textContent = "Sign Up";
};

/**
 * Escapes special HTML characters to prevent XSS when inserting
 * user-supplied text into the DOM via innerHTML.
 * Handles null/undefined input safely.
 *
 * @param  {*}      text - The value to escape.
 * @returns {string}      The HTML-escaped string.
 */
window.escapeHtml = function (text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
