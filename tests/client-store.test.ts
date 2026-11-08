import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { create, act } from "react-test-renderer";
import { usePersistentState } from "../lib/clientStore.ts";

class FakeWindow extends EventTarget {
  values = new Map<string, string>();
  writes: string[] = [];
  localStorage = {
    getItem: (key: string) => this.values.get(key) ?? null,
    setItem: (key: string, value: string) => { this.writes.push(key); this.values.set(key, value); },
    removeItem: (key: string) => this.values.delete(key),
  };
}

test("persistent state never copies a previous key into a newly selected key", async () => {
  const win = new FakeWindow();
  win.values.set("one", "11"); win.values.set("two", "22");
  const previous = globalThis.window;
  globalThis.window = win as unknown as Window & typeof globalThis;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let state;
  function Harness({ name, enabled = true }: { name: string; enabled?: boolean }) {
    state = usePersistentState(name, 0, (raw) => typeof raw === "number" ? raw : null, { enabled });
    return null;
  }
  let root;
  try {
    await act(async () => { root = create(createElement(Harness, { name: "one" })); });
    assert.equal(state[0], 11);
    await act(async () => root.update(createElement(Harness, { name: "two" })));
    assert.equal(state[0], 22);
    assert.equal(win.values.get("one"), "11");
    assert.equal(win.values.get("two"), "22");
    await act(async () => root.update(createElement(Harness, { name: "missing" })));
    assert.equal(state[0], 0);
    assert.equal(win.values.get("missing"), "0");
    assert.equal(state[2].ready, true);

    await act(async () => root.update(createElement(Harness, { name: "two", enabled: false })));
    const writes = win.writes.length;
    await act(async () => state[1](99));
    assert.equal(win.writes.length, writes);
    await act(async () => root.update(createElement(Harness, { name: "two", enabled: true })));
    assert.equal(state[0], 22);
    assert.equal(win.values.get("two"), "22");
  } finally {
    await act(async () => root?.unmount());
    globalThis.window = previous;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
