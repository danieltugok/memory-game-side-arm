import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScore } from "./scores.js";

const ok = { name: " Ana ", level: "easy", timeMs: 25_000, moves: 9 };

test("accepts a real score and trims the name", () => {
  assert.deepEqual(validateScore(ok), { ...ok, name: "Ana" });
});

test("rejects impossible or malformed scores", () => {
  for (const bad of [
    { name: "" },
    { name: "x".repeat(21) },
    { name: 42 },
    { level: "insane" },
    { level: "constructor" },
    { moves: 5 }, // fewer moves than pairs
    { moves: 9.5 },
    { timeMs: 100 },
    { timeMs: "25000" },
  ]) {
    assert.equal(validateScore({ ...ok, ...bad }), null, JSON.stringify(bad));
  }
  assert.equal(validateScore(undefined), null);
  assert.equal(validateScore(null), null);
});
