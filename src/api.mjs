export function run({ row }) {
  const value = Number(row.display_value);
  return { id: row.id, value };
}
