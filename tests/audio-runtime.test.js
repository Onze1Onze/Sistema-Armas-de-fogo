import test from "node:test";
import assert from "node:assert/strict";

test("dois disparos rápidos não reutilizam o mesmo Audio enquanto play() está pendente", async () => {
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  const originalWebkitAudioContext = Object.getOwnPropertyDescriptor(globalThis, "webkitAudioContext");
  const warnings = console.warn;
  const instances = [];

  class PendingAudio {
    constructor() {
      this.src = "";
      this.paused = true;
      this.ended = false;
      this.playCalls = 0;
      this.listeners = new Map();
      instances.push(this);
    }
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) ?? [];
      callbacks.push(callback);
      this.listeners.set(type, callbacks);
    }
    removeEventListener(type, callback) {
      this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== callback));
    }
    load() {}
    play() {
      this.playCalls += 1;
      // Simulates WebViews that keep the paused flag true until the play promise settles.
      return new Promise(() => {});
    }
  }

  try {
    globalThis.Audio = PendingAudio;
    delete globalThis.AudioContext;
    delete globalThis.webkitAudioContext;
    const sound = await import(new URL("../src/sound.js?audio-pool-regression", import.meta.url).href);
    await sound.preloadWeaponAudio();

    sound.playWeaponShot("pistol");
    sound.playWeaponShot("pistol");

    const players = instances.filter((audio) => audio.src.includes("/assault-rifle-fire.ogg"));
    const usedPlayers = players.filter((audio) => audio.playCalls > 0);
    assert.equal(usedPlayers.length, 2);
    assert.ok(usedPlayers.every((audio) => audio.playCalls === 1));
  } finally {
    console.warn = warnings;
    if (originalAudio) Object.defineProperty(globalThis, "Audio", originalAudio);
    else delete globalThis.Audio;
    if (originalAudioContext) Object.defineProperty(globalThis, "AudioContext", originalAudioContext);
    else delete globalThis.AudioContext;
    if (originalWebkitAudioContext) Object.defineProperty(globalThis, "webkitAudioContext", originalWebkitAudioContext);
    else delete globalThis.webkitAudioContext;
  }
});

test("falha ao construir HTMLAudio não impede a inicialização do módulo", async () => {
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  const originalWebkitAudioContext = Object.getOwnPropertyDescriptor(globalThis, "webkitAudioContext");
  const warnings = console.warn;

  try {
    console.warn = () => {};
    globalThis.Audio = class BrokenAudio {
      constructor() {
        throw new Error("Audio backend unavailable");
      }
    };
    delete globalThis.AudioContext;
    delete globalThis.webkitAudioContext;

    const sound = await import(new URL("../src/sound.js?audio-constructor-regression", import.meta.url).href);
    await assert.doesNotReject(sound.preloadWeaponAudio());
  } finally {
    console.warn = warnings;
    if (originalAudio) Object.defineProperty(globalThis, "Audio", originalAudio);
    else delete globalThis.Audio;
    if (originalAudioContext) Object.defineProperty(globalThis, "AudioContext", originalAudioContext);
    else delete globalThis.AudioContext;
    if (originalWebkitAudioContext) Object.defineProperty(globalThis, "webkitAudioContext", originalWebkitAudioContext);
    else delete globalThis.webkitAudioContext;
  }
});
