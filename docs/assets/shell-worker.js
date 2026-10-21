/* Real x86 Linux; this worker has no network adapter or host filesystem bridge. */
importScripts('linux/libv86.js');
let vm, snapshot, waiting, serial = '';
const bytes = s => new TextEncoder().encode(s);
function until(marker, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiting = null; reject(Error('Linux did not respond in time. Reset the environment.')); }, timeout);
    waiting = {marker, done: () => { clearTimeout(timer); waiting = null; resolve(); }};
  });
}
async function send(command) {
  const marker = 'DONE_' + crypto.randomUUID().replaceAll('-', '');
  const pending = until(marker);
  // Disable terminal echo before sending commands; markers must be output by Linux.
  vm.serial0_send(command + "; printf '\\n" + marker + "\\n'\n");
  await pending;
}
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'boot') {
      vm = new V86({wasm_path: new URL('linux/v86.wasm', self.location).href,
        bios: {url: new URL('linux/seabios.bin', self.location).href},
        vga_bios: {url: new URL('linux/vgabios.bin', self.location).href},
        bzimage: {url: new URL('linux/buildroot-bzimage68.bin', self.location).href},
        memory_size: 64 * 1024 * 1024, filesystem: {}, autostart: true,
        disable_keyboard: true, disable_mouse: true, disable_speaker: true,
        cmdline: 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on'});
      vm.add_listener('serial0-output-byte', byte => {
        serial = (serial + String.fromCharCode(byte)).slice(-12000);
        if (waiting && serial.includes(waiting.marker)) { serial = ''; waiting.done(); }
      });
      await until('~% ');
      // The image logs in automatically on ttyS0. Set up a RAM-only 9p exchange.
      vm.serial0_send('stty -echo\n');
      await new Promise(resolve => setTimeout(resolve, 100));
      await send('mkdir -p /mnt; mount -t 9p -o trans=virtio host9p /mnt');
      for (const [name, content] of Object.entries(data.files)) await vm.create_file(name, bytes(content));
      await send('mkdir -p /root/lab/data/logs /root/lab/work; cp /mnt/upload*.log /root/lab/data/; cp /mnt/upload*.log /root/lab/data/logs/; cd /root/lab; export LC_ALL=C; PS1=""');
      await vm.stop(); snapshot = await vm.save_state();
      self.postMessage({type:'ready'});
    } else if (data.type === 'run') {
      await vm.stop(); await vm.restore_state(snapshot); serial = '';
      await vm.create_file('task.sh', bytes(data.command + '\n'));
      await vm.run();
      await send('(ulimit -f 128; /bin/sh /mnt/task.sh) > /mnt/stdout 2> /mnt/stderr; result=$?; printf x >> /mnt/stdout; printf x >> /mnt/stderr; printf "%s" "$result" > /mnt/status');
      // A trailing byte keeps empty streams readable through v86's 9p API.
      const read = async name => new TextDecoder().decode(await vm.read_file(name));
      const [stdout, stderr, status] = await Promise.all(['stdout','stderr','status'].map(read));
      await vm.stop();
      self.postMessage({type:'result', stdout:stdout.slice(0,-1), stderr:stderr.slice(0,-1), status:Number(status)});
    }
  } catch (error) { self.postMessage({type:'error', message:error.message}); }
};
