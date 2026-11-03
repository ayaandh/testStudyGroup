export const topics = [
  { id: "number", name: "Number", tier: "Foundation & Higher" },
  { id: "fractions", name: "Fractions", tier: "Foundation & Higher" },
  { id: "percentages", name: "Percentages", tier: "Foundation & Higher" },
  { id: "ratio", name: "Ratio & proportion", tier: "Foundation & Higher" },
  { id: "algebra", name: "Algebra", tier: "Foundation & Higher" },
  { id: "sequences", name: "Sequences", tier: "Foundation & Higher" },
  { id: "geometry", name: "Area & perimeter", tier: "Foundation & Higher" },
  { id: "probability", name: "Probability", tier: "Foundation & Higher" }
];
const pick = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const simplify = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const money = n => Number.isInteger(n) ? String(n) : n.toFixed(2);

export function generateQuestion(topic = "mixed", tier = "foundation") {
  const id = topic === "mixed" ? topics[pick(0, topics.length - 1)].id : topic;
  let q;
  if (id === "number") {
    const a = pick(12, tier === "higher" ? 240 : 90), b = pick(2, 12), op = pick(0, 2);
    if (op === 0) q = { prompt: `Calculate ${a} + ${b}.`, answer: String(a + b), working: `${a} + ${b} = ${a + b}.` };
    if (op === 1) q = { prompt: `Calculate ${a} − ${b}.`, answer: String(a - b), working: `${a} − ${b} = ${a - b}.` };
    if (op === 2) q = { prompt: `Calculate ${a} × ${b}.`, answer: String(a * b), working: `${a} × ${b} = ${a * b}.` };
  } else if (id === "fractions") {
    const a = pick(1, 5), b = pick(a + 1, 9), c = pick(1, 4), d = pick(c + 1, 9);
    const n = a * d + c * b, den = b * d;
    q = { prompt: `Work out ${a}/${b} + ${c}/${d}. Give your answer in its simplest form.`, answer: simplify(n, den), working: `Use a common denominator: ${a}/${b} = ${a*d}/${den} and ${c}/${d} = ${c*b}/${den}. Add to get ${n}/${den}, then simplify to ${simplify(n, den)}.` };
  } else if (id === "percentages") {
    const p = [5, 10, 15, 20, 25, 30, 40, 50, 75][pick(0, 8)], value = pick(2, 20) * 20;
    const ans = value * p / 100;
    q = { prompt: `Find ${p}% of ${value}.`, answer: money(ans), working: `${p}% = ${p}/100, so ${value} × ${p}/100 = ${money(ans)}.` };
  } else if (id === "ratio") {
    const a = pick(1, 5), b = pick(1, 5), total = (a + b) * pick(3, 12), ask = pick(0, 1) ? a : b;
    q = { prompt: `A sum of £${total} is shared in the ratio ${a}:${b}. How much does the ${ask === a ? "first" : "second"} person receive?`, answer: money(total / (a + b) * ask), working: `There are ${a + b} parts. One part is £${total}/${a + b} = £${total/(a+b)}. Multiply by ${ask}: £${money(total/(a+b)*ask)}.` };
  } else if (id === "algebra") {
    const x = pick(2, 12), a = pick(2, 8), b = pick(1, 15), c = a * x + b;
    q = { prompt: `Solve the equation: ${a}x + ${b} = ${c}.`, answer: String(x), working: `Subtract ${b}: ${a}x = ${c-b}. Divide by ${a}: x = ${x}.` };
  } else if (id === "sequences") {
    const first = pick(1, 15), diff = pick(2, 8), term = pick(6, 12), value = first + (term - 1) * diff;
    q = { prompt: `A linear sequence begins ${first}, ${first+diff}, ${first+2*diff}, … Find the ${term}th term.`, answer: String(value), working: `The common difference is ${diff}. Term ${term} = ${first} + (${term} − 1) × ${diff} = ${value}.` };
  } else if (id === "geometry") {
    const l = pick(3, 18), w = pick(2, 12);
    q = { prompt: `A rectangle has length ${l} cm and width ${w} cm. Find its area in cm².`, answer: String(l*w), working: `Area = length × width = ${l} × ${w} = ${l*w} cm².` };
  } else {
    const red = pick(1, 5), blue = pick(1, 5), total = red + blue;
    q = { prompt: `A bag contains ${red} red counters and ${blue} blue counters. One counter is chosen at random. What is the probability it is red? Give a fraction in its simplest form.`, answer: simplify(red, total), working: `There are ${total} counters altogether and ${red} are red. Probability = ${red}/${total} = ${simplify(red,total)}.` };
  }
  return { ...q, topic: id, topicName: topics.find(t => t.id === id).name, tier };
}

