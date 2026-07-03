// =============================================================
// poll.js — Community Poll Widget
// =============================================================
// Fetches the active poll from Supabase, checks if the current
// user has voted, and renders either the voting or results view.
// Re-called on every auth state change.
// =============================================================

/**
 * Initializes the community poll widget.
 * @param {object} supabase - The Supabase client instance.
 */
window.MH_initPollWidget = async function (supabase) {
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

  const currentUser = window.MH.currentUser;

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
    activePoll.options.forEach((opt) => (votesMap[opt] = 0));
    if (votesData) {
      votesData.forEach((v) => {
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
        if (typeof window.MH_openAuthModal === "function") {
          window.MH_openAuthModal("login");
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

      poll.options.forEach((option) => {
        const btn = document.createElement("button");
        btn.className = "poll-option-btn";
        btn.textContent = option;
        btn.disabled = !currentUser; // disabled for guests
        btn.onclick = () => castVote(poll.id, option);
        pollOptionsContainer.appendChild(btn);
      });
    }

    function renderPollResults(poll, vMap, userVotedOpt) {
      pollVoteInterface.classList.add("hidden");
      pollResultsInterface.classList.remove("hidden");
      pollResultsContainer.innerHTML = "";

      const total = Object.values(vMap).reduce(
        (sum, count) => sum + count,
        0,
      );

      pollTotalVotes.textContent = `${total} vote${total === 1 ? "" : "s"}`;
      if (userVotedOpt) {
        pollVoteReceipt.textContent = `You voted: ${userVotedOpt}`;
      } else {
        pollVoteReceipt.textContent = "";
      }

      poll.options.forEach((option) => {
        const count = vMap[option] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;

        const row = document.createElement("div");
        row.className = "poll-result-row";
        if (option === userVotedOpt) {
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
        .insert([
          { poll_id: pollId, user_id: currentUser.id, vote_option: option },
        ]);

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
      window.MH_initPollWidget(supabase);
    }
  } catch (err) {
    console.error("Error initializing poll widget:", err);
    pollCard.classList.add("hidden");
  }
};
