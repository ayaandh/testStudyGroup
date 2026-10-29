import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStats,
  daysUntil,
  describeCountdown,
  describeDue,
  escapeHTML,
  formatClock,
  makeCode,
  parseCards,
  sanitizeNickname,
  shuffle,
  validNickname
} from "../helpers.js";

test("sanitizeNickname strips unsupported characters and falls back", () => {
  assert.equal(sanitizeNickname("Zoë Müller", "Learner x"), "Zoe Muller");
  assert.equal(sanitizeNickname("名前", "Learner x"), "Learner x");
  assert.equal(sanitizeNickname("A".repeat(40), "Learner x").length, 24);
  assert.equal(validNickname(sanitizeNickname("<b>Sam</b>", "Learner x")), true);
});

test("parseCards reads question | answer lines and skips bad ones", () => {
  const result = parseCards("Capital of France | Paris\n\nbroken line\nTwo | parts | here\n | empty question");
  assert.equal(result.cards.length, 2);
  assert.equal(result.cards[1].a, "parts | here");
  assert.equal(result.skipped, 2);
  const many = parseCards(Array.from({ length: 130 }, (_, index) => `q${index} | a${index}`).join("\n"));
  assert.equal(many.cards.length, 100);
  assert.equal(many.skipped, 30);
});

test("computeStats totals minutes, tasks and streak", () => {
  const now = new Date(2026, 9, 29, 15, 0, 0);
  const day = (offset, hour = 10) => new Date(2026, 9, 29 - offset, hour, 0, 0);
  const sessions = [
    { minutes: 25, date: day(0) },
    { minutes: 25, date: day(0, 12) },
    { minutes: 50, date: day(1) },
    { minutes: 30, date: day(2) },
    { minutes: 40, date: day(4) },
    { minutes: 99, date: day(12) }
  ];
  const stats = computeStats(sessions, [{ done: false }, { done: true }, { done: false }], now);
  assert.equal(stats.today, 50);
  assert.equal(stats.week, 170);
  assert.equal(stats.streak, 3);
  assert.equal(stats.open, 2);
  assert.equal(stats.bars.length, 7);
});

test("streak survives a day without a session until today ends", () => {
  const now = new Date(2026, 9, 29, 9, 0, 0);
  const stats = computeStats([{ minutes: 20, date: new Date(2026, 9, 28, 18, 0, 0) }], [], now);
  assert.equal(stats.streak, 1);
  assert.equal(stats.today, 0);
});

test("due and countdown labels", () => {
  const now = new Date(2026, 9, 29, 9, 0, 0);
  assert.equal(daysUntil("2026-10-30", now), 1);
  assert.equal(describeDue("2026-10-29", now), "Due today");
  assert.equal(describeDue("2026-10-30", now), "Due tomorrow");
  assert.equal(describeDue("2026-10-27", now), "Overdue by 2 days");
  assert.equal(describeDue("", now), "No due date");
  assert.equal(describeCountdown("2026-10-28", now), "Finished");
  assert.equal(describeCountdown("2026-11-12", now), "2w 0d to go".replace("2w 0d", "2 weeks"));
});

test("makeCode only uses unambiguous characters and has six of them", () => {
  const code = makeCode(Uint8Array.from([0, 1, 2, 250, 255, 128]));
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
});

test("shuffle keeps every card", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const result = shuffle(original);
  assert.deepEqual(result.slice().sort(), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("escapeHTML and formatClock", () => {
  assert.equal(escapeHTML('<img src="x" onerror=\'a\'>'), "&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt;");
  assert.equal(formatClock(1500), "25:00");
  assert.equal(formatClock(61), "01:01");
  assert.equal(formatClock(-4), "00:00");
});
