/*
 * The practical sessions of the lab (level 1 of the navigation).
 *
 * To add a session: write docs/assets/practical-NN.js (window.PRACTICAL with the same
 * `id` as here), add docs/practical-NN.md with `practical: practical-NN` in its front
 * matter, add it to `nav` in mkdocs.yml, and set its entry below to status: 'ready'.
 * Entries with status 'soon' are shown as "Coming soon" and are not clickable.
 */
window.ITS4DH_LAB = {
  course: 'IT Systems for Digital Health Experts',
  title: 'ITS4DH Practical Lab',
  lead: 'One hands-on practical per lecture week. Each one takes about 90 minutes: read a little, try it yourself in a real Linux system, get feedback straight away.',
  note: 'Progress is saved in this browser only. All data in the practicals is synthetic: no real patients are involved.',
  sessions: [
    { id: 'its4dh-p01', slug: 'practical-01', number: 'Practical 01', title: 'OS fundamentals', navTitle: 'Linux terminal fundamentals',
      subtitle: 'The Linux terminal: files, folders, logs and pipes.', pillar: 'Pillar 1: Operating systems', minutes: 90, status: 'ready' },
    { id: 'its4dh-p02', slug: 'practical-02', number: 'Practical 02', title: 'Processes & threads', navTitle: 'Processes & threads',
      subtitle: 'Run, inspect and stop processes. Make waiting programs faster with threads, and keep shared data safe.', pillar: 'Pillar 1: Operating systems', minutes: 90, status: 'ready' },
    { id: 'its4dh-p03', slug: 'practical-03', number: 'Practical 03', title: 'IPC & scheduling', navTitle: 'IPC & scheduling',
      subtitle: 'Let processes talk through pipes and sockets, cause and fix a race and a deadlock, and be the scheduler.', pillar: 'Pillar 1: Operating systems', minutes: 90, status: 'ready' },
    { id: 'its4dh-p04', slug: 'practical-04', number: 'Practical 04', title: 'Memory & isolation',
      subtitle: 'Virtual memory, permissions and containers.', pillar: 'Pillar 1: Operating systems', minutes: 90, status: 'soon' },
  ],
};
