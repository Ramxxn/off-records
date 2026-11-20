export function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function attendanceCsv(
  records: Array<{
    employeeName: string;
    checkInAt: string;
    checkOutAt: string | null;
    notes: string | null;
  }>,
): string {
  const rows = [
    ['Employee', 'Check-in (UTC)', 'Check-out (UTC)', 'Hours', 'Notes'],
    ...records.map((record) => {
      const duration = record.checkOutAt
        ? (new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 3_600_000
        : null;
      return [
        record.employeeName,
        record.checkInAt,
        record.checkOutAt,
        duration === null ? null : duration.toFixed(2),
        record.notes,
      ];
    }),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
