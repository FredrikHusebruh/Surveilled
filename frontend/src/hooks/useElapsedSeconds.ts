import { useEffect, useState } from "react";

/**
 * A ticking clock anchored to the server's elapsed time. The server's figure is authoritative;
 * between responses this only adds the local time passed since `receivedAt`.
 */
export function useElapsedSeconds(serverSeconds: number, receivedAt: number, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!running) return serverSeconds;
  return serverSeconds + Math.max(0, Math.floor((now - receivedAt) / 1000));
}
