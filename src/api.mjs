export function run({ row }) {
  const value = Number(row.value);
  return { id: row.id, value };
}
