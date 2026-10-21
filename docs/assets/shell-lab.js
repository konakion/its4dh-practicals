/* UI for the grep vertical prototype. All command execution happens in Linux. */
(() => {
  const scriptURL = document.currentScript.src;
  const el = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
  window.mountShellLab = (host, step, complete) => {
    host.append(el('h4','Example · count warning records'), el('pre', "grep -c ' WARN ' data/upload_small.log"), el('p','Output: 1 — one warning record matches.'));
    host.append(el('h4','Your transfer task'), el('p','Count ERROR records in data/upload_small.log. Print only the count. Choose any Linux command or pipeline that produces this result.'));
    const form = el('form'), label = el('label','Your Linux shell command');
    const input = el('textarea'); input.id = 'shell-command'; label.htmlFor = input.id;
    input.rows = 2; input.required = true; input.spellcheck = false; input.maxLength = 8192;
    const run = el('button','Run / Submit'); run.type = 'submit'; run.disabled = true;
    const reset = el('button','Restart Linux'); reset.type = 'button';
    const status = el('p','Starting real Linux in your browser…'); status.setAttribute('role','status');
    const out = el('pre','Run a command to see its output.'), err = el('pre','');
    out.setAttribute('aria-label','Standard output'); err.setAttribute('aria-label','Standard error');
    const feedback = el('p'); feedback.setAttribute('aria-live','polite');
    form.append(label,input,run,reset,status,el('h4','Output'),out,el('h4','Errors'),err,feedback); host.append(form);
    host.append(el('p','Commands run in isolated browser Linux. Each run starts with fresh files. Runs stop after 10 seconds.'));
    let worker, watchdog, generation = 0, expected;
    const invalidate = () => { complete(false); feedback.textContent = ''; };
    input.addEventListener('input',invalidate);
    async function boot() {
      const current = ++generation;
      worker?.terminate(); clearTimeout(watchdog); run.disabled = true; reset.disabled = false; invalidate();
      status.textContent = 'Starting real Linux in your browser…';
      try {
        const fetchFile = async name => { const r = await fetch(new URL('fixtures/' + name, scriptURL)); if (!r.ok) throw Error('Fixture unavailable: ' + name); return r.text(); };
        const [small, large] = await Promise.all(['upload_small.log','upload.log'].map(fetchFile));
        if (current !== generation) return;
        expected = small.trimEnd().split('\n').filter(line => line.split(' ')[1] === 'ERROR').length;
        worker = new Worker(new URL('shell-worker.js', scriptURL));
        watchdog = setTimeout(() => failed('Linux startup timed out. Restart Linux to try again.'),90000);
        worker.onerror = event => failed('Linux runtime failed: ' + event.message);
        worker.onmessage = ({data}) => {
          clearTimeout(watchdog);
          if (data.type === 'ready') { status.textContent = 'Linux ready · working directory /root/lab'; run.disabled = false; }
          if (data.type === 'error') failed(data.message);
          if (data.type === 'result') {
            run.disabled = false; reset.disabled = false;
            out.textContent = data.stdout || '(no output)'; err.textContent = data.stderr || '(none)';
            status.textContent = 'Exit status: ' + data.status;
            // Grade observed stdout, never inspect or restrict the submitted command.
            const value = data.stdout.trim();
            const ok = data.status === 0 && /^\d+$/.test(value) && Number(value) === expected;
            complete(ok); feedback.className = ok ? 'lab-success' : 'lab-retry';
            feedback.textContent = ok ? 'Correct: four recorded failed attempts. Now answer the recall question.' : 'Not yet. Print only the ERROR count; check the filename and letter case. Errors and exit status above come from Linux.';
          }
        };
        worker.postMessage({type:'boot',files:{'upload_small.log':small,'upload.log':large}});
      } catch (error) { failed(error.message); }
    }
    function failed(message) { worker?.terminate(); clearTimeout(watchdog); run.disabled = true; reset.disabled = false; status.textContent = message; complete(false); }
    form.addEventListener('submit', event => {
      event.preventDefault(); if (run.disabled) return; invalidate(); run.disabled = true; reset.disabled = true;
      out.textContent = '(running)'; err.textContent = ''; status.textContent = 'Running in Linux…';
      watchdog = setTimeout(() => failed('Stopped after 10 seconds. The VM was discarded. Restart Linux to continue.'),10000);
      worker.postMessage({type:'run',command:input.value});
    });
    reset.addEventListener('click',boot); window.addEventListener('pagehide',()=>worker?.terminate(),{once:true}); boot();
  };
})();
