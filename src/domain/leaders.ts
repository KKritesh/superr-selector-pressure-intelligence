export function leaders(
  values: (number | null)[],
  precision = 1,
  lowerIsBetter = false,
): Set<number> {
  const valid = values.flatMap((value, index) =>
    value === null ? [] : [{ value: Number(value.toFixed(precision)), index }],
  );
  if (valid.length < 2) return new Set();
  const best = lowerIsBetter
    ? Math.min(...valid.map((v) => v.value))
    : Math.max(...valid.map((v) => v.value));
  return new Set(valid.filter((v) => v.value === best).map((v) => v.index));
}
