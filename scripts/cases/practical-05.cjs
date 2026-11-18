/*
 * Test cases for every exercise of Practical 05, shared by test_learning.cjs and
 * test_course_browser.cjs.
 *
 * Shell steps (browser Linux): wrong commands with the expected feedback, alternative correct
 * commands. Every case starts from the step's setup (Reset exercise), so no undo is needed.
 * Report steps: answers as { fieldId: value }; verify() recomputes every expected value.
 */
const REPORT = lines => `mkdir -p ~/reports; printf '${lines.join('\\n')}\\n' > ~/reports/network.txt`;
const GOOD = ['ip=192.168.1.10', 'gateway=192.168.1.1', 'resolver=127.0.0.1', 'portal=192.0.2.80'];
module.exports = {
  saved: {},

  // ---------------------------------------------------------------- shell steps
  'address/addr': {
    wrong: [['ip addr show eth0', /whole block/], ['ip addr show lo | grep inet', /loopback lo/], ['ip addr | grep inet', /Two lines/]],
    alts: ['ip addr | grep 192.168', 'ip -4 addr show eth0 | grep inet', "ip addr show eth0 | grep 'inet '"],
  },
  'address/gateway': {
    wrong: [['ip route', /whole routing table/], ['ip route | grep link', /rule for the ward network/]],
    alts: ['ip route | grep via', 'ip route | head -n 1'],
  },
  'local/kernel': {
    wrong: [['ip route get 192.168.1.20', /printer from the example/], ['ip route get 192.0.2.80', /portal server/]],
    alts: ['ip route get 192.168.2.20 | head -n 1', 'ip r get 192.168.2.20'],
  },
  'packets/ping': {
    wrong: [['ping -c 3 192.168.1.10', /exactly two/], ['ping -c 2 127.0.0.1', /another address/], ['ping -c 2 -W 1 192.168.1.20', /No echo came back/],
      ['ping 192.168.1.10', /keeps sending/]],
    alts: ['ping -c2 192.168.1.10', 'ping -c 2 -W 1 192.168.1.10'],
  },
  'packets/capture': {
    wrong: [['capture ping -c 1 127.0.0.1', /loopback from the example/], ['ping -c 1 -W 1 192.0.2.80', /capture in front/], ['capture', /whole ping command/]],
    alts: ['capture ping -c 1 -W 1 192.0.2.80', 'capture ping -c 2 192.0.2.80'],
  },
  'packets/ttl': {
    wrong: [['capture ping -c 1 192.0.2.80', /-t 3/], ['capture ping -c 1 -t 3 127.0.0.1', /loopback/]],
    alts: ['capture ping -t 3 -c 1 192.0.2.80'],
  },
  'dns/resolver': {
    wrong: [['cat /etc/hosts', /resolv\.conf/], ['grep nameserver /etc/hosts', /printed nothing/]],
    alts: ['cat /etc/resolv.conf', 'grep ^nameserver /etc/resolv.conf'],
  },
  'dns/lookup': {
    wrong: [['nslookup portal.example.org', /portal from the example/], ['nslookup pacs.example.com', /spelling/]],
    alts: ['nslookup pacs.example.org 127.0.0.1', 'nslookup -type=a pacs.example.org'],
  },
  'dns/root': {
    wrong: [['nslookup telemed.example.org 127.0.0.2', /Ask it about/], ['nslookup org', /asked the ward/]],
    alts: ['nslookup -type=a org 127.0.0.2'],
  },
  'dns/tld': {
    wrong: [['nslookup example.org 127.0.0.2', /asked the root again/], ['nslookup telemed.example.org 127.0.0.3', /individual computers/], ['echo 127.0.0.4', /\.org server you found/]],
    alts: ['nslookup -type=a example.org 127.0.0.3'],
  },
  'dns/auth': {
    wrong: [['nslookup telemed.example.org', /ward’s resolver/], ['nslookup portal.example.org 127.0.0.4', /portal from the example/]],
    alts: ['nslookup -type=a telemed.example.org 127.0.0.4'],
  },
  'dns/hosts': {
    wrong: [['cat /etc/hosts', /whole file/], ['ping -c 1 -W 1 portal.example.org | head -n 1', /find the line/]],
    alts: ['grep 192.0.2.99 /etc/hosts', 'tail -n 1 /etc/hosts'],
  },
  'dns/fix': {
    wrong: [['grep -v portal /etc/hosts', /still in/], ["echo '127.0.0.1 localhost' > /etc/hosts", /localhost or ward3-laptop/],
      ['grep -v portal /etc/hosts > /etc/hosts', /Reset exercise/]],
    alts: ['grep -v 192.0.2.99 /etc/hosts > /tmp/h; cat /tmp/h > /etc/hosts', 'head -n 2 /etc/hosts > /tmp/x && cat /tmp/x > /etc/hosts'],
  },
  'challenge/report': {
    wrong: [['ls', /no `?~\/reports\/network\.txt`? yet/],
      [REPORT(['ip=192.168.1.10/24'].concat(GOOD.slice(1))), /without \/24/],
      [REPORT(GOOD.slice(0, 2).concat(['resolver=192.168.1.1', GOOD[3]])), /nameserver/],
      [REPORT(GOOD.slice(0, 3).concat(['portal=192.0.2.99'])), /portal\.example\.org/],
      [REPORT(['network report'].concat(GOOD)), /more than four lines/]],
    alts: [REPORT(GOOD.slice().reverse()),
      "mkdir -p ~/reports; cd ~/reports; echo ip=$(ip addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1) > network.txt; echo gateway=$(ip route | awk '/default/ {print $3}') >> network.txt; echo resolver=$(awk '{print $2}' /etc/resolv.conf) >> network.txt; echo portal=192.0.2.80 >> network.txt"],
  },

  // ---------------------------------------------------------------- report steps
  'address/laptop': {
    wrong: [
      [{ ip: 'abc', gw: '192.168.178.1', kind: 'private' }, /four numbers/],
      [{ ip: '127.0.0.1', gw: '192.168.178.1', kind: 'private' }, /loopback/],
      [{ ip: '169.254.3.4', gw: '169.254.0.1', kind: 'private' }, /DHCP/],
      [{ ip: '192.168.178.42', gw: 'x', kind: 'private' }, /default gateway as four numbers/],
      [{ ip: '192.168.178.42', gw: '192.168.178.42', kind: 'private' }, /own address again/],
      [{ ip: '192.168.178.42', gw: '192.168.178.1', kind: 'public' }, /private range/],
      [{ ip: '141.89.225.17', gw: '141.89.225.1', kind: 'private' }, /so it is public/],
      [{ ip: '192.168.178.42', gw: '8.8.8.8', kind: 'private' }, /DNS server/],
    ],
    alts: [{ ip: '141.89.225.17', gw: '141.89.225.1', kind: 'public' }, { ip: '10.20.3.44', gw: '10.20.0.1', kind: 'private' }, { ip: ' 192.168.1.50/24 ', gw: '192.168.1.1', kind: 'private' }],
    model: { ip: '192.168.178.42', gw: '192.168.178.1', kind: 'private' },
  },
  'local/private': {
    wrong: [
      [{ priv: ['10.20.3.44', '172.20.1.5', '172.40.1.5', '192.168.178.42'] }, /172\.40\.1\.5 is not private/],
      [{ priv: ['192.0.2.80', '10.20.3.44'] }, /192\.0\.2\.80 is not private/],
      [{ priv: ['10.20.3.44', '192.168.178.42'] }, /one private address is missing/],
      [{ priv: [] }, /at least one/],
    ],
    alts: [{ priv: ['192.168.178.42', '10.20.3.44', '172.20.1.5'] }],
    model: { priv: ['10.20.3.44', '172.20.1.5', '192.168.178.42'] },
  },
  'local/decide': {
    wrong: [
      [{ printer: 'direct', pc: 'direct', portal: 'gateway', ward4: 'direct', edge: 'direct' }, /192\.168\.2\.20 is private/],
      [{ printer: 'direct', pc: 'direct', portal: 'gateway', ward4: 'gateway', edge: 'gateway' }, /access point is a neighbour/],
      [{ printer: 'direct', pc: 'direct', portal: 'direct', ward4: 'gateway', edge: 'direct' }, /network part is 192\.0\.2/],
      [{ printer: 'gateway', pc: 'direct', portal: 'gateway', ward4: 'gateway', edge: 'direct' }, /the same as the laptop/],
    ],
    alts: [],
    model: { printer: 'direct', pc: 'direct', portal: 'gateway', ward4: 'gateway', edge: 'direct' },
  },
  'packets/header': {
    wrong: [
      [{ src: '192.0.2.80', dst: '192.168.1.10', ttl: '64' }, /swapped/],
      [{ src: '192.168.1.1', dst: '192.0.2.80', ttl: '64' }, /not in the IP header/],
      [{ src: '127.0.0.1', dst: '192.0.2.80', ttl: '64' }, /sender of the packet/],
      [{ src: '192.168.1.10', dst: '192.0.2.80', ttl: '63' }, /number after ttl=/],
      [{ src: '192.168.1.10', dst: '192.0.2.80', ttl: 'x' }, /whole number/],
    ],
    alts: [{ src: ' 192.168.1.10 ', dst: '192.0.2.80 ', ttl: ' 64' }],
    model: { src: '192.168.1.10', dst: '192.0.2.80', ttl: '64' },
  },
  'packets/count': {
    wrong: [
      [{ xray: '3424', vital: '1' }, /round up/],
      [{ xray: '3334', vital: '1' }, /1,500/],
      [{ xray: '3500', vital: '1' }, /Not quite/],
      [{ xray: '3425', vital: '0' }, /Even a small/],
      [{ xray: '3425', vital: '2' }, /single packet/],
    ],
    alts: [{ xray: ' 3425 ', vital: '1' }],
    model: { xray: '3425', vital: '1' },
  },
  'routing/forward': {
    wrong: [
      [{ portal: 'R1 R3 R6', uni: 'R1 R2 R5' }, /swapped/],
      [{ portal: 'R2 R5', uni: 'R1 R3 R6' }, /starts at R1/],
      [{ portal: 'R1 R2 R4 R5', uni: 'R1 R3 R6' }, /Where does R2 send it/],
      [{ portal: 'R1 R2 R5', uni: 'R1 R2 R4 R6' }, /second column/],
      [{ portal: 'x', uni: 'y' }, /router names/],
    ],
    alts: [{ portal: 'r1 → r2 → r5', uni: 'R1, R3, R6' }],
    model: { portal: 'R1 R2 R5', uni: 'R1 R3 R6' },
  },
  'routing/broken': {
    wrong: [[{ path: 'R1 R2 R5' }, /old path/], [{ path: 'R1 R3 R4 R5' }, /did not change/], [{ path: 'R1 R4 R5' }, /Not quite/], [{ path: 'hello' }, /router names/]],
    alts: [{ path: 'R1-R2-R4-R5' }],
    model: { path: 'R1 R2 R4 R5' },
  },
  'routing/nat': {
    wrong: [
      [{ src: 'priv', reply: 'pc', stray: 'drop' }, /never leaves/],
      [{ src: 'srv', reply: 'pc', stray: 'drop' }, /destination of the request/],
      [{ src: 'pub', reply: 'laptop', stray: 'drop' }, /port 40002/],
      [{ src: 'pub', reply: 'pc', stray: 'laptop' }, /40999 is not in/],
    ],
    alts: [],
    model: { src: 'pub', reply: 'pc', stray: 'drop' },
  },
};
