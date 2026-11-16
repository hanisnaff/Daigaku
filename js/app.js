(() => {
  const KEY = "daigaku.subjects.v1";
  const read = () => { try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
  const write = (items) => localStorage.setItem(KEY, JSON.stringify(items));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const subjects = read();
  const list = document.getElementById("subject-list");
  if (list) {
    const count = document.getElementById("subject-count");
    const attendance = document.getElementById("attendance-average");
    const grades = document.getElementById("grade-count");
    count.textContent = subjects.length;
    const valid = subjects.filter(s => s.total > 0);
    attendance.textContent = valid.length ? Math.round(valid.reduce((sum,s) => sum + (s.attended / s.total) * 100,0) / valid.length) + "%" : "—";
    grades.textContent = subjects.filter(s => s.grade).length;
    list.innerHTML = subjects.length ? subjects.map((s,i) => {
      const pct = s.total > 0 ? Math.round((s.attended / s.total) * 100) : null;
      return '<article class="subject-row"><div><div class="subject-name">'+escapeHtml(s.name)+'</div><div class="subject-meta">'+(s.grade ? "Grade: "+escapeHtml(s.grade)+" · " : "")+(pct === null ? "Attendance not added" : escapeHtml(s.attended)+"/"+escapeHtml(s.total)+" classes")+'</div></div><div style="display:flex;align-items:center;gap:8px"><span class="attendance">'+(pct === null ? "—" : pct+"%")+'</span><button class="btn secondary" type="button" data-remove="'+i+'" aria-label="Remove '+escapeHtml(s.name)+'" style="padding:7px 9px;font-size:12px">Remove</button></div></article>';
    }).join("") : '<div class="empty-state">No subjects yet. Add your first subject using the form.</div>';
    list.addEventListener("click", event => {
      const button = event.target.closest("[data-remove]");
      if (!button) return;
      const next = read(); next.splice(Number(button.dataset.remove),1); write(next); location.reload();
    });
    const form = document.getElementById("subject-form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(form);
      const attended = Number(data.get("attended")), total = Number(data.get("total"));
      const message = document.getElementById("form-message");
      if (attended < 0 || total < 0 || attended > total) { message.textContent = "Check the class counts: attended cannot be greater than total."; return; }
      const next = read();
      next.push({name:String(data.get("name")).trim(),attended,total,grade:String(data.get("grade") || "")});
      write(next); location.reload();
    });
  }
  const summary = document.getElementById("semester-summary");
  if (summary && subjects.length) summary.innerHTML = '<div class="subject-list">'+subjects.map(s => '<div class="subject-row"><div><div class="subject-name">'+escapeHtml(s.name)+'</div><div class="subject-meta">'+(s.grade ? "Grade: "+escapeHtml(s.grade) : "Grade not recorded")+'</div></div><span class="attendance">'+(s.total ? Math.round(s.attended/s.total*100)+"% attendance" : "Attendance —")+'</span></div>').join("")+'</div>';
})();