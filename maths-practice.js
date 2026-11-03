import { $ } from "./core.js";

// Deterministic, template-based GCSE Mathematics practice. No AI or external API is used.
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const round = (n, dp = 2) => Number(n.toFixed(dp));
const gcd = (a,b) => b ? gcd(b,a%b) : a;

const generators = {
  "Number": [
    () => { const p = pick([10, 15, 20, 25, 30, 40, 60, 75]); const n = int(2, 20) * 5; return { q: `Find ${p}% of £${n}.`, a: round(p*n/100), unit: "£", working: `${p}% = ${p}/100. So ${p}/100 × ${n} = ${round(p*n/100)}.` }; },
    () => { let a = int(2, 9), b = int(2, 9); const common = gcd(a,b); a /= common; b /= common; const m = int(2, 8); return { q: `Simplify the ratio ${a*m}:${b*m}.`, a: `${a}:${b}`, text: true, working: `Divide both parts by ${m}. ${a*m} ÷ ${m} : ${b*m} ÷ ${m} = ${a}:${b}.` }; },
    () => { const d = pick([2,4,5,10,20]), multiplier=int(2,5), denominator=d*multiplier, n=int(2,9)*d; return { q: `Write ${n}/${denominator} as a decimal.`, a: round(n/denominator,3), working: `${n} ÷ ${denominator} = ${round(n/denominator,3)}.` }; }
  ],
  "Algebra": [
    () => { const x=int(2,12), m=int(2,6), c=int(1,15), rhs=m*x+c; return { q:`Solve ${m}x + ${c} = ${rhs}.`, a:x, working:`Subtract ${c} from both sides: ${m}x = ${rhs-c}. Divide by ${m}: x = ${x}.` }; },
    () => { const x=int(2,12), a=int(2,8), b=int(1,15), rhs=a*(x+b); return { q:`Solve ${a}(x + ${b}) = ${rhs}.`, a:x, working:`Divide both sides by ${a}: x + ${b} = ${rhs/a}. Subtract ${b}: x = ${x}.` }; },
    () => { const n=int(2,8), c=int(-8,12), x=int(1,10), value=n*x+c; return { q:`A sequence has nth term ${n}n ${c<0?"−":"+"} ${Math.abs(c)}. Find the ${x}th term.`, a:value, working:`Substitute n = ${x}: ${n} × ${x} ${c<0?"−":"+"} ${Math.abs(c)} = ${value}.` }; }
  ],
  "Fractions": [
    () => { const d=pick([4,5,8,10,20]), n=int(1,d-1); return {q:`Simplify the fraction ${n*2}/${d*2}.`,a:`${n}/${d}`,text:true,working:`Find the highest common factor of ${n*2} and ${d*2}, which is 2. Divide the numerator and denominator by 2 to get ${n}/${d}.`}; },
    () => { const d=pick([2,4,5,8,10]), n=int(1,d-1), whole=int(2,6); return {q:`Write ${whole} ${n}/${d} as an improper fraction.`,a:`${whole*d+n}/${d}`,text:true,working:`Multiply the whole number by the denominator and add the numerator: (${whole} × ${d} + ${n})/${d} = ${whole*d+n}/${d}.`}; }
  ],
  "Ratio and proportion": [
    () => { const a=int(1,5); let b=int(2,6); if (a===b) b = b===6 ? 5 : b+1; const unit=int(3,12), total=(a+b)*unit; return { q:`£${total} is shared in the ratio ${a}:${b}. How much does the larger share receive?`, a:Math.max(a,b)*unit, unit:"£", working:`There are ${a+b} parts. Each part is £${unit}. The larger share is ${Math.max(a,b)} × £${unit} = £${Math.max(a,b)*unit}.` }; },
    () => { const cost=int(2,8)*3, qty=int(2,5)*3, ask=qty/3; return { q:`${qty} identical notebooks cost £${cost}. Find the cost of ${ask} notebooks.`, a:round(cost/qty*ask,2), unit:"£", working:`One notebook costs £${cost}/${qty}. Multiply this unit cost by ${ask}.` }; }
  ],
  "Geometry": [
    () => { const b=int(4,18), h=int(3,15); return { q:`A triangle has base ${b} cm and perpendicular height ${h} cm. Find its area.`, a:round(b*h/2), unit:"cm²", working:`Area = ½ × base × height = ½ × ${b} × ${h} = ${b*h/2} cm².` }; },
    () => { const w=int(3,14), h=int(3,16); return { q:`A rectangle is ${w} cm long and ${h} cm wide. Find its perimeter.`, a:2*(w+h), unit:"cm", working:`Perimeter = 2(length + width) = 2(${w} + ${h}) = ${2*(w+h)} cm.` }; },
    () => { const k=int(1,5), a=3*k,b=4*k,c=5*k; return { q:`A right-angled triangle has shorter sides ${a} cm and ${b} cm. Find the hypotenuse.`, a:c, unit:"cm", working:`Pythagoras: c² = ${a}² + ${b}² = ${a*a+b*b}. Therefore c = √${a*a+b*b} = ${c} cm.` }; }
  ],
  "Measures": [
    () => { const metres=int(2,15); return {q:`Convert ${metres} metres into centimetres.`,a:metres*100,unit:"cm",working:`1 metre = 100 centimetres, so ${metres} × 100 = ${metres*100} cm.`}; },
    () => { const mins=int(2,9)*5; return {q:`Convert ${mins} minutes into seconds.`,a:mins*60,unit:"seconds",working:`1 minute = 60 seconds, so ${mins} × 60 = ${mins*60} seconds.`}; }
  ],
  "Statistics": [
    () => { const vals=Array.from({length:4},()=>int(2,18)); const mean=vals.reduce((s,n)=>s+n,0)/4; return { q:`Find the mean of ${vals.join(", ")}.`, a:round(mean,2), working:`Add the values: ${vals.reduce((s,n)=>s+n,0)}. Divide by 4: ${round(mean,2)}.` }; },
    () => { const vals=Array.from({length:5},()=>int(1,20)).sort((a,b)=>a-b); return { q:`Find the median of ${vals.join(", ")}.`, a:vals[2], working:`The values are already in order. There are 5 values, so the median is the middle (3rd) value: ${vals[2]}.` }; }
  ],
  "Probability": [
    () => { const red=int(2,8), blue=int(2,8), total=red+blue; return { q:`A bag contains ${red} red counters and ${blue} blue counters. What is the probability of picking a red counter? Give your answer as a decimal.`, a:round(red/total,3), working:`Probability = favourable outcomes ÷ total outcomes = ${red}/${total} = ${round(red/total,3)}.` }; },
    () => { const sides=pick([6,8,10,12]), favourable=int(1,sides-1); return { q:`A fair ${sides}-sided spinner has ${favourable} winning sections. Find the probability of winning.`, a:round(favourable/sides,3), working:`Probability = ${favourable}/${sides} = ${round(favourable/sides,3)}.` }; }
  ]
};

const higherOnly = {
  "Number": [() => { const a=int(2,5), power=int(2,4), second=int(1,3), total=power+second; return {q:`Evaluate ${a}^${power} × ${a}^${second} using index laws.`,a:a**total,working:`When multiplying powers with the same base, add the indices: ${a}^${power} × ${a}^${second} = ${a}^${total} = ${a**total}.`}; }],
  "Algebra": [
    () => { const x=int(2,8), a=int(2,5), b=int(1,9), c=a*x-b; return {q:`Solve ${a}x − ${b} = ${c}.`,a:x,working:`Add ${b}: ${a}x = ${c+b}. Divide by ${a}: x = ${x}.`}; },
    () => { const a=int(2,6), b=int(1,8), x=int(2,8), result=a*x+a*b; return {q:`Expand and simplify ${a}(x + ${b}) when x = ${x}. Give the numerical value.`,a:result,working:`Expand: ${a}x + ${a*b}. Substitute x = ${x}: ${a} × ${x} + ${a*b} = ${result}.`}; }
  ],
  "Geometry": [() => { const r=int(2,9); return {q:`A circle has radius ${r} cm. Find its circumference to 1 decimal place. Use π = 3.14.`,a:round(2*3.14*r,1),unit:"cm",working:`Circumference = 2πr = 2 × 3.14 × ${r} = ${round(2*3.14*r,1)} cm.`}; }]
};

let current = null;
let score = 0;
let attempted = 0;
let revealed = false;

function makeQuestion() {
  const topic = $("#maths-topic").value;
  const tier = $("#maths-tier").value;
  let pool = topic === "Mixed" ? Object.entries(generators).flatMap(([name, list]) => list.map(fn => ({name, fn}))) : (generators[topic] || generators.Number).map(fn => ({name:topic,fn}));
  if (tier === "Higher") {
    const extras = topic === "Mixed" ? Object.entries(higherOnly).flatMap(([name,list])=>list.map(fn=>({name,fn}))) : (higherOnly[topic]||[]).map(fn=>({name:topic,fn}));
    pool = pool.concat(extras);
  }
  const chosen = pick(pool);
  current = {...chosen.fn(), topic:chosen.name};
  revealed = false;
  $("#maths-question-topic").textContent = `${current.topic} · GCSE ${tier}`;
  $("#maths-question-text").textContent = current.q;
  $("#maths-answer").value = "";
  $("#maths-feedback").textContent = "";
  $("#maths-working").hidden = true;
  $("#maths-reveal").textContent = "Show method";
  $("#maths-check").disabled = false;
  $("#maths-answer").focus();
}

export function initMathsPractice() {
  const root = $("#maths-practice");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "1";
  $("#maths-new-question").addEventListener("click", makeQuestion);
  $("#maths-topic").addEventListener("change", makeQuestion);
  $("#maths-tier").addEventListener("change", makeQuestion);
  $("#maths-check").addEventListener("click", () => {
    if (!current || revealed) return;
    const raw = $("#maths-answer").value.trim();
    if (!raw) { $("#maths-feedback").textContent = "Enter an answer first."; return; }
    attempted++;
    const typed = Number(raw.replace(/[£,]/g,""));
    const correct = current.text ? raw.replace(/\s/g,"").toLowerCase() === String(current.a).toLowerCase() : Number.isFinite(typed) && Math.abs(typed - Number(current.a)) < 0.011;
    if (correct) score++;
    $("#maths-feedback").textContent = correct ? "Correct. Nicely worked!" : `Not quite. The answer is ${current.a}${current.unit ? ` ${current.unit}` : ""}. Read the method below, then try another.`;
    $("#maths-score").textContent = `${score} / ${attempted} correct`;
    $("#maths-check").disabled = true;
    $("#maths-working").hidden = false;
    $("#maths-working").textContent = current.working;
    revealed = true;
  });
  $("#maths-reveal").addEventListener("click", () => {
    if (!current) return;
    const box = $("#maths-working");
    box.hidden = !box.hidden;
    $("#maths-reveal").textContent = box.hidden ? "Show method" : "Hide method";
    if (!box.hidden) box.textContent = current.working;
  });
  $("#maths-share-question").addEventListener("click", async () => {
    if (!current) return;
    const text = `${current.q}\n\nCan you help me solve this?`;
    try { await navigator.clipboard.writeText(text); $("#maths-share-status").textContent = "Question copied. Paste it into a friend or group chat."; }
    catch { $("#maths-share-status").textContent = "Select and copy the question to share it in a chat."; }
  });
  makeQuestion();
}
