/*
 * Real Linux in a Web Worker.
 *
 * v86 (x86 emulator compiled to WebAssembly) boots a Buildroot Linux 6.8 image
 * with BusyBox. Nothing here interprets shell commands in JavaScript: every
 * command is written to a file and executed by /bin/sh inside the guest.
 *
 * Isolation: no network adapter, no host directory mount. The guest's 9p share
 * (/mnt) is an in-memory browser filesystem used only to pass the command in and
 * stdout/stderr out. Commands run as the unprivileged user "student".
 *
 * Session model: the root login shell on ttyS0 stays alive and remembers the
 * student's current directory. Files persist between runs until reset() restores
 * the snapshot taken right after boot.
 */
importScripts('linux/libv86.js');

const HOME = '/home/student';
const RUN_TIMEOUT_MS = 10000;
let vm, snapshot, waiting = null, serial = '';
const enc = s => new TextEncoder().encode(s);
const dec = b => new TextDecoder().decode(b);

function until(marker, timeout) {
  return new Promise(resolve => {
    const timer = setTimeout(() => { waiting = null; resolve(false); }, timeout);
    waiting = { marker, done: () => { clearTimeout(timer); waiting = null; serial = ''; resolve(true); } };
    if (serial.includes(marker)) waiting.done();
  });
}

function newMarker() { return 'M' + crypto.randomUUID().replaceAll('-', ''); }

// Send one line to the root shell and wait until it prints the marker.
async function send(line, timeout = 30000) {
  const marker = newMarker();
  const done = until(marker, timeout);
  vm.serial0_send(line + "; printf '\\n%s\\n' " + marker + '\n');
  return done;
}

const read = async name => {
  const text = dec(await vm.read_file(name));
  return text.endsWith('x') ? text.slice(0, -1) : text; // sentinel byte, see below
};

async function boot(files) {
  vm = new V86({
    wasm_path: new URL('linux/v86.wasm', self.location).href,
    bios: { url: new URL('linux/seabios.bin', self.location).href },
    vga_bios: { url: new URL('linux/vgabios.bin', self.location).href },
    bzimage: { url: new URL('linux/buildroot-bzimage68.bin', self.location).href },
    memory_size: 64 * 1024 * 1024, filesystem: {}, autostart: true,
    disable_keyboard: true, disable_mouse: true, disable_speaker: true,
    cmdline: 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on',
  });
  vm.add_listener('serial0-output-byte', byte => {
    serial = (serial + String.fromCharCode(byte)).slice(-4000);
    if (waiting && serial.includes(waiting.marker)) waiting.done();
  });
  if (!await until('% ', 90000)) throw Error('Linux did not start in time.');
  vm.serial0_send("stty -echo; PS1=''\n");
  await new Promise(r => setTimeout(r, 150));

  // Create the student account and home folder.
  const ok = await send(
    `hostname pulsebridge; adduser -D -h ${HOME} -s /bin/sh student 2>/dev/null; ` +
    `mkdir -p ${HOME}; chown student:student ${HOME}; chmod 755 ${HOME}`);
  if (!ok) throw Error('Linux setup failed.');

  // Copy course files into place. Read-only files belong to root.
  let i = 0;
  for (const file of files) {
    const tmp = 'fixture' + (i++);
    await vm.create_file(tmp, enc(file.content));
    const target = `${HOME}/${file.path}`;
    const dir = target.slice(0, target.lastIndexOf('/'));
    const owner = file.readOnly ? 'root:root' : 'student:student';
    const mode = file.readOnly ? (file.exec ? 555 : 444) : (file.exec ? 755 : 644);
    await send(`mkdir -p '${dir}'; cp /mnt/${tmp} '${target}'; rm -f /mnt/${tmp}; ` +
      `chown ${owner} '${dir}' '${target}'; chmod ${mode} '${target}'; chmod 755 '${dir}'`);
  }
  await send(`cd ${HOME}`);
  await vm.stop();
  snapshot = await vm.save_state();
  await vm.run();
}

/*
 * Run a command as "student" in the current directory, then run an optional
 * read-only probe (used by the exercise checker) in the resulting directory.
 * An optional prelude (per practical, e.g. PATH or job control) is sourced first,
 * in the same shell, so it never shifts the line numbers in error messages.
 * A trailing "x" is appended to every output file because v86's 9p API cannot
 * read zero-byte files; read() removes it again.
 */
async function exec(command, probe, prelude) {
  await vm.create_file('prelude.sh', enc((prelude || ':') + '\n'));
  await vm.create_file('task.sh', enc(command + '\n'));
  await vm.create_file('probe.sh', enc((probe || ':') + '\n'));
  const line =
    "su student -s /bin/sh -c 'ulimit -f 2048; trap \"pwd >&3\" EXIT; . /mnt/prelude.sh; . /mnt/task.sh' " +
    '</dev/null >/mnt/o 2>/mnt/e 3>/mnt/cwd; echo $? >/mnt/st; ' +
    'c=$(cat /mnt/cwd); [ -n "$c" ] && [ -d "$c" ] && cd "$c"; ' +
    "su student -s /bin/sh -c '. /mnt/prelude.sh; . /mnt/probe.sh' </dev/null >/mnt/po 2>&1; echo $? >/mnt/pst; " +
    'pwd >/mnt/pwd; for f in o e po; do printf x >>/mnt/$f; done';
  let timedOut = false, restarted = false;
  if (!await send(line, RUN_TIMEOUT_MS)) {
    timedOut = true;
    vm.serial0_send('\x03');                       // Ctrl+C to the running command
    await new Promise(r => setTimeout(r, 300));
    const recovered = await send('echo 130 >/mnt/st; echo >/mnt/po; pwd >/mnt/pwd; ' +
      'for f in o e po; do printf x >>/mnt/$f; done', 5000);
    if (!recovered) { await reset(); restarted = true; }
  }
  if (restarted) return { stdout: '', stderr: '', status: 130, cwd: HOME, probe: '', probeStatus: 1, timedOut, restarted };
  const [stdout, stderr, status, cwd, probeOut, probeStatus] =
    await Promise.all(['o', 'e', 'st', 'pwd', 'po', 'pst'].map(read));
  return {
    stdout, stderr, status: Number(status.trim()), cwd: cwd.trim(),
    probe: probeOut, probeStatus: timedOut ? 1 : Number(probeStatus.trim()), timedOut, restarted,
  };
}

async function reset() {
  await vm.stop();
  await vm.restore_state(snapshot);
  serial = '';
  await vm.run();
  await send(`cd ${HOME}`, 5000);
}

let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      if (data.type === 'boot') { await boot(data.files); self.postMessage({ id: data.id, type: 'ready' }); }
      else if (data.type === 'exec') self.postMessage({ id: data.id, type: 'result', ...(await exec(data.command, data.probe, data.prelude)) });
      else if (data.type === 'reset') { await reset(); self.postMessage({ id: data.id, type: 'ready' }); }
    } catch (error) {
      self.postMessage({ id: data.id, type: 'error', message: error.message || String(error) });
    }
  });
};
