import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, db, getErrorMessage, state } from "./core.js";
import { escapeHTML } from "./helpers.js";

const LEADERBOARD_SIZE = 8;
let refreshHandler = null;

function renderLeaderboard(students) {
  const list = $("#leaderboard-list");
  list.dataset.checkedInUid = "";
  if (students.length === 0) {
    const action = state.user ? "" : '<button class="leaderboard-join" type="button" data-open-auth="signup">Join the community <span>→</span></button>';
    list.innerHTML = `<div class="leaderboard-message"><span>✳</span><strong>A fresh page. A new beginning.</strong><p>Be the first to opt into the study leaderboard. No grades, just friendly daily check-ins.</p>${action}</div>`;
    return;
  }
  list.innerHTML = students.map((student, index) => {
    const isCurrentUser = state.user?.uid === student.id;
    const nickname = escapeHTML(student.displayName || "Study buddy");
    const points = Number.isSafeInteger(student.points) ? student.points : 0;
    const rank = index + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : "";
    return `<article class="leaderboard-row${isCurrentUser ? " is-you" : ""}">
      <span class="leader-rank${rankClass}">${String(rank).padStart(2, "0")}</span>
      <span class="leader-avatar leader-avatar-${(index % 4) + 1}">${nickname.slice(0, 1).toUpperCase()}</span>
      <span class="leader-student"><strong>${nickname}</strong><small>${isCurrentUser ? "That's you · nice to see you!" : "Showing up, one day at a time"}</small></span>
      <span class="leader-points">${points}<small>${points === 1 ? "day" : "days"}</small></span>
    </article>`;
  }).join("");
}

export async function loadLeaderboard() {
  const button = $("#refresh-leaderboard");
  const list = $("#leaderboard-list");
  button.disabled = true;
  button.classList.add("is-refreshing");
  list.innerHTML = '<div class="leaderboard-loading"><span class="loading-spinner"></span> Finding our study buddies…</div>';
  try {
    const snapshot = await getDocs(query(
      collection(db, "publicLeaderboard"),
      orderBy("points", "desc"),
      limit(LEADERBOARD_SIZE)
    ));
    renderLeaderboard(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
  } catch (error) {
    console.error("Could not load the public StudyGroup leaderboard.", error);
    list.innerHTML = `<div class="leaderboard-message"><span>⌁</span><strong>We can't reach the leaderboard right now.</strong><p>${escapeHTML(getErrorMessage(error))}</p><button class="leaderboard-retry" type="button" data-retry-leaderboard>Try again</button></div>`;
  } finally {
    button.disabled = false;
    button.classList.remove("is-refreshing");
  }
}

export function initLeaderboard(onRefresh) {
  refreshHandler = onRefresh || loadLeaderboard;
  $("#refresh-leaderboard").addEventListener("click", () => refreshHandler());
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-retry-leaderboard]")) refreshHandler();
  });
}
