import { SUBJECTS, escapeHTML } from "./helpers.js";
const subjectSelect=document.querySelector("#library-subject");
const typeSelect=document.querySelector("#library-type");
const searchInput=document.querySelector("#library-search");
const results=document.querySelector("#library-results");
let catalogue=[];
const slug=s=>s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
if(subjectSelect){
  subjectSelect.innerHTML='<option value="all">All GCSE subjects</option>'+SUBJECTS.filter((v,i,a)=>a.indexOf(v)===i&&v!=="General").map(s=>`<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
  fetch("/content/catalogue.json").then(r=>r.ok?r.json():{resources:[]}).then(data=>{catalogue=Array.isArray(data.resources)?data.resources:[];render();}).catch(()=>render());
  [subjectSelect,typeSelect,searchInput].forEach(el=>el.addEventListener("input",render));
}
function render(){
 if(!results)return;
 const subject=subjectSelect.value,type=typeSelect.value,term=searchInput.value.trim().toLowerCase();
 const matches=catalogue.filter(r=>(subject==="all"||r.subject===subject)&&(type==="all"||r.type===type)&&(!term||[r.title,r.topic,r.subject,r.examBoard,r.year].join(" ").toLowerCase().includes(term)));
 if(!matches.length){results.innerHTML='<div class="library-empty"><strong>Your library is ready to grow.</strong><p>No published resources match these filters yet. Create original notes, quizzes, worksheets and practice sets, then add them to <code>content/catalogue.json</code>.</p></div>';return;}
 results.innerHTML=matches.map(r=>`<article class="library-resource"><div><span class="library-tag">${escapeHTML(r.type||"resource").replace(/-/g," ").toUpperCase()}</span><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML([r.subject,r.topic,r.examBoard,r.year].filter(Boolean).join(" · "))}</p></div><a class="button button-light" href="/resource.html?file=${encodeURIComponent(r.path)}">Open resource</a></article>`).join("");
}
