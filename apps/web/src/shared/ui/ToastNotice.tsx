import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function ToastNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState("");
  const last = useRef({ message: "", time: 0 });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!message) return;
    const now = Date.now();
    if (last.current.message === message && now - last.current.time < 10000) return;
    last.current = { message, time: now };
    setVisible(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(""), 5000);
  }, [message]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!visible) return null;
  return <div className="toast-notice" role="alert">
    <span>{visible}</span>
    <button type="button" aria-label="Dismiss notification" onClick={() => setVisible("")}><X size={15} /></button>
  </div>;
}
