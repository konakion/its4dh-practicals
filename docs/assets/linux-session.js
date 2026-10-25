/*
 * Main-thread client for shell-worker.js. One LinuxSession = one real Linux VM.
 * Usage:
 *   const linux = new LinuxSession(files, onState, { prelude: 'PATH=...' });
 *   await linux.ready;
 *   const r = await linux.exec('ls -l', 'optional probe');
 */
(() => {
  'use strict';
  const base = document.currentScript.src;
  const HARD_LIMIT_MS = 30000; // the worker stops runaway commands after 10 s itself

  class LinuxSession {
    constructor(files, onState = () => {}, options = {}) {
      this.files = files;
      this.prelude = options.prelude || '';
      this.onState = onState;
      this.seq = 0;
      this.pending = new Map();
      this.start();
    }

    start() {
      this.worker?.terminate();
      for (const p of this.pending.values()) p.reject(Error('Linux was restarted.'));
      this.pending.clear();
      this.state = 'booting';
      this.onState('booting');
      this.worker = new Worker(new URL('shell-worker.js', base));
      this.worker.onmessage = ({ data }) => {
        const p = this.pending.get(data.id);
        if (!p) return;
        this.pending.delete(data.id);
        clearTimeout(p.timer);
        if (data.type === 'error') p.reject(Error(data.message)); else p.resolve(data);
      };
      this.worker.onerror = event => this.fail('The Linux runtime stopped: ' + (event.message || 'unknown error'));
      this.ready = this.loadFiles()
        .then(files => this.call({ type: 'boot', files }, 120000))
        .then(() => { this.state = 'ready'; this.onState('ready'); })
        .catch(error => { this.fail(error.message); throw error; });
      this.ready.catch(() => {});
      return this.ready;
    }

    async loadFiles() {
      return Promise.all(this.files.map(async f => {
        const response = await fetch(new URL(f.url, base));
        if (!response.ok) throw Error('Could not load ' + f.path);
        return { path: f.path, readOnly: !!f.readOnly, exec: !!f.exec, content: await response.text() };
      }));
    }

    call(message, timeout = HARD_LIMIT_MS) {
      const id = ++this.seq;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(Error('Linux stopped responding and was restarted. Your files were reset.'));
          this.start();
        }, timeout);
        this.pending.set(id, { resolve, reject, timer });
        this.worker.postMessage({ ...message, id });
      });
    }

    fail(message) {
      this.state = 'failed';
      this.onState('failed', message);
    }

    async exec(command, probe) {
      await this.ready;
      this.onState('running');
      try { return await this.call({ type: 'exec', command, probe, prelude: this.prelude }); }
      finally { if (this.state === 'ready') this.onState('ready'); }
    }

    async reset() {
      this.state = 'booting'; this.onState('booting');
      await this.ready;
      await this.call({ type: 'reset' });
      this.state = 'ready'; this.onState('ready');
    }

    restart() { return this.start(); }
  }

  window.LinuxSession = LinuxSession;
})();
