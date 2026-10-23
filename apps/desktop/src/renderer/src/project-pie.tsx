/** A small pie that fills as a project's actions get done. */
export const ProjectPie = ({
  done,
  total,
}: {
  done: number;
  total: number;
}) => {
  const share = total === 0 ? 0 : done / total;
  const angle = share * 2 * Math.PI;
  const x = 8 + 5 * Math.sin(angle);
  const y = 8 - 5 * Math.cos(angle);
  const largeArc = share > 0.5 ? 1 : 0;

  return (
    <svg aria-hidden fill="none" height={16} viewBox="0 0 16 16" width={16}>
      <circle cx={8} cy={8} r={6.5} stroke="#A5A5A2" strokeWidth={1.5} />
      {share >= 1 ? <circle cx={8} cy={8} fill="#A5A5A2" r={5} /> : null}
      {share > 0 && share < 1 ? (
        <path d={`M8 8 L8 3 A5 5 0 ${largeArc} 1 ${x} ${y} Z`} fill="#A5A5A2" />
      ) : null}
    </svg>
  );
};
