export function visibleDetections(predictions, threshold) {
  return predictions.filter((item) => Number.isFinite(item.score) && item.score >= threshold);
}

export function summarize(predictions) {
  const groups = new Map();
  for (const item of predictions) {
    const group = groups.get(item.class) ?? { label: item.class, count: 0, score: 0 };
    group.count += 1;
    group.score = Math.max(group.score, item.score);
    groups.set(item.class, group);
  }
  return [...groups.values()].sort((a, b) => b.score - a.score);
}
