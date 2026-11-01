import { useEffect, useRef, useState } from 'react';

export function AnimatedCounter({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const start = shownRef.current;
    const diff = value - start;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      const cur = start + diff * (1 - Math.pow(1 - p, 3));
      shownRef.current = cur;
      setShown(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}
