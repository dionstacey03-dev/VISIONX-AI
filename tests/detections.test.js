import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleDetections, summarize } from '../src/detections.js';

test('threshold excludes uncertain and invalid predictions, including after a slider change', () => {
  const predictions = [{ class: 'person', score: 0.9 }, { class: 'cat', score: 0.5 }, { class: 'dog', score: 0.3 }, { class: 'car', score: NaN }];
  assert.deepEqual(visibleDetections(predictions, 0.5).map((p) => p.class), ['person', 'cat']);
  assert.deepEqual(visibleDetections(predictions, 0.95), []);
});

test('groups repeated classes with instance count and highest confidence', () => {
  assert.deepEqual(summarize([{ class: 'cat', score: 0.7 }, { class: 'person', score: 0.9 }, { class: 'cat', score: 0.8 }]), [
    { label: 'person', count: 1, score: 0.9 },
    { label: 'cat', count: 2, score: 0.8 },
  ]);
  assert.deepEqual(summarize([]), []);
});
