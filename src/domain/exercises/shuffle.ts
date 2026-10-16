function hash(seed: string): number {
  let value = 2166136261;
  for (const character of seed) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  }
  return value >>> 0;
}

/** A shuffle that gives the same order for the same seed, so an exercise looks the same on every visit. */
export function seededShuffle<Item>(items: readonly Item[], seed: string): readonly Item[] {
  const result = [...items];
  let state = hash(seed) || 1;
  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  for (let position = result.length - 1; position > 0; position -= 1) {
    const other = Math.floor(next() * (position + 1));
    const held = result[position];
    const swapped = result[other];
    if (held === undefined || swapped === undefined) continue;
    result[position] = swapped;
    result[other] = held;
  }
  return result;
}

/** Shuffles, and if the result happens to be the original order, rotates it so there is something to do. */
export function shuffledOtherwise<Item>(items: readonly Item[], seed: string): readonly Item[] {
  const shuffled = seededShuffle(items, seed);
  const unchanged =
    items.length > 1 && shuffled.every((item, position) => item === items[position]);
  return unchanged ? [...shuffled.slice(1), ...shuffled.slice(0, 1)] : shuffled;
}
