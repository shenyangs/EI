type ProgressStripProps = {
  label: string;
  value: number;
};

export function ProgressStrip({ label, value }: ProgressStripProps) {
  return (
    <div className="progress-strip">
      <div className="progress-strip__head">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="progress-strip__track" aria-hidden="true">
        <div className="progress-strip__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
