export function TableSkeleton({ rows = 8, cols = 6 }) {
  const r = Array.from({ length: rows }, (_, i) => i);
  const c = Array.from({ length: cols }, (_, i) => i);
  return (
    <tbody>
      {r.map((ri) => (
        <tr key={ri}>
          {c.map((ci) => (
            <td key={ci}>
              <div className="admin-skel" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

