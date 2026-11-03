import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { db } from "./core.js";
const root=document.querySelector("#public-profile");
const username=decodeURIComponent(location.pathname.split("/").filter(Boolean).pop()||"").toLowerCase();
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
try {
  if(!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("This profile address isn't valid.");
  const snap=await getDoc(doc(db,"publicProfiles",username));
  if(!snap.exists()) throw new Error("We couldn't find that public profile.");
  const p=snap.data(); document.title=`${p.displayName} (@${p.username}) | StudyGroup Academy`;
  root.dataset.theme=p.theme||"paper";
  const badges=Array.isArray(p.achievements)?p.achievements:[];
  root.innerHTML=`<div class="public-profile-cover"></div><div class="public-profile-content"><div class="profile-avatar">${safe((p.displayName||"S").slice(0,1).toUpperCase())}</div><span class="eyebrow">STUDYGROUP ACADEMY MEMBER</span><h1>${safe(p.displayName)}</h1><p class="profile-handle">@${safe(p.username)}</p><p class="profile-bio">${safe(p.bio||"This student hasn't written a bio yet.")}</p><div class="profile-achievements"><h2>Achievements · ${badges.length}</h2>${badges.length?badges.map(b=>`<div class="achievement-chip">✳ ${safe(b)}</div>`).join(" "):'<p>No public achievements yet. Keep learning and they will appear here.</p>'}<p>Only achievements actually unlocked in the Academy are shown.</p></div><a class="button button-dark" href="/dashboard/">Join the community</a></div>`;
} catch(err){root.innerHTML=`<div class="profile-not-found"><span>✳</span><h1>Profile not found</h1><p>${safe(err.message||"This profile may be private or unavailable.")}</p><a class="button button-dark" href="/">Back to StudyGroup Academy</a></div>`;}
