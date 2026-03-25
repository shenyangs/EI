type StatusBadgeProps = {
  tone?: "default" | "amber" | "sage" | "rose";
  children: React.ReactNode;
};

export function StatusBadge({ tone = "default", children }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
