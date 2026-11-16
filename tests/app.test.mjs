import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");

function setup(initialSubjects = [], confirmResult = true) {
  const elements = new Map();
  const downloads = [];
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id, value: "", textContent: "", innerHTML: "", hidden: false,
        listeners: {}, dataset: {},
        addEventListener(type, handler) { this.listeners[type] = handler; },
        reset() {
          for (const key of ["subject-name", "grade"]) if (elements.has(key)) elements.get(key).value = "";
          if (elements.has("attended")) elements.get("attended").value = "0";
          if (elements.has("total")) elements.get("total").value = "0";
          if (elements.has("semester")) elements.get("semester").value = "Current semester";
        },
        focus() {},
      });
    }
    return elements.get(id);
  };

  for (const id of ["subject-list", "subject-count", "attendance-average", "grade-count", "subject-form", "form-message", "subject-name", "attended", "total", "grade", "semester", "submit-subject", "cancel-edit", "semester-summary", "export-subjects"]) element(id);
  element("submit-subject").textContent = "Add subject";
  const store = new Map([["daigaku.subjects.v1", JSON.stringify(initialSubjects)]]);
  class FormDataMock {
    constructor() {}
    get(name) {
      const id = name === "name" ? "subject-name" : name;
      return element(id).value;
    }
  }
  const context = {
    document: { getElementById: element, createElement() { return { click() { downloads.push(this); }, remove() {} }; }, body: { appendChild() {} } },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, value); },
    },
    FormData: FormDataMock,
    window: { confirm() { return confirmResult; } },
  };
  vm.runInNewContext(appSource, context);
  return { element, store, downloads };
}

test("semester page has one live records container", () => {
  const page = readFileSync(new URL("../semesters.html", import.meta.url), "utf8");
  assert.equal((page.match(/id="semester-summary"/g) || []).length, 1);
  assert.match(page, /Manage subjects/);
});

test("loads old records and calculates weighted attendance", () => {
  const { element } = setup([
    { name: "C++", attended: 8, total: 10, grade: "A" },
    { name: "DSA", attended: 2, total: 5, grade: "" },
  ]);
  assert.equal(element("subject-count").textContent, "2");
  assert.equal(element("attendance-average").textContent, "67%");
  assert.match(element("semester-summary").innerHTML, /Current semester/);
});

test("normalises corrupted stored values before rendering", () => {
  const { element } = setup([
    { name: "  C++  ", attended: 14, total: 10, grade: "unexpected", semester: "Semester 99" },
    { name: "Broken counts", attended: "Infinity", total: "NaN", grade: "A", semester: "Semester 2" },
  ]);
  assert.equal(element("attendance-average").textContent, "100%");
  assert.match(element("subject-list").innerHTML, /C\+\+/);
  assert.match(element("subject-list").innerHTML, /Current semester/);
  assert.doesNotMatch(element("subject-list").innerHTML, /Semester 99|14\/10/);
});

test("edits attendance and semester without creating a duplicate", () => {
  const { element, store } = setup([{ name: "C++", attended: 8, total: 10, grade: "A" }]);
  const list = element("subject-list");
  list.listeners.click({
    target: { closest(selector) { return selector === "[data-edit]" ? { dataset: { edit: "0" } } : null; } },
  });
  assert.equal(element("submit-subject").textContent, "Save changes");
  element("attended").value = "9";
  element("total").value = "10";
  element("grade").value = "A+";
  element("semester").value = "Semester 5";
  element("subject-form").listeners.submit({ preventDefault() {} });
  const saved = JSON.parse(store.get("daigaku.subjects.v1"));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].attended, 9);
  assert.equal(saved[0].grade, "A+");
  assert.equal(saved[0].semester, "Semester 5");
  assert.equal(element("attendance-average").textContent, "90%");
  assert.match(element("semester-summary").innerHTML, /Semester 5/);
  assert.equal(element("submit-subject").textContent, "Add subject");
});

test("rejects attended classes greater than total", () => {
  const { element, store } = setup([]);
  element("subject-name").value = "Algorithms";
  element("attended").value = "6";
  element("total").value = "5";
  element("subject-form").listeners.submit({ preventDefault() {} });
  assert.match(element("form-message").textContent, /cannot be greater/);
  assert.equal(JSON.parse(store.get("daigaku.subjects.v1")).length, 0);
});


test("rejects class counts outside the safe integer range", () => {
  const { element, store } = setup([]);
  element("subject-name").value = "Oversized record";
  element("attended").value = "9007199254740992";
  element("total").value = "9007199254740992";
  element("subject-form").listeners.submit({ preventDefault() {} });
  assert.match(element("form-message").textContent, /valid whole numbers/);
  assert.equal(JSON.parse(store.get("daigaku.subjects.v1")).length, 0);
});

test("asks before removing a subject and preserves it when cancelled", () => {
  const { element, store } = setup([{ name: "C++", attended: 8, total: 10 }], false);
  element("subject-list").listeners.click({
    target: { closest(selector) { return selector === "[data-remove]" ? { dataset: { remove: "0" } } : null; } },
  });
  assert.equal(JSON.parse(store.get("daigaku.subjects.v1")).length, 1);
  assert.equal(element("subject-count").textContent, "1");
});

test("removes a subject after confirmation", () => {
  const { element, store } = setup([{ name: "C++", attended: 8, total: 10 }], true);
  element("subject-list").listeners.click({
    target: { closest(selector) { return selector === "[data-remove]" ? { dataset: { remove: "0" } } : null; } },
  });
  assert.equal(JSON.parse(store.get("daigaku.subjects.v1")).length, 0);
  assert.equal(element("subject-count").textContent, "0");
});


test("exports subject records as CSV and neutralises spreadsheet formulas", () => {
  const { element, downloads } = setup([
    { name: 'Software Engineering', attended: 8, total: 10, grade: 'A', semester: 'Semester 5' },
    { name: '=HYPERLINK("https://example.com")', attended: 1, total: 2, grade: '', semester: 'Semester 5' },
  ]);
  assert.equal(element("export-subjects").hidden, false);
  element("export-subjects").listeners.click();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].download, "daigaku-subjects.csv");
  const csv = decodeURIComponent(downloads[0].href.split(",").slice(1).join(",")).replace(/^\\uFEFF/, "");
  assert.match(csv, /"Software Engineering","Semester 5","8","10","80%","A"/);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.com""\)"/);
  assert.match(csv, /"Subject","Semester"/);
});


test("prevents duplicate subject names within the same semester", () => {
  const { element, store } = setup([{ name: "Software Engineering", attended: 0, total: 0, semester: "Semester 5" }]);
  element("subject-name").value = "software engineering";
  element("attended").value = "0";
  element("total").value = "0";
  element("semester").value = "Semester 5";
  element("subject-form").listeners.submit({ preventDefault() {} });
  assert.match(element("form-message").textContent, /already exists in this semester/);
  assert.equal(JSON.parse(store.get("daigaku.subjects.v1")).length, 1);
});


test("allows the same subject name in a different semester", () => {
  const { element, store } = setup([{ name: "Mathematics", attended: 8, total: 10, semester: "Semester 4" }]);
  element("subject-name").value = "Mathematics";
  element("attended").value = "0";
  element("total").value = "0";
  element("semester").value = "Semester 5";
  element("subject-form").listeners.submit({ preventDefault() {} });
  assert.equal(JSON.parse(store.get("daigaku.subjects.v1")).length, 2);
  assert.equal(element("subject-count").textContent, "2");
});
