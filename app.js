import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  getRedirectResult,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
  $,
  $$,
  auth,
  db,
  fillSubjectSelects,
  getErrorMessage,
  setFormError,
  showBanner,
  showToast,
  state
} from "./core.js";
import { cleanNickname, escapeHTML, sanitizeNickname, validNickname } from "./helpers.js";
import { exportData, startWorkspace, stopWorkspace } from "./workspace.js";

const LEADERBOARD_SIZE = 8;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NICKNAME_RULE = "Use 2 to 24 letters, numbers, spaces, dots, underscores or hyphens for your nickname.";

const authDialog = $("#auth-dialog");
const profileDialog = $("#profile-dialog");
const authForm = $("#auth-form");
const profileForm = $("#profile-form");
const leaderboardList = $("#leaderboard-list");

let authMode = "signup";
let registrationInProgress = false;
let loadToken = 0;
let newSocialUid = null;
const inflightProfiles = new Map();

const providerFactories = {
  google() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  },
  microsoft() {
    const provider = new OAuthProvider("microsoft.com");
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }
};

function profileReference(user) {
  return doc(db, "users", user.uid);
}

function leaderboardReference(uid) {
  return doc(db, "publicLeaderboard", uid);
}

async function createOrLoadProfile(user) {
  const reference = profileReference(user);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) {
    const fallback = `Learner ${user.uid.slice(0, 5)}`;
    const newProfile = {
      displayName: sanitizeNickname(user.displayName, fallback),
      leaderboardOptIn: false,
      createdAt: serverTimestamp()
    };
    await setDoc(reference, newProfile);
    return { displayName: newProfile.displayName, leaderboardOptIn: false };
  }
  const existing = snapshot.data();
  if (existing.leaderboardOptIn === true) {
    const publicReference = leaderboardReference(user.uid);
    const publicSnapshot = await getDoc(publicReference);
    if (!publicSnapshot.exists()) {
      await setDoc(publicReference, {
        displayName: existing.displayName,
        points: 0,
        lastPointAt: null,
        joinedAt: serverTimestamp()
      });
    }
  }
  return existing;
}

function ensureUserProfile(user) {
  if (!inflightProfiles.has(user.uid)) {
    const pending = createOrLoadProfile(user).finally(() => inflightProfiles.delete(user.uid));
    inflightProfiles.set(user.uid, pending);
  }
  return inflightProfiles.get(user.uid);
}

function syncAuthButtons() {
  const signedIn = Boolean(state.user);
  $$("[data-open-auth]").forEach((button) => {
    button.hidden = signedIn;
  });
}

function renderAccount() {
  const signedIn = Boolean(state.user);
  $("#signed-in-menu").hidden = !signedIn;
  $("#workspace").hidden = !signedIn || !state.profile;
  $("#nav-workspace").hidden = !signedIn || !state.profile;
  syncAuthButtons();
  const dashboard = signedIn && Boolean(state.profile);
  if (document.body.classList.contains("is-signed-in") !== dashboard) {
    document.body.classList.toggle("is-signed-in", dashboard);
    window.scrollTo(0, 0);
  }
  if (!signedIn) {
    $("#account-popover").hidden = true;
    return;
  }
  const nickname = state.profile?.displayName || state.user.displayName || "Study buddy";
  $("#header-name").textContent = nickname;
  $("#header-initial").textContent = nickname.slice(0, 1).toUpperCase();
  $("#account-email").textContent = state.user.email || "";
  $("#workspace-name").textContent = nickname;
  const canCheckIn = Boolean(state.profile?.leaderboardOptIn);
  $("#member-checkin").hidden = !canCheckIn;
  $("#member-join").hidden = canCheckIn || !state.profile;
  $("#checkin-name").textContent = nickname;
  const checkedToday = leaderboardList.dataset.checkedInUid === state.user.uid;
  $("#daily-checkin").disabled = checkedToday || !canCheckIn;
  $("#daily-checkin").textContent = checkedToday ? "You checked in today ✓" : "Check in for today +1";
}

function openProfileDialog(welcome = false) {
  $("#account-popover").hidden = true;
  profileForm.elements.nickname.value = state.profile?.displayName || "";
  profileForm.elements.leaderboardOptIn.checked = Boolean(state.profile?.leaderboardOptIn);
  $("#profile-title").textContent = welcome ? "Welcome. Pick a nickname." : "Make yourself at home.";
  $("#profile-intro").textContent = welcome
    ? "This is the name other students see. Your email and real name stay private."
    : "Choose the nickname students see. Your email stays private.";
  setFormError($("#profile-error"), "");
  if (!profileDialog.open) profileDialog.showModal();
}

function maybePromptNickname() {
  if (newSocialUid && state.user && state.profile && state.user.uid === newSocialUid) {
    newSocialUid = null;
    openProfileDialog(true);
  }
}

async function updateCheckinStatus() {
  if (!state.user || !state.profile?.leaderboardOptIn) {
    leaderboardList.dataset.checkedInUid = "";
    renderAccount();
    return;
  }
  try {
    const snapshot = await getDoc(leaderboardReference(state.user.uid));
    const lastPointAt = snapshot.data()?.lastPointAt;
    const checkedIn = lastPointAt?.toDate && Date.now() - lastPointAt.toDate().getTime() < DAY_IN_MS;
    leaderboardList.dataset.checkedInUid = checkedIn ? state.user.uid : "";
    renderAccount();
  } catch (error) {
    console.error("Could not check the student's leaderboard check-in status.", error);
    showBanner(getErrorMessage(error), true);
  }
}

async function loadUser(user) {
  const token = ++loadToken;
  state.user = user;
  state.profile = null;
  stopWorkspace();
  renderAccount();
  if (!user) {
    leaderboardList.dataset.checkedInUid = "";
    showBanner("Firebase connected. Your study space is ready when you are.");
    return;
  }
  try {
    const profile = await ensureUserProfile(user);
    if (token !== loadToken) return;
    state.profile = profile;
    renderAccount();
    startWorkspace();
    await updateCheckinStatus();
    showBanner(`Welcome${profile.displayName ? `, ${profile.displayName}` : ""}. Your account is ready.`);
    maybePromptNickname();
  } catch (error) {
    console.error("Could not load the student's private StudyGroup profile.", error);
    showBanner(getErrorMessage(error), true);
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "signup";
  authForm.reset();
  setFormError($("#auth-error"), "");
  $("#auth-title").textContent = signingUp ? "Find your people." : "Welcome back.";
  $("#auth-intro").textContent = signingUp
    ? "Create your free account and make yourself at home."
    : "Log in to your free StudyGroup account.";
  $("#nickname-field").hidden = !signingUp;
  $("#leaderboard-optin-field").hidden = !signingUp;
  authForm.elements.nickname.required = signingUp;
  authForm.elements.nickname.disabled = !signingUp;
  authForm.elements.password.autocomplete = signingUp ? "new-password" : "current-password";
  $("#auth-submit").innerHTML = signingUp
    ? "Create my free account <span>→</span>"
    : "Log in to StudyGroup <span>→</span>";
  $("#auth-switch-copy").textContent = signingUp ? "Already have an account?" : "New to StudyGroup?";
  $("#auth-switch").textContent = signingUp ? "Log in" : "Join for free";
  $("#forgot-password").hidden = signingUp;
  $$("[data-provider] .social-label").forEach((label) => {
    const name = label.closest("[data-provider]").dataset.provider === "google" ? "Google" : "Outlook";
    label.textContent = `${signingUp ? "Sign up" : "Log in"} with ${name}`;
  });
}

function setSocialBusy(busy) {
  $$("[data-provider]").forEach((button) => {
    button.disabled = busy;
  });
}

async function socialSignIn(providerName) {
  const errorContainer = $("#auth-error");
  setFormError(errorContainer, "");
  setSocialBusy(true);
  const provider = providerFactories[providerName]();
  try {
    const credential = await signInWithPopup(auth, provider);
    const info = getAdditionalUserInfo(credential);
    if (info?.isNewUser) {
      newSocialUid = credential.user.uid;
      maybePromptNickname();
    }
    if (authDialog.open) authDialog.close();
  } catch (error) {
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") return;
    if (error.code === "auth/popup-blocked" || error.code === "auth/operation-not-supported-in-this-environment") {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error("StudyGroup redirect sign-in failed.", redirectError);
        setFormError(errorContainer, getErrorMessage(redirectError));
        return;
      }
    }
    console.error(`StudyGroup ${providerName} sign-in failed.`, error);
    setFormError(errorContainer, getErrorMessage(error));
  } finally {
    setSocialBusy(false);
  }
}

async function loadLeaderboard() {
  const button = $("#refresh-leaderboard");
  button.disabled = true;
  button.classList.add("is-refreshing");
  leaderboardList.innerHTML = '<div class="leaderboard-loading"><span class="loading-spinner"></span> Finding our study buddies…</div>';
  try {
    const snapshot = await getDocs(query(
      collection(db, "publicLeaderboard"),
      orderBy("points", "desc"),
      limit(LEADERBOARD_SIZE)
    ));
    renderLeaderboard(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    if (state.user && state.profile?.leaderboardOptIn) await updateCheckinStatus();
  } catch (error) {
    console.error("Could not load the public StudyGroup leaderboard.", error);
    leaderboardList.innerHTML = `<div class="leaderboard-message"><span>⌁</span><strong>We can't reach the leaderboard right now.</strong><p>${escapeHTML(getErrorMessage(error))}</p><button class="leaderboard-retry" type="button" data-retry-leaderboard>Try again</button></div>`;
  } finally {
    button.disabled = false;
    button.classList.remove("is-refreshing");
  }
}

function renderLeaderboard(students) {
  leaderboardList.dataset.checkedInUid = "";
  if (students.length === 0) {
    leaderboardList.innerHTML = '<div class="leaderboard-message"><span>✳</span><strong>A fresh page. A new beginning.</strong><p>Be the first to opt into the study leaderboard. No grades, just friendly daily check-ins.</p><button class="leaderboard-join" type="button" data-open-auth="signup">Join the community <span>→</span></button></div>';
    syncAuthButtons();
    return;
  }
  leaderboardList.innerHTML = students.map((student, index) => {
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
  syncAuthButtons();
}

function applyResourceFilter() {
  const active = $("[data-resource-filter].is-active");
  const topic = active ? active.dataset.resourceFilter : "all";
  const term = $("#resource-search").value.trim().toLowerCase();
  let shown = 0;
  $$(".resource-pick").forEach((card) => {
    const subjects = card.dataset.subjects.split(" ");
    const matchesTopic = topic === "all" || subjects.includes(topic);
    const matchesTerm = !term || card.textContent.toLowerCase().includes(term);
    card.hidden = !(matchesTopic && matchesTerm);
    if (!card.hidden) shown += 1;
  });
  $("#resource-empty").hidden = shown > 0;
}

async function downloadMyData() {
  if (!state.user) return;
  $("#account-popover").hidden = true;
  try {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "studygroup-my-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    showToast("Your data has been downloaded.");
  } catch (error) {
    console.error("Could not export the student's StudyGroup data.", error);
    showToast(getErrorMessage(error));
  }
}

$("#auth-switch").addEventListener("click", () => setAuthMode(authMode === "signup" ? "signin" : "signup"));

$$("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

$$("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

$$("[data-provider]").forEach((button) => {
  button.addEventListener("click", () => socialSignIn(button.dataset.provider));
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(authForm);
  const email = String(values.get("email")).trim();
  const password = String(values.get("password"));
  const submitButton = $("#auth-submit");
  const errorContainer = $("#auth-error");
  setFormError(errorContainer, "");
  submitButton.disabled = true;
  submitButton.textContent = authMode === "signup" ? "Making your study space…" : "Signing you in…";

  try {
    if (authMode === "signin") {
      await signInWithEmailAndPassword(auth, email, password);
      authDialog.close();
    } else {
      const displayName = cleanNickname(String(values.get("nickname") || ""));
      if (!validNickname(displayName)) {
        setFormError(errorContainer, NICKNAME_RULE);
        return;
      }
      registrationInProgress = true;
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const optIn = values.get("leaderboardOptIn") === "on";
      const batch = writeBatch(db);
      batch.set(profileReference(credential.user), {
        displayName,
        leaderboardOptIn: optIn,
        createdAt: serverTimestamp()
      });
      if (optIn) {
        batch.set(leaderboardReference(credential.user.uid), {
          displayName,
          points: 0,
          lastPointAt: null,
          joinedAt: serverTimestamp()
        });
      }
      await batch.commit();
      registrationInProgress = false;
      authDialog.close();
      await loadUser(credential.user);
      showToast("Your free StudyGroup account is ready. Make yourself at home.");
    }
  } catch (error) {
    console.error(`StudyGroup ${authMode} failed.`, error);
    registrationInProgress = false;
    if (authMode === "signup" && auth.currentUser) {
      try {
        await loadUser(auth.currentUser);
      } catch (profileError) {
        console.error("The account was created but the StudyGroup profile could not be saved.", profileError);
        setFormError(errorContainer, `Your account was created, but the StudyGroup profile could not be saved. ${getErrorMessage(profileError)}`);
      }
    }
    if (!errorContainer.textContent) setFormError(errorContainer, getErrorMessage(error));
  } finally {
    registrationInProgress = false;
    submitButton.disabled = false;
    submitButton.innerHTML = authMode === "signup"
      ? "Create my free account <span>→</span>"
      : "Log in to StudyGroup <span>→</span>";
  }
});

$("#forgot-password").addEventListener("click", async () => {
  const email = String(authForm.elements.email.value).trim();
  const errorContainer = $("#auth-error");
  if (!email) {
    setFormError(errorContainer, "Enter your email address first, and then choose Forgot your password?");
    authForm.elements.email.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setFormError(errorContainer, "");
    showToast("If an account exists for that email, a password reset link is on its way.");
  } catch (error) {
    console.error("StudyGroup password reset failed.", error);
    setFormError(errorContainer, getErrorMessage(error));
  }
});

$("#account-toggle").addEventListener("click", () => {
  const popover = $("#account-popover");
  const open = popover.hidden;
  popover.hidden = !open;
  $("#account-toggle").setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
  const popover = $("#account-popover");
  if (!popover.hidden && !event.target.closest("#signed-in-menu")) {
    popover.hidden = true;
    $("#account-toggle").setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") $("#account-popover").hidden = true;
});

$$("[data-open-settings]").forEach((button) => {
  button.addEventListener("click", () => openProfileDialog(false));
});

$("#download-data").addEventListener("click", downloadMyData);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user) return;
  const nickname = cleanNickname(String(new FormData(profileForm).get("nickname") || ""));
  const optIn = profileForm.elements.leaderboardOptIn.checked;
  const errorContainer = $("#profile-error");
  const submitButton = profileForm.querySelector("[type=submit]");
  setFormError(errorContainer, "");
  if (!validNickname(nickname)) {
    setFormError(errorContainer, NICKNAME_RULE);
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = "Saving your preferences…";
  try {
    const publicReference = leaderboardReference(state.user.uid);
    const publicSnapshot = await getDoc(publicReference);
    const batch = writeBatch(db);
    batch.update(profileReference(state.user), { displayName: nickname, leaderboardOptIn: optIn });
    if (optIn && publicSnapshot.exists()) {
      batch.update(publicReference, { displayName: nickname });
    } else if (optIn) {
      batch.set(publicReference, {
        displayName: nickname,
        points: 0,
        lastPointAt: null,
        joinedAt: serverTimestamp()
      });
    } else if (publicSnapshot.exists()) {
      batch.delete(publicReference);
    }
    await batch.commit();
    state.profile = { ...state.profile, displayName: nickname, leaderboardOptIn: optIn };
    renderAccount();
    profileDialog.close();
    await loadLeaderboard();
    showToast(optIn ? "Your nickname is on the study leaderboard." : "Your profile is private from the leaderboard.");
  } catch (error) {
    console.error("Could not update the student's StudyGroup profile.", error);
    setFormError(errorContainer, getErrorMessage(error));
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "Save my preferences <span>→</span>";
  }
});

$("#sign-out").addEventListener("click", async () => {
  try {
    await signOut(auth);
    $("#account-popover").hidden = true;
    showToast("You've logged out. Take care, and see you next time.");
  } catch (error) {
    console.error("Could not sign out of StudyGroup.", error);
    showToast(getErrorMessage(error));
  }
});

$("#refresh-leaderboard").addEventListener("click", loadLeaderboard);

document.addEventListener("click", (event) => {
  const authButton = event.target.closest("[data-open-auth]");
  if (authButton) {
    setAuthMode(authButton.dataset.openAuth);
    authDialog.showModal();
  } else if (event.target.closest("[data-retry-leaderboard]")) {
    loadLeaderboard();
  }
});

$("#member-join").addEventListener("click", () => {
  openProfileDialog(false);
  profileForm.elements.leaderboardOptIn.checked = true;
});

$("#daily-checkin").addEventListener("click", async () => {
  if (!state.user || !state.profile?.leaderboardOptIn) return;
  const checkInButton = $("#daily-checkin");
  checkInButton.disabled = true;
  checkInButton.textContent = "Checking you in…";
  try {
    const reference = leaderboardReference(state.user.uid);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      throw new Error("Your public study profile could not be found. Try switching the leaderboard off and on in your profile.");
    }
    const lastPointAt = snapshot.data().lastPointAt;
    if (lastPointAt?.toDate && Date.now() - lastPointAt.toDate().getTime() < DAY_IN_MS) {
      leaderboardList.dataset.checkedInUid = state.user.uid;
      renderAccount();
      showToast("You've already checked in today. Come back tomorrow for another point.");
      return;
    }
    await updateDoc(reference, {
      points: snapshot.data().points + 1,
      lastPointAt: serverTimestamp()
    });
    await loadLeaderboard();
    leaderboardList.dataset.checkedInUid = state.user.uid;
    renderAccount();
    showToast("You showed up for yourself today. That counts. ✳");
  } catch (error) {
    console.error("The daily leaderboard check-in failed.", error);
    showToast(getErrorMessage(error));
    checkInButton.disabled = false;
    checkInButton.textContent = "Check in for today +1";
  }
});

$$("[data-resource-filter]").forEach((chip) => {
  chip.addEventListener("click", () => {
    $$("[data-resource-filter]").forEach((other) => other.classList.toggle("is-active", other === chip));
    applyResourceFilter();
  });
});

$("#resource-search").addEventListener("input", applyResourceFilter);

fillSubjectSelects();

if (window.location.protocol === "file:") {
  showBanner("Open StudyGroup through Firebase Hosting or a local web server. Sign-in does not work from a file.", true);
}

onAuthStateChanged(auth, (user) => {
  if (registrationInProgress) return;
  loadUser(user);
});

getRedirectResult(auth)
  .then((credential) => {
    if (credential && getAdditionalUserInfo(credential)?.isNewUser) {
      newSocialUid = credential.user.uid;
      maybePromptNickname();
    }
  })
  .catch((error) => {
    console.error("StudyGroup redirect sign-in failed.", error);
    showBanner(getErrorMessage(error), true);
  });

loadLeaderboard();
