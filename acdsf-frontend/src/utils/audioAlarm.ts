/**
 * ACDSF — High-Fidelity Web Audio Alarm & Synthesizer
 * Supports procedural Web Audio synthesis + pure PCM WAV fallback
 * Overcomes browser autoplay policy via global gesture unlock
 */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

// Generate a fallback WAV data URI (tactical alert chirp)
function generateWavBeep(freq = 880, durationMs = 250, sampleRate = 22050): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // PCM data
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope: quick attack, smooth decay
    const env = Math.max(0, 1 - i / numSamples);
    const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.45;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Convert array buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Cached fallback audio URIs
let cachedCriticalWav: string | null = null;
let cachedWarningWav: string | null = null;
let cachedPingWav: string | null = null;

function playHtmlAudioFallback(type: 'critical' | 'warning' | 'chime' | 'ping') {
  try {
    if (!cachedCriticalWav) cachedCriticalWav = generateWavBeep(980, 400);
    if (!cachedWarningWav) cachedWarningWav = generateWavBeep(660, 250);
    if (!cachedPingWav) cachedPingWav = generateWavBeep(1200, 180);

    const uri = type === 'critical' ? cachedCriticalWav : type === 'warning' ? cachedWarningWav : cachedPingWav;
    const audio = new Audio(uri);
    audio.volume = 0.5;
    audio.play().catch((err) => console.debug('HTML Audio fallback playback handled:', err));
  } catch (err) {
    console.debug('HTML Audio creation failed:', err);
  }
}

/**
 * Initializes and unlocks the Web Audio context upon any user gesture
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {
        // Ignored
      });
    } else if (audioCtx && audioCtx.state === 'running') {
      audioUnlocked = true;
    }
  } catch {
    // Fallback available
  }
}

// Attach automatic gesture unlock listeners in browser
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudio();
    // Keep listening or cleanup after confirmed running
    if (audioCtx && audioCtx.state === 'running') {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    }
  };

  window.addEventListener('click', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleInteraction, { passive: true });
  window.addEventListener('touchstart', handleInteraction, { passive: true });
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    unlockAudio();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('acdsf_audio_alarm');
  // Default to enabled (1) if null or undefined
  return stored !== '0';
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('acdsf_audio_alarm', enabled ? '1' : '0');
  // Broadcast update to all components
  window.dispatchEvent(new CustomEvent('acdsf-audio-change', { detail: { enabled } }));
  if (enabled) {
    unlockAudio();
  }
}

/**
 * Tactical cyber acoustic ping (used on unmute / test button)
 */
export function playAcousticPing(): void {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();

  if (!ctx || ctx.state !== 'running') {
    playHtmlAudioFallback('ping');
    return;
  }

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1174.66, now); // D6
    osc.frequency.exponentialRampToValueAtTime(1760.0, now + 0.08); // A6

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  } catch {
    playHtmlAudioFallback('ping');
  }
}

/**
 * Play a high-urgency critical breach siren (alternating warble frequencies)
 */
export function playCriticalAlarm(): void {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();

  if (!ctx || ctx.state !== 'running') {
    playHtmlAudioFallback('critical');
    return;
  }

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Frequency modulation for siren warble
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.25);
    osc.frequency.linearRampToValueAtTime(920, now + 0.5);
    osc.frequency.linearRampToValueAtTime(440, now + 0.75);
    osc.frequency.linearRampToValueAtTime(960, now + 1.0);
    osc.frequency.linearRampToValueAtTime(440, now + 1.25);

    // Gain envelope
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.setValueAtTime(0.25, now + 1.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.35);
  } catch {
    playHtmlAudioFallback('critical');
  }
}

/**
 * Play a high-tech warning alert (dual-tone chirp)
 */
export function playWarningAlarm(): void {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();

  if (!ctx || ctx.state !== 'running') {
    playHtmlAudioFallback('warning');
    return;
  }

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.setValueAtTime(0.22, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    playHtmlAudioFallback('warning');
  }
}

/**
 * Play a positive confirmation / containment chime (ascending arpeggio)
 */
export function playContainmentChime(): void {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();

  if (!ctx || ctx.state !== 'running') {
    playHtmlAudioFallback('chime');
    return;
  }

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!ctx) return;
      const noteTime = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.01, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  } catch {
    playHtmlAudioFallback('chime');
  }
}

/**
 * Play an alert sound matching severity
 */
export function playAlertSound(severity?: string): void {
  const sev = (severity || 'HIGH').toUpperCase();
  if (sev === 'CRITICAL') {
    playCriticalAlarm();
  } else if (sev === 'CONTAINED' || sev === 'RESOLVED') {
    playContainmentChime();
  } else {
    playWarningAlarm();
  }
}
