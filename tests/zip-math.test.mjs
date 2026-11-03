import test from "node:test";
import assert from "node:assert/strict";
import { generateQuestion, topics } from "../zip-math-engine.js";

test("question generator covers every advertised topic", () => {
  for (const topic of topics) {
    const q = generateQuestion(topic.id, "foundation");
    assert.equal(q.topic, topic.id);
    assert.ok(q.prompt.length > 10);
    assert.ok(q.answer.length > 0);
    assert.ok(q.working.length > 10);
  }
});

test("mixed practice always returns a valid GCSE maths question", () => {
  for (let i = 0; i < 200; i++) {
    const q = generateQuestion("mixed", i % 2 ? "higher" : "foundation");
    assert.ok(topics.some(topic => topic.id === q.topic));
    assert.ok(q.answer.trim());
  }
});

test("question answers are finite values or simplified fractions", () => {
  for (const topic of topics) {
    for (let i = 0; i < 40; i++) {
      const answer = generateQuestion(topic.id).answer;
      assert.ok(/^(-?\d+(?:\.\d+)?|\d+\/\d+)$/.test(answer), `${topic.id}: ${answer}`);
    }
  }
});
