import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, updateDoc, where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, db, showToast, state } from "./core.js";
import { getUnlockedBadgeTitles } from "./insights.js";

const clean = (s) => String(s || "").trim();
const RESERVED_USERNAMES = new Set(["dashboard","content","assets","resource","profile","index","404","favicon","robots","sitemap"]);
const usernameOK = (s) => /^[a-z0-9_]{3,20}$/.test(s) && !RESERVED_USERNAMES.has(s);
const chatIdFor = (a,b) => [a,b].sort().join("_");
let stopMessages = null;
let activeChat = null;

function card(title, body) { return `<article class="community-card"><h3>${title}</h3>${body}</article>`; }
function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

export function initCommunity() {
  const root = $("#community-panel");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "1";
  root.innerHTML = `
    <div class="community-grid">
      ${card("Find students", `<p class="muted">Search using the exact nickname shown on the leaderboard. Only students who opted into the leaderboard are discoverable. Profile editing lives in Settings, never in this section.</p><form id="people-search-form" class="inline-form"><input name="username" placeholder="Enter a leaderboard nickname" maxlength="24" required /><button class="button button-dark">Find students</button></form><div id="people-result" class="community-list"></div><h4>Friend requests</h4><div id="friend-requests" class="community-list"></div><h4>Your friends</h4><div id="friends-list" class="community-list"></div>`)}
      ${card("Direct messages", `<div class="dm-layout"><div id="dm-friends" class="community-list"><p class="muted">Add a friend to start a private conversation.</p></div><div class="dm-room"><div id="dm-title" class="muted">Choose a friend</div><div id="dm-messages" class="dm-messages"></div><form id="dm-form" class="chat-form"><input name="text" maxlength="1000" placeholder="Write a message…" autocomplete="off" /><button class="button button-dark">Send</button><details class="chat-attach"><summary>Attach a question or notes</summary><textarea name="attachmentText" maxlength="3500" rows="3" placeholder="Paste the exact question or notes you want help with…"></textarea></details></form></div></div>`)}
    </div>`;

  const savePublicProfile = async () => {
    const username = clean($("#public-username").value).toLowerCase().replace(/^@/, "");
    const bio = clean($("#public-bio").value);
    const theme = $("#public-theme").value;
    if (!usernameOK(username)) return showToast("Use 3–20 lowercase letters, numbers or underscores. Some names are reserved.");
    try {
      const old = state.profile?.username;
      const target = doc(db,"publicProfiles",username);
      const exists = await getDoc(target);
      if (exists.exists() && exists.data().uid !== state.user.uid) return showToast("That username is already taken.");
      const payload = { uid: state.user.uid, username, displayName: state.profile.displayName, bio, theme, achievements: getUnlockedBadgeTitles(), updatedAt: serverTimestamp() };
      await setDoc(target,payload);
      if (old && old !== username) await deleteDoc(doc(db,"publicProfiles",old));
      state.profile = {...state.profile, username, bio, theme};
      $("#profile-url-hint").innerHTML = `Your public page: <a href="/${encodeURIComponent(username)}" target="_blank" rel="noopener">/${escapeHTML(username)}</a>`;
      showToast("Your public profile is saved.");
    } catch(err) { console.error(err); showToast("Couldn't save your profile. Check that the latest Firestore rules are deployed."); }
  };
  $("#save-public-profile").addEventListener("click", savePublicProfile);

  $("#unpublish-profile").addEventListener("click", async () => {
    if (!state.profile?.username) return showToast("You don't have a public profile yet.");
    try {
      await deleteDoc(doc(db,"publicProfiles",state.profile.username));
      state.profile = {...state.profile, username:null, bio:"", theme:"paper"};
      $("#public-username").value = ""; $("#public-bio").value = ""; $("#public-theme").value = "paper";
      $("#profile-url-hint").textContent="Your public profile is unpublished.";
      showToast("Your public profile is no longer visible.");
    } catch(err) { console.error(err); showToast("Couldn't unpublish your profile."); }
  });

  $("#people-search-form").addEventListener("submit", async e => {
    e.preventDefault();
    const entered = clean(e.currentTarget.elements.username.value).replace(/^@/, "");
    const out = $("#people-result"); out.textContent = "Searching leaderboard nicknames…";
    try {
      const matches = await getDocs(query(collection(db,"publicLeaderboard"),where("displayName","==",entered),limit(12)));
      const people = matches.docs.filter(item => item.id !== state.user.uid).map(item => ({uid:item.id,displayName:item.data().displayName||"Student"}));
      if (!people.length) { out.textContent = "No leaderboard member found with that exact nickname. Check the spelling and spaces."; return; }
      out.innerHTML = people.map(p=>`<div class="person-row"><span><b>${escapeHTML(p.displayName)}</b><small>Leaderboard member</small></span><button class="button button-light" data-add-friend="${escapeHTML(p.uid)}">Add friend</button></div>`).join("");
    } catch(err) { console.error(err); out.textContent = "Search failed. Try again."; }
  });

  root.addEventListener("click", async e => {
    const add = e.target.closest("[data-add-friend]");
    const accept = e.target.closest("[data-accept-request]");
    const open = e.target.closest("[data-open-dm]");
    if (add) {
      const receiverUid = add.dataset.addFriend; const requestId = `${state.user.uid}_${receiverUid}`;
      try { await setDoc(doc(db,"friendRequests",requestId),{senderUid:state.user.uid,receiverUid,status:"pending",createdAt:serverTimestamp()}); add.disabled=true; add.textContent="Request sent"; }
      catch(err) { console.error(err); showToast("Couldn't send friend request. It may already exist."); }
    }
    if (accept) {
      try {
        const requestRef=doc(db,"friendRequests",accept.dataset.acceptRequest);
        const requestSnap=await getDoc(requestRef); const requestData=requestSnap.data();
        await updateDoc(requestRef,{status:"accepted",acceptedAt:serverTimestamp()});
        const participants=[requestData.senderUid,requestData.receiverUid].sort();
        await setDoc(doc(db,"friendships",participants.join("_")),{participants,requestId:accept.dataset.acceptRequest,createdAt:serverTimestamp()});
        await refreshPeople();
      }
      catch(err) { console.error(err); showToast("Couldn't accept that request."); }
    }
    if (open) openDM(open.dataset.openDm,open.dataset.name);
  });

  $("#dm-form").addEventListener("submit", async e => {
    e.preventDefault(); if (!activeChat) return;
    const input=e.currentTarget.elements.text; const message=clean(input.value); const attachmentText=clean(e.currentTarget.elements.attachmentText.value); if(!message&&!attachmentText) return;
    try { await addDoc(collection(db,"directChats",activeChat.id,"messages"),{uid:state.user.uid,name:state.profile.displayName,text:message,attachmentText,createdAt:serverTimestamp()}); input.value=""; e.currentTarget.elements.attachmentText.value=""; }
    catch(err) { console.error(err); showToast("Message couldn't be sent. Check your Firestore rules."); }
  });
}

export async function loadCommunityProfile() {
  if (!state.profile) return;
  const usernameInput = $("#public-username");
  if (usernameInput) {
    usernameInput.value=state.profile.username||"";
    $("#public-bio").value=state.profile.bio||"";
    $("#public-theme").value=state.profile.theme||"paper";
    $("#profile-url-hint").innerHTML=state.profile.username
      ? `Your public page: <a href="/${encodeURIComponent(state.profile.username)}" target="_blank" rel="noopener">/${escapeHTML(state.profile.username)}</a>`
      : "Choose a username to create your public page.";
  }
  await refreshPeople();
}

async function findPublicProfile(uid) {
  const snap=await getDocs(query(collection(db,"publicProfiles"),where("uid","==",uid),limit(1)));
  return snap.docs[0]?.data()||null;
}

async function refreshPeople() {
  const uid=state.user.uid;
  const [incoming,outgoing,friendships] = await Promise.all([
    getDocs(query(collection(db,"friendRequests"),where("receiverUid","==",uid),where("status","==","pending"),limit(30))),
    getDocs(query(collection(db,"friendRequests"),where("senderUid","==",uid),where("status","==","pending"),limit(30))),
    getDocs(query(collection(db,"friendships"),where("participants","array-contains",uid),limit(100)))
  ]);
  const requests=[];
  for (const snap of incoming.docs) { const d=snap.data(); const p=await getDoc(doc(db,"publicLeaderboard",d.senderUid)); const publicProfile=await findPublicProfile(d.senderUid); requests.push(`<div class="person-row"><span><b>${escapeHTML(p.data()?.displayName||publicProfile?.displayName||"Student")}</b><small>${publicProfile?.username?"@"+escapeHTML(publicProfile.username):"Leaderboard member"}</small></span><button class="button button-light" data-accept-request="${snap.id}">Accept</button></div>`); }
  for (const snap of outgoing.docs) { const target=snap.data().receiverUid; const p=await getDoc(doc(db,"publicLeaderboard",target)); requests.push(`<div class="person-row"><span><b>Request sent</b><small>${escapeHTML(p.data()?.displayName||"Leaderboard member")}</small></span></div>`); }
  $("#friend-requests").innerHTML=requests.join("")||'<p class="muted">No pending requests.</p>';
  const friends=friendships.docs.map(s=>s.data().participants.find(id=>id!==uid)).filter(Boolean);
  const unique=[...new Set(friends)]; const people=[];
  for(const friendUid of unique){const [data,board]=await Promise.all([findPublicProfile(friendUid),getDoc(doc(db,"publicLeaderboard",friendUid))]); const profile=data||{}; people.push({uid:friendUid,displayName:profile.displayName||board.data()?.displayName||"Student",username:profile.username||""});}
  const html=people.map(p=>`<div class="person-row"><span><b>${escapeHTML(p.displayName)}</b><small>${p.username?"@"+escapeHTML(p.username):"Leaderboard member"}</small></span>${p.username?`<a href="/${encodeURIComponent(p.username)}">Profile</a>`:""}<button class="button button-light" data-open-dm="${escapeHTML(p.uid)}" data-name="${escapeHTML(p.displayName)}">Message</button></div>`).join("")||'<p class="muted">Your friends will appear here.</p>';
  $("#friends-list").innerHTML=html; $("#dm-friends").innerHTML=html;
}

async function openDM(friendUid,name){
  const id=chatIdFor(state.user.uid,friendUid); activeChat={id,friendUid};
  $("#dm-title").textContent=`Chat with ${name}`; $("#dm-messages").innerHTML="Loading messages…";
  if(stopMessages) stopMessages();
  const ref=collection(db,"directChats",id,"messages");
  try {
    const room=doc(db,"directChats",id); const snap=await getDoc(room);
    if(!snap.exists()) await setDoc(room,{participants:[state.user.uid,friendUid].sort(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    stopMessages=onSnapshot(query(ref,orderBy("createdAt","asc"),limit(100)),ss=>{
      $("#dm-messages").innerHTML=ss.docs.map(d=>{const m=d.data();return `<div class="dm-message ${m.uid===state.user.uid?'mine':''}"><b>${escapeHTML(m.name)}</b>${m.text?`<p>${escapeHTML(m.text)}</p>`:""}${m.attachmentText?`<div class="shared-attachment"><small>SHARED QUESTION / NOTES</small><p>${escapeHTML(m.attachmentText)}</p></div>`:""}</div>`;}).join("")||'<p class="muted">Say hello to start the conversation.</p>';
      $("#dm-messages").scrollTop=$("#dm-messages").scrollHeight;
    },err=>{console.error(err);$("#dm-messages").textContent="Could not load this conversation.";});
  } catch(err){console.error(err);showToast("Couldn't open direct messages. Check that the latest rules are deployed.");}
}
