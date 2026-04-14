// Polyfill WeakRef for Hermes engine (Release mode) which may not support it
if (typeof globalThis.WeakRef === "undefined") {
  globalThis.WeakRef = class WeakRef {
    constructor(target) {
      this._target = target;
    }
    deref() {
      return this._target;
    }
  };
}

import "expo-router/entry";
