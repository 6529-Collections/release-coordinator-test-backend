export function run({ row }) {
  const value = row.value * 2;
  return { id: row.id, value, display_value: value };
}
// Released together with a monitoring change.
