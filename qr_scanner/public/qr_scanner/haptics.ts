export function beep(freq = 660, ms = 120) {
  try {
    const a = new (window as any).AudioContext();
    const o = a.createOscillator(); const g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = freq; o.start();
    setTimeout(() => { o.stop(); a.close(); }, ms);
  } catch {}
}

export function vibrate(ms = 60) {
  try { navigator.vibrate?.(ms); } catch {}
}