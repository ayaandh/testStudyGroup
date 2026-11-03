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
      ${card("Your public profile", `<form id="public-profile-form" class="stack-form"><label>Username <span class="muted">3–20 letters, numbers or underscores</span><input name="username" minlength="3" maxlength="20" pattern="[a-z0-9_]{3,20}" placeholder="ayaan_dev" required /></label><label>Bio <textarea name="bio" maxlength="240" rows="3" placeholder="What are you learning? What are you into?"></textarea></label><label>Profile colour <select name="theme"><option value="paper">Warm paper</option><option value="mint">Mint</option><option value="lavender">Lavender</option><option value="sky">Sky</option></select></label><div class="profile-form-actions"><button class="button button-dark">Save public profile</button><button class="button button-light" type="button" id="unpublish-profile">Unpublish profile</button></div><p class="muted" id="profile-url-hint">Choose a username to create your public page.</p></form>`)}
      ${card("Find students", `<form id="people-search-form" class="inline-form"><input name="username" placeholder="Search exact username" maxlength="20" required /><button class="button button-dark">Find</button></form><div id="people-result" class="community-list"></div><h4>Friend requests</h4><div id="friend-requests" class="community-list"></div><h4>Your friends</h4><div id="friends-list" class="community-list"></div>`)}
      ${card("Direct messages", `<div class="dm-layout"><div id="dm-friends" class="community-list"><p class="muted">Add a friend to start a private conversation.</p></div><div class="dm-room"><div id="dm-title" class="muted">Choose a friend</div><div id="dm-messages" class="dm-messages"></div><form id="dm-form" class="chat-form"><input name="text" maxlength="1000" placeholder="Write a message…" autocomplete="off" /><button class="button button-dark">Send</button><details class="chat-attach"><summary>Attach a question or notes</summary><textarea name="attachmentText" maxlength="3500" rows="3" placeholder="Paste the exact question or notes you want help with…"></textarea></details></form></div></div>`)}
    </div>`;

  const profileForm = $("#public-profile-form");
  profileForm.addEventListener("submit", async e => {
    e.preventDefault();
    const username = clean(profileForm.elements.username.value).toLowerCase();
    const bio = clean(profileForm.elements.bio.value);
    const theme = profileForm.elements.theme.value;
    if (!usernameOK(username)) return showToast("Use 3–20 lowercase letters, numbers or underscores. That name may also be reserved.");
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
  });

  $("#unpublish-profile").addEventListener("click", async () => {
    if (!state.profile?.username) return showToast("You don't have a public profile yet.");
    try {
      await deleteDoc(doc(db,"publicProfiles",state.profile.username));
      state.profile = {...state.profile, username:null, bio:"", theme:"paper"};
      profileForm.reset();
      $("#profile-url-hint").textContent="Your public profile is unpublished.";
      showToast("Your public profile is no longer visible.");
    } catch(err) { console.error(err); showToast("Couldn't unpublish your profile."); }
  });

  $("#people-search-form").addEventListener("submit", async e => {
    e.preventDefault(); const username = clean(e.currentTarget.elements.username.value).toLowerCase();
    const out = $("#people-result"); out.textContent = "Searching…";
    try {
      const matches = await getDocs(query(collection(db,"publicProfiles"),where("username",">=",username),where("username","<=",username+"\uf8ff"),orderBy("username"),limit(12)));
      const people = matches.docs.map(d=>d.data()).filter(p=>p.uid!==state.user.uid);
      if (!people.length) { out.textContent = "No public profiles match that username."; return; }
      out.innerHTML = people.map(p=>`<div class="person-row"><span><b>${escapeHTML(p.displayName)}</b><small>@${escapeHTML(p.username)}</small></span><a href="/${encodeURIComponent(p.username)}">View profile</a><button class="button button-light" data-add-friend="${escapeHTML(p.uid)}" data-name="${escapeHTML(p.displayName)}">Add friend</button></div>`).join("");
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
  const form = $("#public-profile-form"); if (!form || !state.profile) return;
  if (state.profile.username) {
    form.elements.username.value=state.profile.username; form.elements.bio.value=state.profile.bio||""; form.elements.theme.value=state.profile.theme||"paper";
    $("#profile-url-hint").innerHTML=`Your public page: <a href="/${encodeURIComponent(state.profile.username)}" target="_blank" rel="noopener">/${escapeHTML(state.profile.username)}</a>`;
  }
  await refreshPeople();
}

async function refreshPeople() {
  const uid=state.user.uid;
  const [incoming,outgoing,friendships] = await Promise.all([
    getDocs(query(collection(db,"friendRequests"),where("receiverUid","==",uid),where("status","==","pending"),limit(30))),
    getDocs(query(collection(db,"friendRequests"),where("senderUid","==",uid),where("status","==","pending"),limit(30))),
    getDocs(query(collection(db,"friendships"),where("participants","array-contains",uid),limit(100)))
  ]);
  const requests=[];
  for (const snap of incoming.docs) { const d=snap.data(); const p=await getDoc(queryDoc("publicProfiles",d.senderUid)); requests.push(`<div class="person-row"><span><b>${escapeHTML(p.data()?.displayName||"Student")}</b><small>Friend request</small></span><button class="button button-light" data-accept-request="${snap.id}">Accept</button></div>`); }
  for (const snap of outgoing.docs) requests.push(`<div class="person-row"><span><b>Request sent</b><small>${escapeHTML(snap.data().receiverUid.slice(0,8))}…</small></span></div>`);
  $("#friend-requests").innerHTML=requests.join("")||'<p class="muted">No pending requests.</p>';
  const friends=friendships.docs.map(s=>s.data().participants.find(id=>id!==uid)).filter(Boolean);
  const unique=[...new Set(friends)]; const people=[];
  for(const friendUid of unique){const p=await getDocs(query(collection(db,"publicProfiles"),where("uid","==",friendUid),limit(1))); const data=p.docs[0]?.data(); if(data) people.push(data);}
  const html=people.map(p=>`<div class="person-row"><span><b>${escapeHTML(p.displayName)}</b><small>@${escapeHTML(p.username)}</small></span><a href="/${encodeURIComponent(p.username)}">Profile</a><button class="button button-light" data-open-dm="${escapeHTML(p.uid)}" data-name="${escapeHTML(p.displayName)}">Message</button></div>`).join("")||'<p class="muted">Your friends will appear here.</p>';
  $("#friends-list").innerHTML=html; $("#dm-friends").innerHTML=html;
}
function queryDoc(collectionName,id){return doc(db,collectionName,id);}

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
