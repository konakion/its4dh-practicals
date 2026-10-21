/* Legacy self-assessment plus real Linux execution for the grep prototype. */
(() => {
  'use strict';
  const asset = document.currentScript.src;
  const key = 'its4dh-practical01-v1';
  let state = {tasks: {}, quizzes: {}, drafts: {}};
  try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && saved.tasks && saved.quizzes && saved.drafts) state = saved; } catch (_) {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} };
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
  function accepts(step, raw) {
    const value = raw.trim();
    if (step.kind === 'text') return value === step.answer;
    if (step.kind === 'number') return /^\d+$/.test(value) && Number(value) === Number(step.answer);
    if (step.kind === 'names') return JSON.stringify(value.split(/\s+/).sort()) === JSON.stringify([...step.answer].sort());
    if (step.kind === 'path') return value.startsWith('/') && value.replace(/\/+$/, '').endsWith(step.answer);
    if (step.kind === 'report') {
      try { const r = JSON.parse(value); return r.schema === 'its4dh-work-v1' && ['sources','review_copy','upload_errors','platform_errors','storage_errors','incident_structure'].every(k => r.checks[k] === true); } catch (_) { return false; }
    }
    return false;
  }
  // Pure validator exposed for local regression checks; never a shell interpreter.
  window.ITS4DH = {accepts};
  fetch(new URL('learning.json', asset)).then(r => { if (!r.ok) throw Error('Unable to load activities'); return r.json(); }).then(steps => {
    const labs = [...document.querySelectorAll('.learning-lab')];
    if (!labs.length) return;
    function updateProgress() {
      document.querySelectorAll('.lab-progress').forEach(n => {
        const count = steps.filter(s => state.tasks[s.id] && state.quizzes[s.id]).length;
        n.textContent = `${count} / ${steps.length} chapters checked · saved on this browser`;
        const meter = n.nextElementSibling; meter.value = count;
      });
    }
    function quiz(step, host) {
      const box = el('fieldset'); box.append(el('legend', step.question));
      const feedback = el('p'); feedback.setAttribute('aria-live','polite');
      step.options.forEach((option, i) => {
        const label = el('label', '', 'lab-option'); const radio = el('input'); radio.type = 'radio'; radio.name = `quiz-${step.id}-${host.dataset.review || 'main'}`; if (!host.dataset.review && state.quizzes[step.id] === true && i === step.correct) radio.checked = true; label.append(radio, document.createTextNode(option));
        radio.addEventListener('change', () => {
          const correct = i === step.correct; state.quizzes[step.id] = correct; save();
          feedback.textContent = `${correct ? 'Correct.' : 'Try again.'} ${step.why}`; feedback.className = correct ? 'lab-success' : 'lab-retry'; updateProgress();
        }); box.append(label);
      }); box.append(feedback); host.append(box);
    }
    labs.forEach(host => {
      const step = steps.find(s => s.id === host.dataset.step); if (!step) return;
      host.append(el('p', '', 'lab-progress'));
      const meter = el('progress'); meter.max = steps.length; meter.setAttribute('aria-label','Chapters checked'); host.append(meter);
      host.append(el('h3', step.title), el('p', step.intro));
      if (step.id === 'logs') {
        window.mountShellLab(host, step, ok => {state.tasks[step.id]=ok; save(); updateProgress();});
      } else {
      const workspace = el('a','Open Linux Codespace ↗'); workspace.href = 'https://codespaces.new/konakion/its4dh-practicals'; workspace.target = '_blank'; workspace.rel = 'noopener'; host.append(workspace);
      host.append(el('h4','Example · run in Codespaces'));
      const pre = el('pre'); pre.append(el('code',step.command)); host.append(pre);
      const copy = el('button','Copy example'); copy.type='button'; copy.addEventListener('click',async () => { try { await navigator.clipboard.writeText(step.command); copy.textContent='Copied'; } catch (_) { copy.textContent='Select the example and copy manually'; } }); host.append(copy);
      host.append(el('h4','Expected output'),el('pre',step.output),el('h4','Your transfer task'),el('p',step.task));
      const form = el('form');
      const commandId = `command-${step.id}`, answerId = `answer-${step.id}`;
      const commandLabel = el('label','Your commands (recorded for reflection; not executed or graded here)'); commandLabel.htmlFor=commandId;
      const commands = el('textarea'); commands.id=commandId; commands.rows=3; commands.spellcheck=false; commands.value=state.drafts[step.id]?.commands || '';
      const label = el('label',step.kind === 'report' ? 'Checker JSON from Codespaces' : 'Paste the requested output'); label.htmlFor=answerId;
      const answer = el('textarea'); answer.id=answerId; answer.rows=step.kind === 'report' ? 7 : 3; answer.spellcheck=false; answer.required=true; answer.value=state.drafts[step.id]?.answer || '';
      const persist = () => { state.drafts[step.id] = {commands:commands.value,answer:answer.value}; delete state.tasks[step.id]; save(); updateProgress(); };
      commands.addEventListener('input',persist); answer.addEventListener('input',persist);
      const submit=el('button','Check result'); submit.type='submit';
      const feedback=el('p'); feedback.setAttribute('role','status');
      form.append(commandLabel,commands,label,answer,submit,feedback);
      form.addEventListener('submit',event => { event.preventDefault(); const ok=accepts(step,answer.value); state.tasks[step.id]=ok; save(); updateProgress(); feedback.className=ok?'lab-success':'lab-retry'; feedback.textContent=ok?'Result matches. Explain why your command works, then answer the recall question. This checks the pasted result; the final Linux checker verifies generated files.':'Not yet. Check your current directory, filename and case. Paste only the requested output. For the final JSON, resolve every false check in Codespaces first.'; });
      host.append(form);
      }
      host.append(el('h4','Recall check')); quiz(step,host);
      const details=el('details'); details.append(el('summary','Quiz review · revisit missed questions'));
      const review=el('div'); details.append(review);
      const refresh=el('button','Start review / repeat tomorrow'); refresh.type='button';
      refresh.addEventListener('click',() => { review.replaceChildren(); const missed=steps.filter(s=>!state.quizzes[s.id]); const selected=missed.length?missed:steps; selected.forEach(s=>{const panel=el('div'); panel.dataset.review='review'; quiz(s,panel); review.append(panel);}); }); details.append(refresh); host.append(details);
      const reset=el('button','Reset learning progress'); reset.type='button'; reset.className='lab-reset'; reset.addEventListener('click',()=>{ if(window.confirm('Clear your saved answers and progress in this browser? Your Linux files stay intact.')) {state={tasks:{},quizzes:{},drafts:{}};save();location.reload();} }); host.append(reset);
    }); updateProgress();
  }).catch(() => { document.querySelectorAll('.learning-lab').forEach(host => host.textContent='The interactive lab could not load. Reload this page through the preview server. The chapter above remains available.'); });
})();
