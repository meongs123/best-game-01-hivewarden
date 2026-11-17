// HIVEWARDEN — tiny WebAudio synth. No audio files, no network: every sound
// is an oscillator/noise burst made at runtime. All calls are guarded so a
// missing AudioContext can never break the game. M toggles mute.
let ctx = null;
let master = null;
let muted = false;

function ac() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch (_) {
    return null;
  }
}

function tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null) {
  const c = ac();
  if (!c || muted) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(c.currentTime + dur);
  } catch (_) { /* audio is decoration, never fatal */ }
}

function noise(dur, vol = 0.4, lowpass = 1200) {
  const c = ac();
  if (!c || muted) return;
  try {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowpass;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  } catch (_) { /* decoration */ }
}

export const sfx = {
  setMuted(m) { muted = m; },
  isMuted() { return muted; },
  click() { tone(660, 0.06, 'triangle', 0.3); },
  sting() { tone(880, 0.05, 'square', 0.12, 1200); },
  banish() { tone(520, 0.12, 'sine', 0.4, 940); },
  honey() { tone(990, 0.1, 'sine', 0.25); tone(1320, 0.14, 'sine', 0.2); },
  smoke() { noise(0.5, 0.35, 900); },
  hurt() { tone(180, 0.2, 'sawtooth', 0.4, 90); },
  flower() { tone(740, 0.12, 'triangle', 0.3); tone(1100, 0.16, 'triangle', 0.25); },
  boss() { tone(90, 0.6, 'sawtooth', 0.5, 55); noise(0.4, 0.25, 400); },
  dayClear() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.35), i * 110)); },
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.35), i * 130)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.3), i * 160)); },
};
