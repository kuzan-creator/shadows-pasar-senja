// All sound is synthesized with WebAudio — no audio files, no network.
// Footsteps tick softly, a thrown coin clinks, a rising alarm warns when a
// guard turns suspicious, and a short jingle plays on a clean getaway.
// Audio starts only after the first user gesture (browser autoplay rule).

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.enabled = true;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  startAmbient() {
    // Low night drone: two detuned sine waves through a slow LFO.
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 55;
    osc2.frequency.value = 55.7;
    gain.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.master);
    osc1.start();
    osc2.start();
    lfo.start();
    this.ambient = { osc1, osc2, lfo };
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  footstep(sneaking) {
    // Soft thud; sneaking is barely audible.
    this.blip(sneaking ? 90 : 120, 0.07, 'triangle', sneaking ? 0.05 : 0.12);
  }

  guardStep() {
    this.blip(70, 0.09, 'triangle', 0.08);
  }

  coinClink() {
    this.blip(1900, 0.12, 'sine', 0.25);
    this.blip(2400, 0.18, 'sine', 0.18, 0.07);
  }

  pickup() {
    this.blip(660, 0.12, 'sine', 0.22);
    this.blip(990, 0.2, 'sine', 0.22, 0.09);
  }

  suspicious() {
    // Two-note warning when a guard grows suspicious.
    this.blip(330, 0.16, 'square', 0.1);
    this.blip(415, 0.22, 'square', 0.1, 0.14);
  }

  alarm() {
    // Rising three-note alarm when a guard gives chase.
    this.blip(440, 0.18, 'sawtooth', 0.14);
    this.blip(554, 0.18, 'sawtooth', 0.14, 0.16);
    this.blip(659, 0.3, 'sawtooth', 0.14, 0.32);
  }

  caught() {
    this.blip(220, 0.25, 'sawtooth', 0.18);
    this.blip(165, 0.4, 'sawtooth', 0.18, 0.2);
  }

  winJingle() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.blip(n, 0.25, 'sine', 0.22, i * 0.13));
  }
}
