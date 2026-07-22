/** Kennzahl-Karte: Label klein und versal, Wert als Serifenziffer. */
export const StatKarte = ({
  label,
  wert,
  detail,
}: {
  readonly label: string;
  readonly wert: string;
  readonly detail?: string;
}) => (
  <div className="border border-border bg-surface p-4 shadow-card">
    <p className="text-ink-faint text-xs uppercase tracking-widest">{label}</p>
    <p className="mt-1 font-display text-3xl text-ink tracking-tight">{wert}</p>
    {detail === undefined ? null : (
      <p className="mt-1 text-ink-muted text-sm">{detail}</p>
    )}
  </div>
);
