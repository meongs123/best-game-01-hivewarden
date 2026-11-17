// HIVEWARDEN — synthesized sound effects via WebAudio. No audio files,
// no network. All sounds are tiny oscillators/noise bursts. Muteable.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) {
  muted = !!m;
}
export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol || 0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, vol, filterFreq) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq || 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(vol || 0.15, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t0);
}

export const sfx = {
  sting() {
    tone(880, 0.07, 'triangle', 0.08, 1400);
  },
  banish() {
    tone(520, 0.12, 'sine', 0.12, 180);
    noiseBurst(0.08, 0.08, 2400);
  },
  bossBanish() {
    tone(392, 0.3, 'sawtooth', 0.1, 80);
    tone(523, 0.25, 'triangle', 0.1, 120);
    noiseBurst(0.25, 0.14, 900);
  },
  hurt() {
    tone(160, 0.2, 'sawtooth', 0.14, 70);
  },
  hiveHit() {
    noiseBurst(0.12, 0.16, 500);
    tone(110, 0.15, 'square', 0.08, 60);
  },
  honey() {
    tone(1046, 0.09, 'sine', 0.07, 1568);
  },
  flower() {
    tone(660, 0.12, 'sine', 0.09, 990);
    tone(990, 0.1, 'sine', 0.06, 1320);
  },
  smoke() {
    noiseBurst(0.3, 0.12, 700);
  },
  click() {
    tone(700, 0.05, 'square', 0.05, 900);
  },
  upgrade() {
    tone(523, 0.1, 'triangle', 0.1);
    setTimeout(() => tone(659, 0.1, 'triangle', 0.1), 90);
    setTimeout(() => tone(784, 0.16, 'triangle', 0.11), 180);
  },
  dayClear() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.1), i * 110));
  },
  victory() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.11), i * 130));
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.1), i * 160));
  },
  boss() {
    tone(98, 0.5, 'sawtooth', 0.12, 49);
    noiseBurst(0.4, 0.1, 400);
  },
};
