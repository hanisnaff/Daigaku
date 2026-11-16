(() => {
  "use strict";
  const KEY = "daigaku.subjects.v1";
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const normalise = (item) => {
    const finiteCount = (value) => {
      const number = typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : NaN;
      return Number.isSafeInteger(number) ? Math.max(0, number) : 0;
    };
    const total = finiteCount(item?.total);
    const attended = Math.min(finiteCount(item?.attended), total);
    const allowedGrades = new Set(["", "O", "A+", "A", "B+", "B", "C", "F"]);
    const grade = String(item?.grade ?? "");
    const semester = String(item?.semester ?? "Current semester");
    const validSemester = semester === "Current semester" || /^Semester [1-8]$/.test(semester);
    return {
      name: String(item?.name ?? "").trim().slice(0,70),
      attended,
      total,
      grade: allowedGrades.has(grade) ? grade : "",
      semester: validSemester ? semester : "Current semester"
    };
  };
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value.filter(x => x && typeof x === "object").map(normalise).filter(x => x.name) : [];
    } catch { return []; }
  };
  const parseCsv = (source) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    let closedQuote = false;
    const input = String(source).replace(/^\uFEFF/, "");

    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      if (quoted) {
        if (character === '"' && input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
          closedQuote = true;
        } else {
          field += character;
        }
      } else if (closedQuote) {
        if (character === ",") {
          row.push(field);
          field = "";
          closedQuote = false;
        } else if (character === "\r" || character === "\n") {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
          closedQuote = false;
          if (character === "\r" && input[index + 1] === "\n") index += 1;
        } else if (!/\s/.test(character)) {
          throw new Error("The CSV file has invalid characters after a quoted field.");
        }
      } else if (character === '"') {
        if (field !== "") throw new Error("The CSV file has an unexpected quote in an unquoted field.");
        quoted = true;
      } else if (character === ",") {
        row.push(field);
        field = "";
      } else if (character === "\r" || character === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        if (character === "\r" && input[index + 1] === "\n") index += 1;
      } else {
        field += character;
      }
    }

    if (quoted) throw new Error("The CSV file has an unfinished quoted field.");
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  };
  const write = (items) => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); return true; }
    catch { return false; }
  };
  let subjects = read();
  let editingIndex = null;

  function renderDashboard() {
  const list = $("subject-list");
    if (!list) return;
    const count = $("subject-count");
    const attendance = $("attendance-average");
    const grades = $("grade-count");
    if (count) count.textContent = String(subjects.length);
    const exportButton = $("export-subjects");
    if (exportButton) exportButton.hidden = subjects.length === 0;
    const attended = subjects.reduce((sum,s) => sum + s.attended, 0);
    const total = subjects.reduce((sum,s) => sum + s.total, 0);
    if (attendance) attendance.textContent = total ? Math.round(attended / total * 100) + "%" : "—";
    if (grades) grades.textContent = String(subjects.filter(s => s.grade).length);
    const searchInput = $("subject-search");
    const query = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
    const visibleSubjects = subjects
      .map((subject, index) => ({ subject, index }))
      .filter(({ subject }) => !query || subject.name.toLocaleLowerCase().includes(query));
    list.innerHTML = visibleSubjects.length ? visibleSubjects.map(({ subject: s, index: i }) => {
      const pct = s.total > 0 ? Math.round(s.attended / s.total * 100) : null;
      return '<article class="subject-row"><div class="subject-details"><div class="subject-name">'+escapeHtml(s.name)+'</div><div class="subject-meta">'+escapeHtml(s.semester)+' · '+(s.grade ? "Grade: "+escapeHtml(s.grade)+" · " : "")+(pct === null ? "Attendance not added" : escapeHtml(s.attended)+"/"+escapeHtml(s.total)+" classes")+'</div></div><div class="subject-actions" style="display:flex;align-items:center;gap:8px"><span class="attendance">'+(pct === null ? "—" : pct+"%")+'</span><button class="btn secondary" type="button" data-edit="'+i+'" aria-label="Edit '+escapeHtml(s.name)+'" style="padding:7px 9px;font-size:12px">Edit</button><button class="btn secondary" type="button" data-remove="'+i+'" aria-label="Remove '+escapeHtml(s.name)+'" style="padding:7px 9px;font-size:12px">Remove</button></div></article>';
    }).join("") : query
      ? '<div class="empty-state">No subjects match your search.</div>'
      : '<div class="empty-state">No subjects yet. Add your first subject using the form.</div>';
  }

  function renderSemesters() {
    const summary = $("semester-summary");
    if (!summary) return;
    if (!subjects.length) {
      summary.innerHTML = '<div class="empty-state">No records yet. Add subjects from the dashboard.</div>';
      return;
    }
    const groups = subjects.reduce((acc, subject) => {
      const key = subject.semester || "Current semester";
      (acc[key] ||= []).push(subject);
      return acc;
    }, {});
    const keys = Object.keys(groups).sort((a,b) => a === "Current semester" ? -1 : b === "Current semester" ? 1 : a.localeCompare(b, undefined, {numeric:true}));
    summary.innerHTML = keys.map(key => {
      const items = groups[key];
      const attended = items.reduce((sum,s) => sum + s.attended, 0);
      const total = items.reduce((sum,s) => sum + s.total, 0);
      return '<section class="panel semester-group"><div class="semester-card"><div><h3>'+escapeHtml(key)+'</h3><p>'+items.length+' subject'+(items.length===1?"":"s")+' · '+(total ? Math.round(attended/total*100)+"% attendance" : "Attendance not added")+'</p></div><a class="btn secondary" href="dashboard.html">Manage →</a></div><div class="subject-list">'+items.map(s => '<div class="subject-row"><div><div class="subject-name">'+escapeHtml(s.name)+'</div><div class="subject-meta">'+(s.grade ? "Grade: "+escapeHtml(s.grade) : "Grade not recorded")+'</div></div><span class="attendance">'+(s.total ? Math.round(s.attended/s.total*100)+"%" : "—")+'</span></div>').join("")+'</div></section>';
    }).join("");
  }

  const form = $("subject-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const attendedRaw = String(data.get("attended") ?? "");
      const totalRaw = String(data.get("total") ?? "");
      const attended = Number(attendedRaw), total = Number(totalRaw);
      const message = $("form-message");
      const fail = (text) => { if (message) message.textContent = text; };
      if (!name) return fail("Enter a subject name.");
      if (!Number.isSafeInteger(attended) || !Number.isSafeInteger(total) || attended < 0 || total < 0) return fail("Enter valid whole numbers for class counts.");
      if (attended > total) return fail("Classes attended cannot be greater than total classes.");
      const entry = normalise({name, attended, total, grade:data.get("grade"), semester:data.get("semester")});
      const duplicateIndex = subjects.findIndex((subject, index) => index !== editingIndex && subject.name.toLocaleLowerCase() === entry.name.toLocaleLowerCase() && subject.semester === entry.semester);
      if (duplicateIndex !== -1) return fail("That subject already exists in this semester.");
      const next = subjects.slice();
      if (editingIndex === null) next.push(entry);
      else next[editingIndex] = entry;
      if (!write(next)) return fail("Your browser could not save this. Check that site storage is enabled.");
      subjects = next;
      const wasEditing = editingIndex !== null;
      editingIndex = null;
      form.reset();
      const attendedInput = $("attended");
      const totalInput = $("total");
      if (attendedInput) attendedInput.value = "0";
      if (totalInput) totalInput.value = "0";
      const submit = $("submit-subject");
      const cancel = $("cancel-edit");
      if (submit) submit.textContent = "Add subject";
      if (cancel) cancel.hidden = true;
      fail(wasEditing ? "Subject updated." : "Subject saved.");
      renderDashboard();
      renderSemesters();
    });
  }

  const searchInput = $("subject-search");
  if (searchInput) searchInput.addEventListener("input", renderDashboard);

  const exportButton = $("export-subjects");
  if (exportButton) exportButton.addEventListener("click", () => {
    if (!subjects.length) return;
    const csvCell = (value) => {
      let text = String(value ?? "");
      if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = [
      ["Subject", "Semester", "Classes attended", "Total classes", "Attendance", "Grade"],
      ...subjects.map((subject) => [
        subject.name,
        subject.semester,
        subject.attended,
        subject.total,
        subject.total ? Math.round(subject.attended / subject.total * 100) + "%" : "",
        subject.grade,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const download = document.createElement("a");
    download.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    download.download = "daigaku-subjects.csv";
    download.hidden = true;
    document.body.appendChild(download);
    download.click();
    download.remove();
  });

  const importInput = $("import-file");
  const importButton = $("import-subjects");
  if (importButton && importInput) {
    importButton.addEventListener("click", () => importInput.click());
  }
  if (importInput) {
    importInput.addEventListener("change", async (event) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;
      const message = $("form-message");
      const fail = (text) => { if (message) message.textContent = text; };
      if (Number(file.size) > 1_000_000) {
        fail("CSV backups must be 1 MB or smaller.");
        input.value = "";
        return;
      }

      try {
        const rows = parseCsv(await file.text());
        const header = rows.shift();
        const expectedHeader = ["Subject", "Semester", "Classes attended", "Total classes", "Attendance", "Grade"];
        if (!header || expectedHeader.some((value, index) => header[index] !== value) || header.length !== expectedHeader.length) {
          throw new Error("This is not a Daigaku subject backup CSV.");
        }
        if (rows.length > 5_000) {
          throw new Error("A CSV backup can contain at most 5,000 subject rows.");
        }

        const existing = new Set(subjects.map((subject) => subject.name.toLocaleLowerCase() + "|" + subject.semester));
        const next = subjects.slice();
        let imported = 0;
        let skipped = 0;
        const allowedGrades = new Set(["", "O", "A+", "A", "B+", "B", "C", "F"]);

        for (const row of rows) {
          if (row.length === 1 && !row[0].trim()) continue;
          if (row.length !== expectedHeader.length) {
            skipped += 1;
            continue;
          }

          const [rawName, rawSemester, rawAttended, rawTotal, , rawGrade] = row;
          const name = String(rawName ?? "").trim();
          const semester = String(rawSemester ?? "").trim();
          const attended = Number(rawAttended);
          const total = Number(rawTotal);
          const grade = String(rawGrade ?? "").trim();
          const validSemester = semester === "Current semester" || /^Semester [1-8]$/.test(semester);
          const validCounts = /^\d+$/.test(rawAttended)
            && /^\d+$/.test(rawTotal)
            && Number.isSafeInteger(attended)
            && Number.isSafeInteger(total)
            && attended <= total;

          const validName = Boolean(name) && name.length <= 70 && !/[\u0000-\u001F\u007F]/.test(name);
          if (!validName || !validSemester || !validCounts || !allowedGrades.has(grade)) {
            skipped += 1;
            continue;
          }

          const duplicateKey = name.toLocaleLowerCase() + "|" + semester;
          if (existing.has(duplicateKey)) {
            skipped += 1;
            continue;
          }
          existing.add(duplicateKey);
          next.push(normalise({ name, semester, attended, total, grade }));
          imported += 1;
        }

        if (imported === 0) {
          fail("No new valid subjects found. Check the CSV rows and existing duplicates.");
          return;
        }
        if (!write(next)) {
          fail("Your browser could not save the imported records. Check that site storage is enabled.");
          return;
        }

        subjects = next;
        renderDashboard();
        renderSemesters();
        fail("Imported " + imported + " subject" + (imported === 1 ? "" : "s")
          + (skipped ? "; skipped " + skipped + " invalid or duplicate row" + (skipped === 1 ? "" : "s") + "." : "."));
      } catch (error) {
        fail(error instanceof Error ? error.message : "Could not read that CSV file.");
      } finally {
        input.value = "";
      }
    });
  }

  const list = $("subject-list");
  if (list) list.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit]");
    if (editButton) {
      const index = Number(editButton.dataset.edit);
      if (!Number.isInteger(index) || index < 0 || index >= subjects.length || !form) return;
      const subject = subjects[index];
      editingIndex = index;
      $("subject-name").value = subject.name;
      $("attended").value = String(subject.attended);
      $("total").value = String(subject.total);
      $("grade").value = subject.grade;
      $("semester").value = subject.semester;
      const submit = $("submit-subject");
      const cancel = $("cancel-edit");
      if (submit) submit.textContent = "Save changes";
      if (cancel) cancel.hidden = false;
      const message = $("form-message");
      if (message) message.textContent = "Update the details, then save your changes.";
      $("subject-name").focus();
      return;
    }
    const button = event.target.closest("[data-remove]");
    if (!button) return;
    const index = Number(button.dataset.remove);
    if (!Number.isInteger(index) || index < 0 || index >= subjects.length) return;
    if (!window.confirm(`Remove ${subjects[index].name} from your subjects?`)) return;
    const next = subjects.filter((_,i) => i !== index);
    if (!write(next)) {
      const message = $("form-message");
      if (message) message.textContent = "Could not update browser storage. Try again.";
      return;
    }
    subjects = next;
    if (editingIndex !== null) {
      editingIndex = null;
      if (form) form.reset();
      const submit = $("submit-subject");
      const cancel = $("cancel-edit");
      if (submit) submit.textContent = "Add subject";
      if (cancel) cancel.hidden = true;
    }
    renderDashboard();
    renderSemesters();
  });
  const cancelEdit = $("cancel-edit");
  if (cancelEdit) cancelEdit.addEventListener("click", () => {
    editingIndex = null;
    if (form) form.reset();
    const attendedInput = $("attended"), totalInput = $("total"), submit = $("submit-subject");
    if (attendedInput) attendedInput.value = "0";
    if (totalInput) totalInput.value = "0";
    if (submit) submit.textContent = "Add subject";
    cancelEdit.hidden = true;
    const message = $("form-message");
    if (message) message.textContent = "Editing cancelled.";
  });
  renderDashboard();
  renderSemesters();
})();