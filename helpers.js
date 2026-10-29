export const SUBJECTS = [
  "General",
  "Maths",
  "English Language",
  "English Literature",
  "Biology",
  "Chemistry",
  "Physics",
  "Combined Science",
  "History",
  "Geography",
  "Computer Science",
  "Languages",
  "Religious Studies",
  "Other"
];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export function cleanNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function validNickname(value) {
  return /^[A-Za-z0-9 _.-]{2,24}$/.test(value);
}

export function sanitizeNickname(value, fallback) {
  const stripped = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _.-]/g, "");
  const cleaned = cleanNickname(stripped).slice(0, 24).trim();
  return validNickname(cleaned) ? cleaned : fallback;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function daysUntil(dateString, now = new Date()) {
  const target = new Date(`${dateString}T00:00:00`);
  return Math.round((target - startOfDay(now)) / 86400000);
}

export function formatDay(dateString) {
  const target = new Date(`${dateString}T00:00:00`);
  return `${target.getDate()} ${MONTHS[target.getMonth()]}`;
}

export function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function describeDue(dateString, now = new Date()) {
  if (!dateString) return "No due date";
  const days = daysUntil(dateString, now);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days === -1) return "Overdue by 1 day";
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  if (days < 7) return `Due in ${days} days`;
  return `Due ${formatDay(dateString)}`;
}

export function describeCountdown(dateString, now = new Date()) {
  const days = daysUntil(dateString, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return "Finished";
  if (days < 14) return `${days} days to go`;
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  return rest ? `${weeks}w ${rest}d to go` : `${weeks} weeks to go`;
}

export function parseCards(text) {
  const cards = [];
  let skipped = 0;
  String(text || "").split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/\s*\|\s*|\t+/);
    if (parts.length < 2) {
      skipped += 1;
      return;
    }
    const question = parts[0].trim();
    const answer = parts.slice(1).join(" | ").trim();
    const valid = question.length >= 1 && question.length <= 200 && answer.length >= 1 && answer.length <= 400;
    if (!valid || cards.length >= 100) {
      skipped += 1;
      return;
    }
    cards.push({ q: question, a: answer });
  });
  return { cards, skipped };
}

export function shuffle(list, random = Math.random) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function makeCode(randomValues) {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[randomValues[index] % CODE_ALPHABET.length];
  }
  return code;
}

export function computeStats(sessions, tasks, now = new Date()) {
  const minutesByDay = new Map();
  sessions.forEach((session) => {
    if (!session.date) return;
    const key = dateKey(session.date);
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + session.minutes);
  });

  const today = startOfDay(now);
  const bars = [];
  let week = 0;
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const minutes = minutesByDay.get(dateKey(day)) || 0;
    week += minutes;
    bars.push({ key: dateKey(day), label: WEEKDAYS[day.getDay()], minutes });
  }

  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!minutesByDay.has(dateKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  let streak = 0;
  while (minutesByDay.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }

  return {
    today: minutesByDay.get(dateKey(today)) || 0,
    week,
    streak,
    open: tasks.filter((task) => !task.done).length,
    bars
  };
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
