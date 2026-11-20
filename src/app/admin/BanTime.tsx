"use client";

/** Shared ban date format, e.g. "12/30/3000, 3:00 PM". Runs in the browser, so it uses the viewer's timezone. */
export const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",     // full year: 3000, not 00
  hour: "numeric",
  minute: "2-digit",
});

export function BanTime({ iso, permanent }: { iso: string; permanent: boolean }) {
  if (permanent) return <span>Permanent</span>;
  return <time dateTime={iso}>{dateFmt.format(new Date(iso))}</time>;
}
