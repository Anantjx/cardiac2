/**
 * Sound effects utility for CardiaX UI interactions
 * Uses Web Audio API for lightweight, zero-dependency sound generation
 */

type SoundType = "click" | "success" | "error" | "pulse";

const audioContextStore: { context?: AudioContext } = {};

function getAudioContext(): AudioContext {
  if (!audioContextStore.context) {
    try {
      audioContextStore.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Audio context not available");
    }
  }
  return audioContextStore.context!;
}

/**
 * Click sound - short, light beep
 */
function playClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // silently fail
  }
}

/**
 * Success sound - ascending two-note beep
 */
function playSuccess() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    // First note
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // silently fail
  }
}

/**
 * Error sound - descending beep
 */
function playError() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // silently fail
  }
}

/**
 * Pulse sound - double beep
 */
function playPulse() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 750;
      osc.type = "sine";
      
      const startTime = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  } catch (e) {
    // silently fail
  }
}

export function playSound(type: SoundType = "click") {
  switch (type) {
    case "click":
      return playClick();
    case "success":
      return playSuccess();
    case "error":
      return playError();
    case "pulse":
      return playPulse();
  }
}
