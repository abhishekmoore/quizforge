import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStore } from "./memory.js";

describe("memory store", () => {
  it("inserts newest first and removes by id", async () => {
    const store = createMemoryStore();
    const first = await store.insert({
      title: "A",
      notesText: "notes a",
      result: { questions: [], source: "heuristic" },
    });
    const second = await store.insert({
      title: "B",
      notesText: "notes b",
      result: { questions: [], source: "heuristic" },
    });
    const listed = await store.list(10);
    assert.equal(listed[0]?.id, second.id);
    assert.equal(listed[1]?.id, first.id);
    assert.equal(await store.remove(first.id), true);
    assert.equal(await store.get(first.id), null);
    assert.equal(await store.remove("missing"), false);
  });
});
