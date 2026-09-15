export function run({ row }) {
  const value = Number(row.value);
  return { id: row.id, value };
}

// This second commit exercises recovery with a new immutable request.
