type ProgressStripProps = {
  label: string;
  value: number;
};

function describeProgress(value: number) {
  if (value >= 100) return "已锁定";
  if (value >= 80) return "已成型";
  if (value >= 50) return "推进中";
  if (value > 0) return "已启动";
  return "待开始";
}

export function ProgressStrip({ label, value }: ProgressStripProps) {
  return (
    <div className="progress-strip">
      <div className="progress-strip__head">
        <span>{label}</span>
        <span>{describeProgress(value)}</span>
      </div>
      <div className="progress-strip__track" aria-hidden="true">
        <div className="progress-strip__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
