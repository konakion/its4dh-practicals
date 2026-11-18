/*
 * Content for Practical 05 · Networks & the Internet (Pillar II, week 1).
 *
 * Rendered by the same engine as Practicals 01 to 04 (course-app.js). Text fields support
 * `code` and **bold**.
 *
 * The browser Linux plays a laptop on Ward 3 of a hospital. `boot` (run once as root before
 * the snapshot) gives its network card the address 192.168.1.10/24 with the default gateway
 * 192.168.1.1 and starts four tiny DNS servers (BusyBox dnsd) on the loopback addresses:
 *   127.0.0.1  the ward's resolver: knows portal, lab and pacs.example.org
 *   127.0.0.2  "root":           org -> 127.0.0.3
 *   127.0.0.3  ".org TLD":       example.org -> 127.0.0.4
 *   127.0.0.4  "authoritative":  portal and telemed.example.org
 * Real root and TLD servers answer with a referral (NS record); in this practice network each
 * server answers with the address of the next server to ask. The text says so.
 * The network card has no relay behind it: packets leave eth0 and nothing comes back. Nothing
 * reaches the real Internet. `capture` (fixtures/p05) runs a command and prints the packets
 * it sends and receives, one line per packet (tcpdump, shortened).
 *
 * Shell steps: ip addr, ip route, ip route get, ping, capture, nslookup, /etc/resolv.conf and
 * /etc/hosts. Every example output was produced by the browser Linux and is re-checked by
 * scripts/test_course_browser.cjs.
 * Report steps: the student's own laptop (ipconfig and friends), private or public addresses,
 * direct delivery or gateway, number of packets, forwarding with routing tables, and a NAT
 * table. verify() recomputes every answer.
 */
(() => {
  // ---------------------------------------------------------------- the practice network
  const BOOT = [
    'hostname ward3-laptop',
    'sysctl -q -w net.ipv6.conf.all.disable_ipv6=1',
    'ip link set lo up',
    'ip link set eth0 up',
    'ip addr add 192.168.1.10/24 dev eth0',
    'ip route add default via 192.168.1.1 dev eth0',
    // a fixed hardware address for the gateway, so that packets really leave through eth0
    'arp -s 192.168.1.1 02:00:5e:00:01:01',
    "printf 'portal.example.org 192.0.2.80\\nlab.example.org 192.0.2.81\\npacs.example.org 192.0.2.82\\n' > /etc/dnsd.conf",
    "printf 'org 127.0.0.3\\nde 127.0.0.5\\n' > /etc/dns-root.conf",
    "printf 'example.org 127.0.0.4\\n' > /etc/dns-org.conf",
    "printf 'portal.example.org 192.0.2.80\\ntelemed.example.org 192.0.2.90\\n' > /etc/dns-example.conf",
    'dnsd -d -i 127.0.0.1 -c /etc/dnsd.conf -t 3600',
    'dnsd -d -i 127.0.0.2 -c /etc/dns-root.conf -t 172800',
    'dnsd -d -i 127.0.0.3 -c /etc/dns-org.conf -t 86400',
    'dnsd -d -i 127.0.0.4 -c /etc/dns-example.conf -t 3600',
    "echo 'nameserver 127.0.0.1' > /tmp/resolv.conf",
    // the hosts file may be changed by the student in chapter 5 (normally only the administrator may)
    "printf '127.0.0.1\\tlocalhost\\n127.0.1.1\\tward3-laptop\\n' > /etc/hosts",
    'chmod 666 /etc/hosts',
    // ping without root, and capture (tcpdump) for the student
    "sysctl -q -w net.ipv4.ping_group_range='0 2147483647'",
    'chmod u+s /usr/bin/tcpdump',
  ].join('\n');

  const HOSTS_OK = "printf '127.0.0.1\\tlocalhost\\n127.0.1.1\\tward3-laptop\\n' > /etc/hosts";
  const HOSTS_BAD = "printf '127.0.0.1\\tlocalhost\\n127.0.1.1\\tward3-laptop\\n192.0.2.99\\tportal.example.org\\n' > /etc/hosts";

  // ---------------------------------------------------------------- helpers for report steps
  const ipv4 = s => {
    const m = String(s || '').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/\d{1,2})?$/);
    if (!m) return null;
    const o = m.slice(1, 5).map(Number);
    return o.every(x => x <= 255) ? o : null;
  };
  const isPrivate = o => o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168);
  const path = s => (String(s || '').toUpperCase().match(/R\d/g) || []).join(' ');

  // Chapter 2: private or public?
  const ADDRS = [
    { v: '10.20.3.44', priv: true, why: '10.x.x.x is the large private range, used by many hospitals.' },
    { v: '172.20.1.5', priv: true, why: '172.20 lies in the private range 172.16 to 172.31.' },
    { v: '172.40.1.5', priv: false, why: '172.40 is outside 172.16 to 172.31, so it is public.' },
    { v: '192.168.178.42', priv: true, why: '192.168.x.x is the private range of most home routers.' },
    { v: '192.0.2.80', priv: false, why: '192.0.2 is not 192.168. It is a public range (reserved for examples like ours).' },
    { v: '8.8.8.8', priv: false, why: '8.8.8.8 is a public DNS resolver on the Internet.' },
  ];
  const PRIV = ADDRS.filter(a => a.priv).map(a => a.v);

  // Chapter 2: direct or via the gateway, seen from 192.168.1.10/24
  const DEST = [
    { id: 'printer', addr: '192.168.1.20', label: 'Ward printer' },
    { id: 'pc', addr: '192.168.1.37', label: "Nurses' station PC" },
    { id: 'portal', addr: '192.0.2.80', label: 'Portal server' },
    { id: 'ward4', addr: '192.168.2.20', label: 'Lab PC on Ward 4' },
    { id: 'edge', addr: '192.168.1.254', label: 'Wi-Fi access point' },
  ].map(d => Object.assign(d, { want: d.addr.startsWith('192.168.1.') ? 'direct' : 'gateway' }));
  const HOW = [{ v: 'direct', t: 'directly, inside the ward network' }, { v: 'gateway', t: 'to the default gateway 192.168.1.1' }];

  // Chapter 3: packets for one file
  const PAYLOAD = 1460;
  const XRAY = 5000000, XRAY_N = Math.ceil(XRAY / PAYLOAD); // 3425
  const VITAL = 300, VITAL_N = Math.ceil(VITAL / PAYLOAD);   // 1

  // Chapter 4: six routers between the hospital and two other networks
  const TABLES = [
    '         to 192.0.2.0/24         to 198.51.100.0/24',
    '         (portal data centre)    (university)',
    'R1  →    R2                      R3',
    'R2  →    R5                      R4',
    'R3  →    R4                      R6',
    'R4  →    R5                      R6',
    'R5  →    directly connected      R4',
    'R6  →    R4                      directly connected',
  ].join('\n');
  const NEXT = {
    portal: { R1: 'R2', R2: 'R5', R3: 'R4', R4: 'R5', R5: null, R6: 'R4' },
    uni: { R1: 'R3', R2: 'R4', R3: 'R6', R4: 'R6', R5: 'R4', R6: null },
  };
  const walk = table => { const p = ['R1']; while (table[p[p.length - 1]] && p.length < 8) p.push(table[p[p.length - 1]]); return p.join(' '); };
  const PATH_PORTAL = walk(NEXT.portal);                                   // R1 R2 R5
  const PATH_UNI = walk(NEXT.uni);                                            // R1 R3 R6
  const PATH_BROKEN = walk(Object.assign({}, NEXT.portal, { R2: 'R4' }));  // R1 R2 R4 R5

  // Chapter 4: the NAT table of the hospital router (public address 203.0.113.5)
  const NAT = [
    'inside (private)          outside (public)',
    '192.168.1.10:51000   ↔    203.0.113.5:40001',
    '192.168.1.37:52200   ↔    203.0.113.5:40002',
  ].join('\n');

  // Chapter 6: the values of the network report, read from the practice laptop itself
  const REPORT_CHECK = "f=~/reports/network.txt; ip=$(ip addr show eth0 | awk '/inet / {split($2, a, \"/\"); print a[1]}'); gw=$(ip route | awk '/^default/ {print $3}'); ns=$(awk '/^nameserver/ {print $2}' /etc/resolv.conf); portal=$(nslookup portal.example.org 2>/dev/null | awk '/^Address: / {print $2}' | head -n 1); " +
    "if [ ! -f $f ]; then echo MISSING; elif ! grep -qx \"ip=$ip\" $f; then echo IP; elif ! grep -qx \"gateway=$gw\" $f; then echo GW; elif ! grep -qx \"resolver=$ns\" $f; then echo NS; elif ! grep -qx \"portal=$portal\" $f; then echo PORTAL; elif [ $(grep -c '' $f) != 4 ]; then echo EXTRA; else echo OK; fi";

window.PRACTICAL = {
  id: 'its4dh-p05',
  course: 'IT Systems for Digital Health Experts',
  title: 'Networks & the Internet',
  number: 'Practical 05',
  minutes: 90,
  home: '/home/student',
  user: 'student',
  host: 'ward3-laptop',
  // Sourced before every command: the course program is on the PATH.
  prelude: 'PATH="$HOME/bin:$PATH"',
  boot: BOOT,
  files: [
    { path: 'bin/capture', url: 'fixtures/p05/capture', readOnly: true, exec: true },
  ],

  intro: {
    lead: 'It is 9 a.m. on Ward 3. On one laptop the patient portal opens the wrong page, on the others it works. You are asked to find out why. On the way you find this laptop’s address and its way out, watch real packets leave it, forward a packet through routers by hand, and walk the DNS hierarchy yourself.',
    steps: [
      ['Read', 'a short explanation and one example.'],
      ['Try', 'it yourself in the Linux laptop inside this page, on your own laptop, or by hand.'],
      ['Check', 'the result. You get feedback straight away and can retry as often as you like.'],
    ],
    note: 'The Linux in this page is a laptop on a practice network: the ward, its router and its DNS servers are simulated inside it, and its network cable leads nowhere. Nothing you do here reaches the real Internet. Your progress is saved in this browser only.',
    demo: { cmd: 'hostname', out: 'ward3-laptop' },
  },

  chapters: [
    // ---------------------------------------------------------------- 1
    {
      id: 'address',
      title: 'Your laptop on the network',
      minutes: 14,
      goal: 'Find the address of this laptop and its way out of the ward network, then do the same on your own laptop.',
      steps: [
        {
          id: 'addr',
          title: 'Which address do I have?',
          learn: [
            '`ip addr` lists the network connections of a computer. **lo** is the loopback: the computer talking to itself. **eth0** is the network card that connects the laptop to the ward network.',
            'The line that starts with **inet** holds the IPv4 address. The part after the slash, for example **/24**, says how many bits name the network: with /24, the first three numbers.',
          ],
          example: { cmd: 'ip addr show lo', out: '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever', note: 'The loopback always has 127.0.0.1. Data sent there never leaves the computer.' },
          task: 'Print only the line with the **IPv4 address** of the network card `eth0`.',
          check: { output: 'lines', expect: "ip addr show eth0 | grep 'inet '" },
          diagnose: [
            { when: { stdout: /link\/ether|BROADCAST/ }, msg: 'That is the whole block of eth0. Keep only the line with the address: add `| grep inet`.' },
            { when: { stdout: /127\.0\.0\.1[\s\S]*192\.168\.1\.10/ }, msg: 'Two lines: the loopback lo and the network card eth0. Keep only eth0: `ip addr show eth0 | grep inet`.' },
            { when: { stdout: /127\.0\.0\.1/ }, msg: 'That is the loopback lo. The task asks for the network card eth0.' },
          ],
          hints: ['Use the example, but for eth0.', "`ip addr show eth0 | grep inet` keeps only the line with the address."],
          solution: "ip addr show eth0 | grep inet",
          success: '192.168.1.10/24. It starts with 192.168, so it is a **private** address, and /24 says the first three numbers, 192.168.1, name the ward network. DHCP gave this address to the laptop when it joined the network.',
        },
        {
          id: 'gateway',
          title: 'The way out',
          learn: [
            '`ip route` shows the **routing table** of the laptop: its rules for where packets go. A laptop’s table is tiny.',
            'The line `192.168.1.0/24 dev eth0` says: this network is reached **directly** through eth0. The line that starts with **default via** names the **default gateway**: the router that gets everything else.',
          ],
          example: { cmd: 'ip route | grep link', out: '192.168.1.0/24 dev eth0 scope link  src 192.168.1.10', note: 'The rule for the ward network itself: deliver directly.' },
          task: 'Print only the line of the routing table that names the **default gateway**.',
          check: { output: 'lines', expect: 'ip route | grep default' },
          diagnose: [
            { when: { stdoutLines: 2 }, msg: 'That is the whole routing table. Keep only the line that starts with default: `| grep default`.' },
            { when: { stdout: /scope link/ }, msg: 'That is the rule for the ward network itself. The task asks for the line of the default gateway.' },
          ],
          hints: ['The line you need starts with the word default.', '`ip route | grep default`'],
          solution: 'ip route | grep default',
          success: 'The default gateway is 192.168.1.1, the ward’s router. It has the same network part as the laptop, as it must: the laptop can only hand packets to devices in its own network.',
        },
        {
          id: 'laptop',
          title: 'And your own laptop?',
          mode: 'report',
          where: 'laptop',
          learn: [
            'Your own laptop has an address and a default gateway too, given by the DHCP server of the network you are in right now. Open a terminal on your laptop (Windows: press the Windows key, type `cmd`; macOS: open Terminal) and run the command for your system.',
            'On campus or in a hospital, firewalls change nothing here: these commands only read your own settings.',
          ],
          commands: {
            Windows: ['ipconfig'],
            macOS: ['ipconfig getifaddr en0', 'route -n get default'],
            Linux: ['ip addr', 'ip route'],
          },
          example: { code: 'Wireless LAN adapter Wi-Fi:\n   IPv4 Address. . . . . . . . . . . : 192.168.178.42\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.178.1', file: 'ipconfig on a Windows laptop at home' },
          task: 'Enter the IPv4 address and the default gateway of **your own laptop**, and decide whether your address is private or public. (No laptop at hand? Use the example above.)',
          fields: [
            { id: 'ip', type: 'text', label: 'My IPv4 address', help: 'Four numbers with dots, for example 192.168.178.42.' },
            { id: 'gw', type: 'text', label: 'My default gateway' },
            { id: 'kind', type: 'select', label: 'My address is', options: [{ v: 'private', t: 'private' }, { v: 'public', t: 'public' }] },
          ],
          verify: v => {
            const ip = ipv4(v.ip), gw = ipv4(v.gw);
            if (!ip) return { ok: false, msg: 'Enter your IPv4 address as four numbers from 0 to 255 with dots, for example 192.168.178.42. On Windows it is the line IPv4 Address.' };
            if (ip[0] === 127) return { ok: false, msg: '127.x.x.x is the loopback, the laptop talking to itself. Look for the address of your Wi-Fi or cable connection.' };
            if (ip[0] === 169 && ip[1] === 254) return { ok: false, msg: 'An address that starts with 169.254 means that no DHCP server answered, so the laptop gave itself an address. Connect to a Wi-Fi network and run the command again.' };
            if (!gw) return { ok: false, msg: 'Enter the default gateway as four numbers with dots. On Windows it is the line Default Gateway, on macOS the line gateway.' };
            if (gw.join('.') === ip.join('.')) return { ok: false, msg: 'That is your own address again. The default gateway is the router of your network, a different device.' };
            const priv = isPrivate(ip);
            if ((v.kind === 'private') !== priv) return { ok: false, partial: true, msg: priv ? `${ip.join('.')} lies in a private range (10.x.x.x, 172.16 to 172.31, or 192.168.x.x).` : `${ip.join('.')} is not in any of the three private ranges (10.x.x.x, 172.16 to 172.31, 192.168.x.x), so it is public.` };
            if (gw[0] !== ip[0]) return { ok: false, msg: 'Your gateway does not even share the first number with your address. The gateway is always inside your own network. Did you copy the DNS server or another line?' };
            const same3 = gw.slice(0, 3).join() === ip.slice(0, 3).join();
            const kindText = priv ? 'a private address, valid only inside the network you are in, and translated by NAT on the way out' : 'a public address: some universities give every device one, so no NAT is needed';
            return { ok: true, msg: same3
              ? `${ip.join('.')} is ${kindText}. Your gateway ${gw.join('.')} has the same network part (${ip.slice(0, 3).join('.')}), just like the ward laptop and 192.168.1.1.`
              : `${ip.join('.')} is ${kindText}. Your gateway ${gw.join('.')} shares only the first part: your network uses a larger network part than /24, for example /16 (subnet mask 255.255.0.0).` };
          },
          hints: ['Windows: the lines IPv4 Address and Default Gateway of your Wi-Fi adapter. macOS: the two commands print the address and, in the line gateway, the gateway.', 'Private ranges: 10.x.x.x, 172.16.x.x to 172.31.x.x, and 192.168.x.x. Everything else (with a few special exceptions) is public.'],
          solution: 'Example from a home network:\nIPv4 address: 192.168.178.42\ndefault gateway: 192.168.178.1\nprivate (192.168.x.x)',
          success: 'Your own laptop compared.',
        },
      ],
      quiz: [
        {
          q: '`ip addr` shows 127.0.0.1 on lo. What is this address for?',
          options: [
            { t: 'The computer talking to itself; data sent there never leaves it', correct: true, why: 'Every computer has the loopback, and every computer uses 127.0.0.1 for it.' },
            { t: 'Reaching the router of the network', why: 'That is the default gateway, 192.168.1.1 here.' },
            { t: 'It is the public address of the laptop', why: '127.x.x.x is a special range, neither private nor public.' },
          ],
        },
        {
          q: 'A laptop has the address 192.168.1.10/24. Which address can be its default gateway?',
          options: [
            { t: '192.168.1.1', correct: true, why: 'Same network part, 192.168.1. A gateway must be a neighbour in the local network.' },
            { t: '192.0.2.80', why: 'That is the portal server, in another network. The laptop could not reach it without a gateway.' },
            { t: '127.0.0.1', why: 'That is the laptop itself.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      id: 'local',
      title: 'Direct or via the gateway?',
      minutes: 13,
      goal: 'Tell private from public addresses and decide, like the laptop does, whether a packet is delivered directly or handed to the gateway.',
      steps: [
        {
          id: 'private',
          title: 'Private or public?',
          mode: 'report',
          learn: [
            'Three ranges are **private**: 10.0.0.0 to 10.255.255.255, 172.16.0.0 to 172.31.255.255, and 192.168.0.0 to 192.168.255.255. They are valid only inside one local network and are reused in millions of networks.',
            'Every other address (with a few special exceptions such as 127.x.x.x) is **public**: unique on the whole Internet.',
          ],
          example: { code: '192.168.0.7    private   (192.168.x.x)\n172.15.0.1     public    (172.15 is below 172.16)\n10.0.0.1       private   (10.x.x.x)', file: 'three addresses sorted' },
          task: 'Which of these addresses are **private**? Select all of them.',
          fields: [{ id: 'priv', type: 'choice', multi: true, label: 'Private addresses', options: ADDRS.map(a => ({ v: a.v, t: a.v })) }],
          verify: v => {
            const got = [].concat(v.priv || []);
            if (!got.length) return { ok: false, msg: 'Select at least one address. Three of the six are private.' };
            const wrongIn = ADDRS.find(a => !a.priv && got.includes(a.v));
            if (wrongIn) return { ok: false, msg: `${wrongIn.v} is not private. ${wrongIn.why}` };
            const missing = ADDRS.find(a => a.priv && !got.includes(a.v));
            if (missing) return { ok: false, partial: true, msg: `Correct so far, but one private address is missing. Check ${missing.v.split('.').slice(0, 2).join('.')}.x.x again.` };
            return { ok: true, msg: `${PRIV.join(', ')} are private. 172.40.1.5 is the trap: only 172.16 to 172.31 is private. 192.0.2.80, the portal server, is public, so it can be reached from anywhere.` };
          },
          hints: ['Compare the first two numbers of each address with the three ranges.', 'Only 172.16 to 172.31 is private, not every address that starts with 172.'],
          solution: 'private: 10.20.3.44, 172.20.1.5, 192.168.178.42\npublic: 172.40.1.5, 192.0.2.80, 8.8.8.8',
          success: 'Sorted.',
        },
        {
          id: 'decide',
          title: 'Think like the laptop',
          mode: 'report',
          learn: [
            'Before the laptop sends anything, it compares the **network part** of the destination with its own. The ward laptop is 192.168.1.10/24, so its network part is **192.168.1**.',
            'Same network part: deliver **directly**. Different network part: hand the packet to the **default gateway**, 192.168.1.1. Being private is not enough: 192.168.7.5 is private, but in another network.',
          ],
          example: { code: 'laptop 192.168.1.10/24 sends to 192.168.1.99\n→ network part 192.168.1 = 192.168.1 → directly\n\nlaptop 192.168.1.10/24 sends to 8.8.8.8\n→ network part 8.8.8 ≠ 192.168.1 → default gateway', file: 'two decisions' },
          task: 'The ward laptop **192.168.1.10/24** sends a packet to each of these devices. How does each packet leave the laptop?',
          fields: DEST.map(d => ({ id: d.id, type: 'select', label: `${d.label}, \`${d.addr}\``, options: HOW })),
          verify: v => {
            const bad = DEST.find(d => v[d.id] !== d.want);
            if (!bad) return { ok: true, save: { done: 1 }, msg: 'All five right. The printer, the nurses’ PC and the access point share the network part 192.168.1 and are reached directly. The portal server and the lab PC on Ward 4 are in other networks, so their packets go to the gateway.' };
            const n = DEST.filter(d => v[d.id] !== d.want).length;
            if (bad.id === 'ward4') return { ok: false, partial: n === 1, msg: '192.168.2.20 is private, but its network part is 192.168.2, not 192.168.1. Ward 4 is a different network: the packet goes to the gateway.' };
            if (bad.id === 'edge') return { ok: false, partial: n === 1, msg: '192.168.1.254 looks unusual, but its network part is 192.168.1: the access point is a neighbour on the ward network.' };
            return { ok: false, partial: n === 1, msg: `Look at ${bad.label}, ${bad.addr}: its network part is ${bad.addr.split('.').slice(0, 3).join('.')}${bad.want === 'direct' ? ', the same as the laptop’s' : ', not 192.168.1'}.` };
          },
          hints: ['Compare only the first three numbers of each address with 192.168.1.', 'Three devices are on the ward network, two are not.'],
          solution: DEST.map(d => `${d.addr.padEnd(14)} ${d.want === 'direct' ? 'directly' : 'default gateway'}`).join('\n'),
          success: 'Decided.',
        },
        {
          id: 'kernel',
          title: 'Ask the kernel',
          learn: [
            '`ip route get ADDRESS` asks the kernel which rule of the routing table it would use for that destination. Nothing is sent.',
            'If the answer contains **via 192.168.1.1**, the packet would go to the gateway. Without via, the destination is reached directly.',
          ],
          example: { cmd: 'ip route get 192.168.1.20', out: '192.168.1.20 dev eth0  src 192.168.1.10', note: 'The printer: directly through eth0, no via.' },
          task: 'Ask the kernel how it would send a packet to the **lab PC on Ward 4**, `192.168.2.20`. Does it agree with your answer from the previous step?',
          check: { output: 'lines', expect: 'ip route get 192.168.2.20' },
          diagnose: [
            { when: { stdout: /^192\.168\.1\.20 / }, msg: 'That is the printer from the example. Ask about the lab PC on Ward 4, 192.168.2.20.' },
            { when: { stdout: /^192\.0\.2\.80 / }, msg: 'That is the portal server. Ask about the lab PC on Ward 4, 192.168.2.20.' },
          ],
          hints: ['Use the example with another address.', '`ip route get 192.168.2.20`'],
          solution: 'ip route get 192.168.2.20',
          success: 'via 192.168.1.1: the kernel sends it to the gateway, just as you decided. Ward 4 has its own network, and only a router connects the two wards.',
        },
      ],
      quiz: [
        {
          q: 'The ward laptop 192.168.1.10/24 sends to 192.168.1.77. Who receives the packet first?',
          options: [
            { t: 'The device 192.168.1.77 itself, directly in the ward network', correct: true, why: 'Same network part, 192.168.1. No router is needed.' },
            { t: 'The default gateway 192.168.1.1', why: 'The gateway only gets packets for other networks.' },
            { t: 'The DNS resolver', why: 'DNS turns names into addresses. It does not carry packets.' },
          ],
        },
        {
          q: 'Why can two households both use the address 192.168.1.10 at the same time?',
          options: [
            { t: 'It is a private address: it only counts inside each home, and NAT hides it outside', correct: true, why: 'The Internet only sees the public addresses of the two home routers.' },
            { t: 'The Internet provider renumbers one of them', why: 'The provider never sees the addresses inside your home.' },
            { t: 'It cannot: one of them gets an error', why: 'An address conflict happens only inside the same network.' },
          ],
        },
        {
          review: 'Review from chapter 1',
          q: 'Which line of `ip route` names the way out of the local network?',
          options: [
            { t: 'The line that starts with default via', correct: true, why: 'It names the default gateway, 192.168.1.1 on the ward laptop.' },
            { t: 'The line 192.168.1.0/24 dev eth0', why: 'That is the rule for the local network itself: deliver directly.' },
            { t: 'The line with inet', why: 'inet lines belong to `ip addr` and show the laptop’s own address.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      id: 'packets',
      title: 'Packets you can see',
      minutes: 17,
      goal: 'Send test packets, watch them leave the laptop, and read what their header says.',
      steps: [
        {
          id: 'ping',
          title: 'Ping yourself',
          learn: [
            '`ping ADDRESS` sends a small test packet and waits for an echo. Each echo line shows how long the round trip took. `-c 2` sends exactly two packets and then stops.',
            'The last lines are a summary: how many packets went out, how many came back, and the **packet loss** in percent.',
          ],
          example: { cmd: 'ping -c 1 127.0.0.1', out: 'PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.351 ms\n\n--- 127.0.0.1 ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss, time 0ms\nrtt min/avg/max/mdev = 0.351/0.351/0.351/0.000 ms', note: 'One packet to the loopback, one echo back. The times on your screen differ.', volatile: 'numbers' },
          task: 'Send exactly **2** pings to the laptop’s own address on **eth0** (chapter 1).',
          check: { output: 'names', expect: "echo '2 received, 0%'" },
          mustUse: [{ re: /192\.168\.1\.10\b/, msg: 'That worked, but it used another address. The task asks for the address of eth0 from chapter 1: 192.168.1.10.' }],
          diagnose: [
            { when: { stdout: /\b[13-9]\d* packets transmitted/ }, msg: 'Send exactly two packets: `-c 2`.' },
            { when: { stdout: /100% packet loss/ }, msg: 'No echo came back. Use the laptop’s own address on eth0, 192.168.1.10.' },
          ],
          timeoutMsg: 'Without `-c`, ping keeps sending until it is stopped, so it was stopped after 10 seconds. Add `-c 2` to send exactly two packets.',
          hints: ['Use the example, with `-c 2` and another address.', '`ping -c 2 192.168.1.10`'],
          solution: 'ping -c 2 192.168.1.10',
          success: 'Two echoes in well under a millisecond, 0% packet loss. The laptop answered itself: these packets never left it.',
        },
        {
          id: 'capture',
          title: 'Watch a packet leave',
          learn: [
            'The course program `capture COMMAND` runs a command and prints every packet it sends or receives, one line per packet: the network card, **out** or **in**, then **source > destination**, the **ttl**, and what the packet contains.',
            'Inside, it uses **tcpdump**, the classic tool to look at packets. `capture` shortens its output and stops the command after 3 seconds.',
          ],
          example: { cmd: 'capture ping -c 1 127.0.0.1', out: 'lo   in   127.0.0.1 > 127.0.0.1  ttl=64  ICMP echo request, seq 1\nlo   in   127.0.0.1 > 127.0.0.1  ttl=64  ICMP echo reply, seq 1', note: 'A request and its echo, both on the loopback lo.' },
          task: 'Capture **one** ping to the portal server, `192.0.2.80`.',
          check: { output: 'names', expect: "echo 'eth0 out 192.168.1.10 > 192.0.2.80 ICMP echo'" },
          diagnose: [
            { when: { stdout: /127\.0\.0\.1 > 127\.0\.0\.1/ }, msg: 'That is the loopback from the example. Ping the portal server, 192.0.2.80.' },
            { when: { command: /^\s*ping\b/ }, msg: 'That ping ran, but nothing captured it. Put capture in front of the whole command: `capture ping -c 1 192.0.2.80`.' },
            { when: { stdout: /^$/ }, msg: 'capture saw no packet. Put the whole ping command after capture: `capture ping -c 1 192.0.2.80`.' },
          ],
          timeoutMsg: 'The command was still running after 10 seconds. Add `-c 1` to the ping, so that it sends one packet and stops.',
          hints: ['Use the example with the address of the portal server.', '`capture ping -c 1 192.0.2.80`'],
          solution: 'capture ping -c 1 192.0.2.80',
          success: 'The packet left through **eth0**, from 192.168.1.10 to 192.0.2.80, and was handed to the gateway. No reply came back: in this practice network the cable leads nowhere. In the hospital, the ward router would pass it on, hop by hop.',
        },
        {
          id: 'header',
          title: 'Read the header',
          mode: 'report',
          learn: [
            'Every IP packet carries a **header** in front of its content. Routers read only the header, never the content.',
            'Three fields matter today: the **source** address (where the reply should go), the **destination** address (where the packet should go) and the **TTL**, a counter that every router lowers by one.',
          ],
          example: { code: 'lo   in   127.0.0.1 > 127.0.0.1  ttl=64  ICMP echo request, seq 1\n\nsource: 127.0.0.1, destination: 127.0.0.1, TTL: 64', file: 'the example from the previous step' },
          task: 'Look at the packet you captured in the previous step. What does its header say?',
          fields: [
            { id: 'src', type: 'text', label: 'Source address' },
            { id: 'dst', type: 'text', label: 'Destination address' },
            { id: 'ttl', type: 'number', label: 'TTL when it left the laptop' },
          ],
          verify: (v, ctx) => {
            const src = String(v.src || '').trim(), dst = String(v.dst || '').trim(), ttl = ctx.number(v.ttl);
            if (src === '192.0.2.80' && dst === '192.168.1.10') return { ok: false, msg: 'Source and destination are swapped. The packet goes from the laptop (source) to the portal server (destination).' };
            if (src === '192.168.1.1' || dst === '192.168.1.1') return { ok: false, msg: 'The gateway gets the packet first, but its address is not in the IP header. The header keeps the laptop as source and the portal server as destination for the whole trip.' };
            if (src !== '192.168.1.10') return { ok: false, msg: 'The source is the sender of the packet: the laptop’s address on eth0.' };
            if (dst !== '192.0.2.80') return { ok: false, msg: 'The destination is where the packet should end up: the portal server.' };
            if (ttl == null) return { ok: false, msg: 'Enter the TTL as a whole number. It is the number after ttl=.' };
            if (ttl !== 64) return { ok: false, partial: true, msg: 'Source and destination are right. The TTL is the number after ttl= in your capture.' };
            return { ok: true, msg: 'From 192.168.1.10 to 192.0.2.80 with TTL 64. The destination stays the same over the whole trip, even though the packet first goes to the gateway: the laptop hands it over in the local network, without changing the header.' };
          },
          hints: ['In the line of capture, the address before > is the source, the one after > the destination.', 'Source 192.168.1.10, destination 192.0.2.80. The TTL is written as ttl=.'],
          solution: 'source: 192.168.1.10\ndestination: 192.0.2.80\nTTL: 64',
          success: 'Header read.',
        },
        {
          id: 'ttl',
          title: 'A packet with a short life',
          learn: [
            'Every router lowers the **TTL** of a packet by one. At zero, the router throws the packet away and sends a short error message back. This stops packets from circling forever when a routing table is wrong.',
            '`ping -t N` starts the TTL at N instead of 64. The tool traceroute uses exactly this: TTL 1, 2, 3, … makes each router on the way reveal itself.',
          ],
          example: { cmd: 'capture ping -c 1 -t 9 127.0.0.1', out: 'lo   in   127.0.0.1 > 127.0.0.1  ttl=9  ICMP echo request, seq 1\nlo   in   127.0.0.1 > 127.0.0.1  ttl=64  ICMP echo reply, seq 1', note: 'The request starts with TTL 9. The reply is a new packet, with its own TTL of 64.' },
          task: 'Capture one ping to the portal server `192.0.2.80` that may cross at most **3** routers.',
          check: { output: 'names', expect: "echo 'eth0 out 192.0.2.80 ttl=3'" },
          diagnose: [
            { when: { stdout: /ttl=64/, command: /192\.0\.2\.80/ }, msg: 'The packet still starts with TTL 64. Add `-t 3` to the ping command.' },
            { when: { stdout: /127\.0\.0\.1 > / }, msg: 'That is the loopback. Send the ping to the portal server, 192.0.2.80.' },
          ],
          timeoutMsg: 'The command was still running after 10 seconds. Add `-c 1` to the ping, so that it sends one packet and stops.',
          hints: ['Combine the previous step with the option of the example.', '`capture ping -c 1 -t 3 192.0.2.80`'],
          solution: 'capture ping -c 1 -t 3 192.0.2.80',
          success: 'ttl=3: the fourth router on the way would throw this packet away. The portal server is usually more than three routers away, so this ping could never arrive.',
        },
        {
          id: 'count',
          title: 'How many packets?',
          mode: 'report',
          learn: [
            'On most networks a packet carries at most about **1,500 bytes**. About 40 of them are headers, so roughly **1,460 bytes** of data fit into one packet.',
            'A file is cut into as many packets as it needs. The last one may be only partly full, but it still counts: always round **up**.',
          ],
          example: { code: 'a portal page of 300,000 bytes:\n300,000 ÷ 1,460 = 205.5 → 206 packets', file: 'one calculation' },
          task: `How many packets does each of these need, with 1,460 bytes of data per packet? An X-ray image of **5 MB** (${XRAY.toLocaleString('en-US')} bytes), and a vital-signs message of **${VITAL} bytes**.`,
          fields: [
            { id: 'xray', type: 'number', label: 'Packets for the X-ray image' },
            { id: 'vital', type: 'number', label: 'Packets for the vital-signs message' },
          ],
          verify: (v, ctx) => {
            const x = ctx.number(v.xray), s = ctx.number(v.vital);
            if (x == null || s == null) return { ok: false, msg: 'Enter both numbers as whole numbers.' };
            if (x === Math.floor(XRAY / PAYLOAD)) return { ok: false, partial: true, msg: `${XRAY.toLocaleString('en-US')} ÷ 1,460 = 3,424.7. The last 0.7 of a packet still needs a whole packet: round up.` };
            if (x === Math.ceil(XRAY / 1500)) return { ok: false, msg: 'You divided by 1,500, the whole packet. Only about 1,460 bytes of it are data: divide by 1,460.' };
            if (x !== XRAY_N) return { ok: false, msg: `Not quite. Divide ${XRAY.toLocaleString('en-US')} by 1,460 and round up.` };
            if (s === 0) return { ok: false, partial: true, msg: 'Even a small message needs one packet.' };
            if (s !== VITAL_N) return { ok: false, partial: true, msg: `The X-ray is right. ${VITAL} bytes fit into a single packet.` };
            return { ok: true, msg: `${XRAY_N.toLocaleString('en-US')} packets for the X-ray, 1 for the vital signs. Because both travel in small packets, the alarm of a bedside monitor does not have to wait until the whole image has passed: the packets take turns on the line.` };
          },
          hints: [`${XRAY.toLocaleString('en-US')} ÷ 1,460 = 3,424.7`, 'Round up: a part of a packet still needs a whole packet. 300 bytes are less than one packet.'],
          solution: `X-ray: ${XRAY.toLocaleString('en-US')} ÷ 1,460 = 3,424.7 → ${XRAY_N.toLocaleString('en-US')} packets\nvital signs: ${VITAL} ÷ 1,460 = 0.2 → 1 packet`,
          success: 'Counted.',
        },
      ],
      quiz: [
        {
          q: 'A router receives a packet with TTL 1. What happens?',
          options: [
            { t: 'It lowers the TTL to 0, throws the packet away and sends an error message back', correct: true, why: 'That is how traceroute makes each router reveal itself.' },
            { t: 'It forwards the packet with TTL 0 to the next router', why: 'A packet with TTL 0 is never forwarded.' },
            { t: 'It sets the TTL back to 64', why: 'Routers only ever lower the TTL.' },
          ],
        },
        {
          q: 'What does a router look at to decide where a packet goes next?',
          options: [
            { t: 'The destination IP address in the header', correct: true, why: 'It looks it up in its routing table.' },
            { t: 'The content of the packet', why: 'Routers never need the content. It may even be encrypted.' },
            { t: 'The source IP address', why: 'The source tells the receiver where to reply, not where to forward.' },
          ],
        },
        {
          review: 'Review from chapter 2',
          q: 'The ward laptop 192.168.1.10/24 sends to 192.168.5.5. How does the packet leave?',
          options: [
            { t: 'To the default gateway', correct: true, why: '192.168.5 is a different network part than 192.168.1, even though both are private.' },
            { t: 'Directly, because both addresses are private', why: 'Private does not mean neighbour. Compare the network parts.' },
            { t: 'It is dropped, because private addresses cannot be routed', why: 'Inside the hospital, routers forward packets between private networks without problems.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      id: 'routing',
      title: 'One hop at a time',
      minutes: 15,
      goal: 'Forward a packet through routers using their tables, see what happens when a line fails, and follow a packet through NAT.',
      steps: [
        {
          id: 'forward',
          title: 'Follow the signs',
          mode: 'report',
          learn: [
            'No router knows the whole path. Each one only knows, for every destination network, which neighbour gets the packet **next** (the next hop). Like road signs: each junction only tells you the next exit.',
            'The hospital is connected to router **R1**. Each line of the tables below is one router: read the column of the destination network, go to the router named there, and repeat until a router says **directly connected**.',
          ],
          example: { code: TABLES, file: 'the routing tables of the six routers' },
          task: 'Which routers does a packet from the hospital pass, in order, to reach the **portal server** `192.0.2.80`? And to reach a server at the **university**, `198.51.100.7`? Write the routers separated by spaces, for example `R1 R4`.',
          fields: [
            { id: 'portal', type: 'text', label: 'Path to 192.0.2.80' },
            { id: 'uni', type: 'text', label: 'Path to 198.51.100.7' },
          ],
          verify: v => {
            const a = path(v.portal), b = path(v.uni);
            if (!a || !b) return { ok: false, msg: 'Write both paths as router names separated by spaces, starting with R1, for example `R1 R4`.' };
            if (!a.startsWith('R1') || !b.startsWith('R1')) return { ok: false, msg: 'Every path starts at R1: the hospital is connected to R1.' };
            if (a === PATH_UNI && b === PATH_PORTAL) return { ok: false, msg: 'The two paths are swapped. 192.0.2.0/24 is the portal data centre, 198.51.100.0/24 the university.' };
            if (a !== PATH_PORTAL) return { ok: false, msg: `Follow the column to 192.0.2.0/24: R1 sends to ${NEXT.portal.R1}. Where does ${NEXT.portal.R1} send it?` };
            if (b !== PATH_UNI) return { ok: false, partial: true, msg: `The path to the portal is right. For 198.51.100.7, read the second column: R1 sends to ${NEXT.uni.R1}.` };
            return { ok: true, msg: `${PATH_PORTAL.replace(/ /g, ' → ')} and ${PATH_UNI.replace(/ /g, ' → ')}. Every router made one lookup and one decision. None of them knew the whole path, and both packets left R1 in different directions.` };
          },
          hints: ['Start at R1. In the column for 192.0.2.0/24 it says R2. Now read the line of R2.', `To the portal: ${PATH_PORTAL.split(' ').slice(0, 2).join(' ')} …`],
          solution: `to 192.0.2.80:   ${PATH_PORTAL}\nto 198.51.100.7: ${PATH_UNI}`,
          success: 'Forwarded.',
        },
        {
          id: 'broken',
          title: 'A line fails',
          mode: 'report',
          learn: [
            'Lines and routers fail. Routers notice this and tell their neighbours which networks they can still reach. Each router then updates its own table, without any central control.',
            'Packets that are on the way at that moment may be lost. IP delivers **best effort**: it tries, but it guarantees nothing.',
          ],
          example: { code: TABLES.replace('R2  →    R5 ', 'R2  →    R4*') + '\n\n* the line R2–R5 has failed. R2 now sends traffic for 192.0.2.0/24 to R4.', file: 'the tables after the failure' },
          task: 'The line between **R2 and R5** has failed, and R2 has updated its table. Which path does a packet from the hospital to the **portal server** take now?',
          fields: [{ id: 'path', type: 'text', label: 'New path to 192.0.2.80' }],
          verify: v => {
            const p = path(v.path);
            if (!p) return { ok: false, msg: 'Write the path as router names separated by spaces, starting with R1.' };
            if (p === PATH_PORTAL) return { ok: false, msg: 'That is the old path, over the failed line R2–R5. R2 now sends to R4.' };
            if (p === 'R1 R3 R4 R5') return { ok: false, msg: 'A possible path, but not the one the routers choose: R1’s table did not change and still says R2.' };
            if (p !== PATH_BROKEN) return { ok: false, msg: 'Not quite. Start at R1, follow its table to R2, and use R2’s new entry.' };
            return { ok: true, msg: `${PATH_BROKEN.replace(/ /g, ' → ')}: one hop longer, but the portal is still reachable. Only R2 had to change one line of its table.` };
          },
          hints: ['R1 still sends to R2. R2 now says R4.', 'From R4 the table for 192.0.2.0/24 says R5, which is directly connected.'],
          solution: PATH_BROKEN,
          success: 'Rerouted.',
        },
        {
          id: 'nat',
          title: 'Through the NAT router',
          mode: 'report',
          learn: [
            'The hospital router has one **public** address, 203.0.113.5. On the way out, **NAT** replaces the private source of each packet with this public address and a free **port** number, and notes the pair in its NAT table.',
            'A reply comes back to the public address and port. The router looks up the port and puts the private address back. A packet that matches no entry is dropped.',
          ],
          example: { code: NAT, file: 'the NAT table of the hospital router' },
          task: 'The laptop 192.168.1.10 (port 51000) has sent a request to the portal server 192.0.2.80, port 443. Use the NAT table to answer three questions.',
          fields: [
            { id: 'src', type: 'select', label: 'Source of the request on the Internet', options: [{ v: 'priv', t: '192.168.1.10:51000' }, { v: 'pub', t: '203.0.113.5:40001' }, { v: 'srv', t: '192.0.2.80:443' }] },
            { id: 'reply', type: 'select', label: 'A reply arrives for 203.0.113.5:40002. Who gets it?', options: [{ v: 'laptop', t: 'the laptop 192.168.1.10' }, { v: 'pc', t: "the nurses' PC 192.168.1.37" }, { v: 'drop', t: 'nobody, it is dropped' }] },
            { id: 'stray', type: 'select', label: 'A packet from outside arrives for 203.0.113.5:40999. Who gets it?', options: [{ v: 'laptop', t: 'the laptop 192.168.1.10' }, { v: 'pc', t: "the nurses' PC 192.168.1.37" }, { v: 'drop', t: 'nobody, it is dropped' }] },
          ],
          verify: v => {
            if (v.src === 'priv') return { ok: false, msg: 'The private address never leaves the hospital. NAT replaces it on the way out: look at the outside column of the laptop’s row.' };
            if (v.src === 'srv') return { ok: false, msg: '192.0.2.80 is the destination of the request, not its source.' };
            if (v.reply !== 'pc') return { ok: false, partial: true, msg: 'The source is right. For the reply, find port 40002 in the outside column: which inside address belongs to it?' };
            if (v.stray !== 'drop') return { ok: false, partial: true, msg: 'Port 40999 is not in the NAT table: nobody inside asked for this packet.' };
            return { ok: true, msg: 'The Internet sees 203.0.113.5:40001, port 40002 belongs to the nurses’ PC, and 40999 is dropped. That last answer is why devices behind NAT cannot be called from outside, a side effect that protects them a little, but does not replace a firewall.' };
          },
          hints: ['Each row pairs one inside address and port with one outside port.', 'Port 40999 appears in no row.'],
          solution: 'source on the Internet: 203.0.113.5:40001\nreply to port 40002: the nurses’ PC 192.168.1.37\nport 40999: dropped (no entry)',
          success: 'Translated.',
        },
      ],
      quiz: [
        {
          q: 'Does the first router on the way know the whole path to the portal server?',
          options: [
            { t: 'No, it only knows the next hop for each destination network', correct: true, why: 'Many small local decisions add up to the path.' },
            { t: 'Yes, it writes the path into the packet', why: 'The IP header has no field for a path.' },
            { t: 'Yes, it asks the server first', why: 'Routers decide alone, with their own table.' },
          ],
        },
        {
          q: 'A line between two routers fails. Who updates the routing tables?',
          options: [
            { t: 'The routers themselves, by telling their neighbours what they can reach', correct: true, why: 'Routing protocols do this automatically.' },
            { t: 'A central Internet control room', why: 'There is no central control. That is why the Internet survives failures.' },
            { t: 'Nobody: the network stays broken until the line is repaired', why: 'Where another path exists, traffic moves to it within seconds.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'A packet leaves the laptop with TTL 64 and crosses 9 routers. What is its TTL on arrival?',
          options: [
            { t: '55', correct: true, why: 'Every router lowers it by one: 64 − 9 = 55.' },
            { t: '64', why: 'Routers lower the TTL on every hop.' },
            { t: '9', why: 'That is the number of routers, not the remaining TTL.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      id: 'dns',
      title: 'Names to numbers',
      minutes: 19,
      goal: 'Find out whom the laptop asks for addresses, walk the DNS hierarchy yourself, and find out why the portal opens the wrong page.',
      steps: [
        {
          id: 'resolver',
          title: 'Who does the laptop ask?',
          setup: HOSTS_OK,
          learn: [
            'To turn a name into an address, the laptop asks a **DNS resolver**. Its address is written in the file `/etc/resolv.conf`, in the line **nameserver**. DHCP put it there when the laptop joined the network.',
            'In a hospital the resolver is a separate server. On this practice laptop it runs on the laptop itself.',
          ],
          example: { cmd: 'head -n 1 /etc/hosts', out: '127.0.0.1\tlocalhost', note: 'Small text files in /etc configure the system. /etc/resolv.conf is one of them.' },
          task: 'Print the line that names the **DNS resolver** of this laptop.',
          check: { output: 'lines', expect: 'grep nameserver /etc/resolv.conf' },
          diagnose: [{ when: { stdout: /localhost/ }, msg: 'That is /etc/hosts. The resolver is named in /etc/resolv.conf.' }],
          hints: ['The file is `/etc/resolv.conf`.', '`cat /etc/resolv.conf` or `grep nameserver /etc/resolv.conf`'],
          solution: 'grep nameserver /etc/resolv.conf',
          success: 'nameserver 127.0.0.1: the resolver of this practice laptop listens on the loopback. Your own laptop most likely names your router or the resolver of your provider or university.',
        },
        {
          id: 'lookup',
          title: 'Ask for an address',
          learn: [
            '`nslookup NAME` asks the resolver for the address of a name. **Server** shows who answered (port **53** is the port of DNS), **Name** and **Address** show the answer.',
            'The last line, *Can’t find …: No answer*, only says that the name has no IPv6 address. You can ignore it.',
          ],
          example: { cmd: 'nslookup portal.example.org', out: 'Server:\t\t127.0.0.1\nAddress:\t127.0.0.1:53\n\nName:\tportal.example.org\nAddress: 192.0.2.80\n\n*** Can\'t find portal.example.org: No answer', note: 'The patient portal is at 192.0.2.80.' },
          task: 'The hospital’s image archive is called `pacs.example.org`. Look up its address.',
          check: { output: 'names', expect: 'echo 192.0.2.82' },
          diagnose: [
            { when: { stdout: /NXDOMAIN/ }, msg: 'The resolver does not know that name. Check the spelling: pacs.example.org.' },
            { when: { stdout: /192\.0\.2\.80/ }, msg: 'That is the portal from the example. Look up the image archive, pacs.example.org.' },
          ],
          hints: ['Use the example with another name.', '`nslookup pacs.example.org`'],
          solution: 'nslookup pacs.example.org',
          success: '192.0.2.82. One question, one answer from the resolver. Only now could the browser send its first packet to the archive.',
        },
        {
          id: 'root',
          title: 'Start at the root',
          learn: [
            'The ward’s resolver here only knows a few names. For `telemed.example.org`, the video consultation service, it answers NXDOMAIN: no such name. A real resolver would now walk the **DNS hierarchy**. You do it yourself.',
            '`nslookup NAME SERVER` asks one particular server. The **root** server of this practice network is `127.0.0.2`. Each server answers with the **address of the next server** to ask. (Real root servers send a referral, an NS record, but the walk is the same.)',
          ],
          example: { cmd: 'nslookup telemed.example.org', out: "Server:\t\t127.0.0.1\nAddress:\t127.0.0.1:53\n\n** server can't find telemed.example.org: NXDOMAIN\n\n*** Can't find telemed.example.org: No answer", note: 'The ward’s resolver does not know this name: NXDOMAIN.' },
          task: 'Ask the **root** server `127.0.0.2` which server is responsible for the top-level domain **org**.',
          check: { output: 'names', expect: 'echo 127.0.0.3' },
          diagnose: [
            { when: { stdout: /NXDOMAIN/, command: /telemed/ }, msg: 'The root does not know individual names, only who is responsible for each ending. Ask it about `org`.' },
            { when: { stdout: /Address:\s+127\.0\.0\.1:53/ }, msg: 'That asked the ward’s resolver. Name the root server after the name: `nslookup org 127.0.0.2`.' },
          ],
          hints: ['Ask about the name `org`, and add the root server’s address after it.', '`nslookup org 127.0.0.2`'],
          solution: 'nslookup org 127.0.0.2',
          success: 'The root refers you to 127.0.0.3, the server for everything that ends in .org. It does not know telemed.example.org, and it does not need to.',
        },
        {
          id: 'tld',
          title: 'One level down',
          learn: [
            'The **TLD server** (top-level domain) of .org knows, for every domain that ends in .org, which server holds its records.',
            'You found its address in the previous step.',
          ],
          example: { cmd: 'nslookup de 127.0.0.2', out: 'Server:\t\t127.0.0.2\nAddress:\t127.0.0.2:53\n\nName:\tde\nAddress: 127.0.0.5\n\n*** Can\'t find de: No answer', note: 'The root knows the server of .de too. Every ending has its own.' },
          task: 'Ask the **.org server** you found which server is responsible for **example.org**.',
          check: { output: 'names', expect: 'echo 127.0.0.4' },
          mustUse: [{ re: /127\.0\.0\.3\b/, msg: 'Right answer, but ask the .org server you found in the previous step, 127.0.0.3: that is the walk a resolver makes.' }],
          diagnose: [
            { when: { stdout: /NXDOMAIN/, command: /127\.0\.0\.2\b/ }, msg: 'That asked the root again. Ask the .org server, 127.0.0.3.' },
            { when: { stdout: /NXDOMAIN/, command: /telemed/ }, msg: 'The .org server does not know individual computers either. Ask it about `example.org`.' },
          ],
          hints: ['Same command as before, with the name example.org and the server 127.0.0.3.', '`nslookup example.org 127.0.0.3`'],
          solution: 'nslookup example.org 127.0.0.3',
          success: '127.0.0.4: the **authoritative** server of example.org, run by the hospital or a provider for it. It holds the original records.',
        },
        {
          id: 'auth',
          title: 'The authoritative answer',
          learn: [
            'The **authoritative** server of a domain holds its records: the binding answers. Everyone else only passes on or caches copies.',
            'A resolver stores every answer for a while (its **TTL** in seconds), so the next lookup of the same name skips the whole walk.',
          ],
          example: { cmd: 'nslookup portal.example.org 127.0.0.4', out: 'Server:\t\t127.0.0.4\nAddress:\t127.0.0.4:53\n\nName:\tportal.example.org\nAddress: 192.0.2.80\n\n*** Can\'t find portal.example.org: No answer', note: 'The same address as from the ward’s resolver, now from the source.' },
          task: 'Finish the walk: ask the authoritative server of example.org for the address of **telemed.example.org**.',
          check: { output: 'names', expect: 'echo 192.0.2.90' },
          mustUse: [{ re: /127\.0\.0\.4\b/, msg: 'Ask the authoritative server you found, 127.0.0.4.' }],
          diagnose: [
            { when: { stdout: /NXDOMAIN/, command: /127\.0\.0\.1\b|nslookup telemed\.example\.org\s*$/ }, msg: 'That asked the ward’s resolver, which does not know the name. Add the authoritative server: `127.0.0.4`.' },
            { when: { stdout: /192\.0\.2\.80/ }, msg: 'That is the portal from the example. Ask for telemed.example.org.' },
          ],
          hints: ['Same command as the example, with the name telemed.example.org.', '`nslookup telemed.example.org 127.0.0.4`'],
          solution: 'nslookup telemed.example.org 127.0.0.4',
          success: '192.0.2.90. You walked root → .org → example.org, exactly as a recursive resolver does. No single server knows all names: each one knows only the next level. That is why DNS has no central list and keeps working when one server fails.',
        },
        {
          id: 'hosts',
          title: 'A wrong shortcut',
          setup: HOSTS_BAD,
          learn: [
            'Before most programs ask DNS, they look into the file `/etc/hosts`. A line there **wins** over DNS. `nslookup` is an exception: it always asks DNS.',
            '`ping` shows in its first line which address a name was turned into. With `-c 1 -W 1` it sends one packet and waits at most one second.',
          ],
          example: { cmd: 'ping -c 1 -W 1 localhost | head -n 1', out: 'PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.', note: 'ping turned the name localhost into 127.0.0.1. That line comes from /etc/hosts, not from DNS.' },
          task: 'On this laptop the portal opens the wrong page. `nslookup portal.example.org` still answers 192.0.2.80, but `ping` goes somewhere else. Find the line in `/etc/hosts` that causes this and **print it**.',
          check: { output: 'lines', expect: 'grep portal /etc/hosts' },
          diagnose: [
            { when: { stdout: /localhost[\s\S]*portal/ }, msg: 'That is the whole file. Print only the line about the portal: `grep portal /etc/hosts`.' },
            { when: { stdout: /^PING 192\.0\.2\.99/ }, msg: 'Right, ping goes to 192.0.2.99. Now find the line in /etc/hosts that says so.' },
          ],
          hints: ['`cat /etc/hosts` shows the whole file. One line does not belong there.', '`grep portal /etc/hosts`'],
          solution: 'grep portal /etc/hosts',
          success: 'Found it: someone pinned portal.example.org to 192.0.2.99 in /etc/hosts, maybe during a test, and forgot it. The browser on this laptop believes the file, not DNS. A classic of hospital IT: “it works on every laptop except this one”.',
        },
        {
          id: 'fix',
          title: 'Fix the laptop',
          setup: HOSTS_BAD,
          learn: [
            'Normally only the administrator may change `/etc/hosts`. On this practice laptop you may.',
            '`grep -v WORD FILE` prints every line **without** WORD. Write the result to a temporary file, then copy it back with `cat TEMP > /etc/hosts`.',
          ],
          example: { cmd: 'grep -v localhost /etc/hosts', out: '127.0.1.1\tward3-laptop\n192.0.2.99\tportal.example.org', note: 'Every line except the one with localhost.', afterSetup: true },
          task: 'Remove the wrong portal line from `/etc/hosts` and keep the other two lines. Then the portal resolves to 192.0.2.80 again.',
          check: { state: "if grep -q portal /etc/hosts; then echo STILL; elif ! grep -q localhost /etc/hosts || ! grep -q ward3-laptop /etc/hosts; then echo LOST; elif ping -c 1 -W 1 portal.example.org 2>/dev/null | head -n 1 | grep -q 192.0.2.80; then echo OK; else echo NAME; fi" },
          reasons: {
            STILL: 'The portal line is still in /etc/hosts. Write all other lines to a temporary file with `grep -v portal /etc/hosts > /tmp/hosts`, then `cat /tmp/hosts > /etc/hosts`.',
            LOST: 'The portal line is gone, but so is the line for localhost or ward3-laptop. Click Reset exercise and remove only the portal line.',
            NAME: 'The file looks right, but the portal does not resolve to 192.0.2.80 yet. Check it with `ping -c 1 -W 1 portal.example.org | head -n 1`.',
          },
          diagnose: [{ when: { stderr: /can't create|Permission denied/ }, msg: 'Linux could not write that file. Write the temporary file to /tmp, for example `/tmp/hosts`.' }],
          hints: ['`grep -v portal /etc/hosts > /tmp/hosts` keeps every line except the wrong one.', 'Then `cat /tmp/hosts > /etc/hosts`. Check with `cat /etc/hosts`.'],
          solution: 'grep -v portal /etc/hosts > /tmp/hosts\ncat /tmp/hosts > /etc/hosts\nping -c 1 -W 1 portal.example.org | head -n 1',
          success: 'Fixed. Without the shortcut, the laptop asks DNS again and gets 192.0.2.80, the real portal server.',
        },
      ],
      quiz: [
        {
          q: 'A resolver asks a root server for portal.example.org. What does the root server answer?',
          options: [
            { t: 'Where to find the servers responsible for .org', correct: true, why: 'The root only knows the servers of the top-level domains.' },
            { t: 'The address 192.0.2.80', why: 'Only the authoritative server of example.org knows that record.' },
            { t: 'Nothing, roots only answer other roots', why: 'Root servers answer every resolver: they are the starting point of every walk.' },
          ],
        },
        {
          q: 'DNS says 192.0.2.80, but /etc/hosts on one laptop says 192.0.2.99 for the same name. Where does the browser on that laptop go?',
          options: [
            { t: 'To 192.0.2.99: /etc/hosts is checked before DNS', correct: true, why: 'That is why one wrong line can break one laptop while all others work.' },
            { t: 'To 192.0.2.80: DNS always wins', why: 'Most programs look into /etc/hosts first. Only nslookup asks DNS directly.' },
            { t: 'To both, one after the other', why: 'The name is turned into one address before the first packet is sent.' },
          ],
        },
        {
          review: 'Review from chapter 4',
          q: 'A packet from outside arrives at the hospital router for a public port that is not in the NAT table. What happens?',
          options: [
            { t: 'It is dropped', correct: true, why: 'Nobody inside asked for it, so the router does not know where it belongs.' },
            { t: 'It goes to every device in the hospital', why: 'NAT never guesses: no entry, no delivery.' },
            { t: 'It goes to the default gateway', why: 'The router is the gateway. It has no table entry to forward the packet with.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      id: 'challenge',
      title: 'Mini challenge: the network report',
      minutes: 6,
      goal: 'Collect the network facts of this laptop in one report, with less help.',
      steps: [
        {
          id: 'report',
          title: 'Write the network report',
          setup: HOSTS_OK + '; rm -rf ~/reports',
          learn: [
            'The hospital’s IT service desk wants four facts about this laptop in a small report. Each line has the form `key=value`, without spaces.',
            'You found every value in this practical: the laptop’s IPv4 address (without /24), its default gateway, its DNS resolver, and the address of portal.example.org.',
          ],
          example: { cmd: 'echo host=$(hostname)', out: 'host=ward3-laptop', note: '`$( )` puts the output of a command into a line. You may also type the values by hand.' },
          task: 'Create `~/reports/network.txt` with exactly these four keys, one per line: `ip`, `gateway`, `resolver`, `portal`.',
          check: { state: REPORT_CHECK },
          reasons: {
            MISSING: 'There is no `~/reports/network.txt` yet. Create the folder with `mkdir -p ~/reports`, then write the lines with `echo ... >` and `>>`.',
            IP: 'The line `ip=…` is missing or wrong. Chapter 1: the address of eth0, without /24.',
            GW: 'The line `gateway=…` is missing or wrong. Chapter 1: the line default via in `ip route`.',
            NS: 'The line `resolver=…` is missing or wrong. Chapter 5: the nameserver in /etc/resolv.conf.',
            PORTAL: 'The line `portal=…` is missing or wrong. Chapter 5: the address of portal.example.org.',
            EXTRA: 'All four values are right, but the file has more than four lines. Keep only the four `key=value` lines.',
          },
          hints: ['Start with `mkdir -p ~/reports`, then `echo ip=192.168.1.10 > ~/reports/network.txt`.', 'Add the other three lines with `>>`. Check the result with `cat ~/reports/network.txt`.'],
          solution: 'mkdir -p ~/reports\necho ip=192.168.1.10 > ~/reports/network.txt\necho gateway=192.168.1.1 >> ~/reports/network.txt\necho resolver=127.0.0.1 >> ~/reports/network.txt\necho portal=192.0.2.80 >> ~/reports/network.txt',
          success: 'Report complete. Four values describe how this laptop reaches anything: who it is, its way out, whom it asks for names, and where the portal lives.',
        },
      ],
      quiz: [
        {
          q: 'A colleague can open the portal by its address 192.0.2.80, but not by its name. What is most likely broken?',
          options: [
            { t: 'Name resolution: DNS or /etc/hosts', correct: true, why: 'The address works, so addresses, gateway and routing are fine. Only the step from name to address fails.' },
            { t: 'The default gateway', why: 'Without a working gateway, the address would not work either.' },
            { t: 'The portal server', why: 'It answered when it was addressed directly.' },
          ],
        },
        {
          review: 'Review from chapter 2',
          q: 'Which of these is a private address?',
          options: [
            { t: '172.25.0.9', correct: true, why: '172.16 to 172.31 is private.' },
            { t: '172.35.0.9', why: '172.35 is outside 172.16 to 172.31.' },
            { t: '192.0.2.80', why: '192.0.2 is not 192.168.' },
          ],
        },
      ],
    },
  ],

  summary: [
    ['ip addr', 'the network connections and IP addresses of a computer'],
    ['ip route', 'the routing table, including the default gateway'],
    ['ip route get ADDRESS', 'which route the kernel would use for a destination'],
    ['ping -c N ADDRESS', 'send N test packets and wait for the echo'],
    ['capture COMMAND', 'show the packets of a command (course program, uses tcpdump)'],
    ['nslookup NAME [SERVER]', 'ask DNS for the address of a name, optionally one particular server'],
    ['/etc/resolv.conf', 'names the DNS resolver'],
    ['/etc/hosts', 'fixed names, checked before DNS'],
    ['ipconfig (Windows)', 'address, subnet mask and gateway on your own laptop'],
  ],

  done: {
    lead: 'You found the address and the way out of a ward laptop and of your own laptop, decided like the laptop which packets go to the gateway, watched real packets leave, forwarded a packet through routers and through NAT by hand, walked the DNS hierarchy, and fixed a laptop that opened the wrong portal.',
    columns: ['Command', 'What it does'],
    recap: [
      'Every connection has an **IP address**. **Private** ranges (10, 172.16–31, 192.168) are reused in every network; NAT translates them to a **public** address on the way out.',
      'Same **network part**: deliver directly. Otherwise: hand the packet to the **default gateway**.',
      'Data travels in **packets**. Routers read only the header: **destination**, source and **TTL**, which every router lowers by one.',
      'Each router knows only the **next hop**. When a line fails, routers update their tables themselves; IP delivers **best effort**.',
      '**DNS** turns names into addresses: root → TLD → authoritative server. **/etc/hosts** is checked first and can override it.',
    ],
  },
};
})();
