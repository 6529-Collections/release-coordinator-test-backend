export function run({ row }) { if ('display_value' in row) throw new Error('Controlled incompatibility with schema 2'); return { id: row.id, value: row.value }; }
