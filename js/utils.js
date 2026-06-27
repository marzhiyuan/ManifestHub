window.handleUnconfirmedEmail = function (errEl, emailInputId, supabase) {
  if (errEl.dataset.resendHandled) return;
  errEl.dataset.resendHandled = "true";

  errEl.innerHTML = `Please verify your email before signing in. Check your inbox for a confirmation link.
    <button type="button" class="resend-confirm-btn">Resend email</button>`;
  errEl.classList.remove("hidden");

  errEl.querySelector(".resend-confirm-btn").addEventListener("click", async () => {
    const email = document.getElementById(emailInputId).value;
    await supabase.auth.resend({ type: "signup", email });
    errEl.textContent = "Confirmation email resent! Check your inbox.";
  });
};