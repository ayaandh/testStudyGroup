import { $, state, showToast } from "./core.js";
import { generateQuestion, topics } from "./zip-math-engine.js";


function clean(value) { return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function key() { return `zip-math:${state.user?.uid || "guest"}`; }
function load() { try { return JSON.parse(localStorage.getItem(key()) || '{"attempts":0,"correct":0,"streak":0}'); } catch { return { attempts:0, correct:0, streak:0 }; } }
function save(data) { try { localStorage.setItem(key(), JSON.stringify(data)); } catch { showToast("Progress could not be saved on this device."); } }

export function initZipMath() {
  const root = $("#zip-math");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "true";
  const topicSelect = $("#zip-topic"), tierSelect = $("#zip-tier");
  topicSelect.innerHTML = '<option value="mixed">Mixed practice</option>' + topics.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  let current = null, revealed = false;
  const stats = load();
  const updateStats = () => { $("#zip-attempts").textContent = stats.attempts; $("#zip-correct").textContent = stats.correct; $("#zip-rate").textContent = stats.attempts ? `${Math.round(stats.correct/stats.attempts*100)}%` : "—"; $("#zip-streak").textContent = stats.streak; };
  const next = () => { current = generateQuestion(topicSelect.value, tierSelect.value); revealed = false; $("#zip-question-topic").textContent = current.topicName; $("#zip-question").textContent = current.prompt; $("#zip-answer").value = ""; $("#zip-feedback").hidden = true; $("#zip-worked").hidden = true; $("#zip-submit").disabled = false; $("#zip-answer").disabled = false; $("#zip-answer").focus(); };
  const check = () => {
    if (!current || revealed) return;
    const raw = $("#zip-answer").value.trim().replace(/\s/g, "");
    if (!raw) { showToast("Enter an answer first."); return; }
    revealed = true;
    const normal = s => s.toLowerCase().replace(/£|cm²/g, "").replace(/\.0+$/, "");
    const right = normal(raw) === normal(current.answer);
    stats.attempts++; stats.correct += right ? 1 : 0; stats.streak = right ? stats.streak + 1 : 0; save(stats); updateStats();
    $("#zip-feedback").hidden = false;
    $("#zip-feedback").className = `zip-feedback ${right ? "is-right" : "is-wrong"}`;
    $("#zip-feedback-title").textContent = right ? "Correct. Nice work." : `Not quite. The answer is ${current.answer}.`;
    $("#zip-feedback-copy").textContent = right ? "You got it. Read the method if you want to reinforce the steps." : "Have a look at the worked solution, then try another question on this topic.";
    $("#zip-worked").hidden = false; $("#zip-worked").textContent = current.working;
    $("#zip-submit").disabled = true; $("#zip-answer").disabled = true; $("#zip-next").hidden = false;
  };
  $("#zip-new-set").addEventListener("click", next);
  $("#zip-submit").addEventListener("click", check);
  $("#zip-next").addEventListener("click", next);
  $("#zip-answer").addEventListener("keydown", e => { if (e.key === "Enter") check(); });
  $("#zip-reveal").addEventListener("click", () => { if (!current || revealed) return; $("#zip-answer").value = current.answer; check(); });
  updateStats(); next();
}
