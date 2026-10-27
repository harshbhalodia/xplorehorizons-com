const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const source = fs.readFileSync(path.join(__dirname, "..", "google-apps-script", "Code.gs"), "utf8");

function createBackend() {
  const properties = new Map();
  const spreadsheets = new Map();
  const forms = new Map();
  const logs = [];
  const state = { failBeforeSubmit: false, failConfirmation: false, busy: false, submits: 0 };
  let nextItem = 1;

  function sheet(name) {
    const rows = [];
    return {
      rows,
      name,
      getName() { return this.name; },
      setName(value) { this.name = value; return this; },
      appendRow(value) { rows.push(value); return this; },
      setFrozenRows() {},
      getLastRow() { return rows.length; },
      getRange(row, column, height = 1, width = 1) {
        return {
          getRow: () => row,
          getValues: () => Array.from({ length: height }, (_, index) =>
            Array.from({ length: width }, (_, offset) => rows[row - 1 + index]?.[column - 1 + offset] ?? "")
          ),
          setValues(values) {
            if (column === 3 && state.failConfirmation) {
              state.failConfirmation = false;
              throw new Error("A write failed for private@example.com");
            }
            values.forEach((valuesRow, index) => {
              rows[row - 1 + index] ||= [];
              valuesRow.forEach((value, offset) => { rows[row - 1 + index][column - 1 + offset] = value; });
            });
          },
          createTextFinder(value) {
            return {
              matchEntireCell() { return this; },
              findNext() {
                const index = rows.findIndex((entry, index) => index >= row - 1 && entry[column - 1] === value);
                return index === -1 ? null : { getRow: () => index + 1 };
              },
            };
          },
        };
      },
    };
  }
  function form(id) {
    const items = [];
    const responses = [];
    const result = {
      id, items, responses,
      getItems: () => items.slice(),
      getItemById: (id) => items.find((item) => item.getId() === id),
      getResponses: (since) => responses.filter((response) => !since || response.date >= since),
      getEditUrl: () => `https://docs.google.com/forms/d/${id}/edit`,
      getDestinationId() { return this.destination; },
      setDestination(type, id) { this.destination = id; },
      setTitle(value) { this.title = value; },
      setDescription(value) { this.description = value; },
      setCollectEmail() {},
      setLimitOneResponsePerUser() {},
      setPublishingSummary(value) { assert.equal(value, false); },
      setAllowResponseEdits() {},
      setConfirmationMessage() {},
      supportsAdvancedResponderPermissions: () => true,
      setPublished() {},
      setAcceptingResponses() {},
      deleteItem(item) { items.splice(items.indexOf(item), 1); },
      createResponse() {
        const submittedItems = [];
        return {
          withItemResponse(response) { submittedItems.push(response); return this; },
          submit() {
            state.submits += 1;
            if (state.failBeforeSubmit) throw new Error("Submission unavailable");
            const responseId = "record-" + responses.length;
            const response = { getId: () => responseId, getItemResponses: () => submittedItems, date: new Date() };
            responses.push(response);
            return response;
          },
        };
      },
    };
    function addItem(type) {
      const id = nextItem++;
      const item = {
        title: "", type,
        getId: () => id,
        getTitle() { return this.title; },
        getType: () => type,
        setTitle(value) { this.title = value; return this; },
        setRequired(value) { this.required = value; return this; },
        setChoiceValues(value) { this.options = value; return this; },
        asTextItem() { return this; },
        asParagraphTextItem() { return this; },
        asMultipleChoiceItem() { return this; },
        asCheckboxItem() { return this; },
        createResponse(value) { return { getItem: () => item, getResponse: () => value }; },
      };
      items.push(item);
      return item;
    }
    result.addTextItem = () => addItem("TEXT");
    result.addParagraphTextItem = () => addItem("PARAGRAPH_TEXT");
    result.addMultipleChoiceItem = () => addItem("MULTIPLE_CHOICE");
    result.addCheckboxItem = () => addItem("CHECKBOX");
    return result;
  }
  const context = vm.createContext({
    console: { log: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) || null,
        setProperty: (key, value) => properties.set(key, value),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => !state.busy, hasLock: () => !state.busy, releaseLock() {} }) },
    FormApp: {
      openById(id) { if (!forms.has(id)) forms.set(id, form(id)); return forms.get(id); },
      ItemType: { TEXT: "TEXT", PARAGRAPH_TEXT: "PARAGRAPH_TEXT", MULTIPLE_CHOICE: "MULTIPLE_CHOICE", CHECKBOX: "CHECKBOX" },
      DestinationType: { SPREADSHEET: "SPREADSHEET" },
    },
    SpreadsheetApp: {
      create(title) {
        const id = "sheet-" + spreadsheets.size;
        const sheets = [sheet("Sheet1")];
        const spreadsheet = {
          title,
          getId: () => id,
          getUrl: () => `https://docs.google.com/spreadsheets/d/${id}/edit`,
          getSheets: () => sheets,
          getSheetByName: (name) => sheets.find((entry) => entry.name === name),
          insertSheet(name) { const entry = sheet(name); sheets.push(entry); return entry; },
        };
        spreadsheets.set(id, spreadsheet);
        return spreadsheet;
      },
      openById: (id) => spreadsheets.get(id),
      flush() {},
    },
    ContentService: { MimeType: { JSON: "JSON" }, createTextOutput: (text) => ({ setMimeType: () => text }) },
    Utilities: { DigestAlgorithm: { SHA_256: "SHA_256" }, computeDigest: (_, value) => [...crypto.createHash("sha256").update(value).digest()] },
  });
  vm.runInContext(source + "\nthis.backend = { XH, setupXploreForms, doPost, doGet, validatePayload_, sheetSafe_ };", context);
  const api = context.backend;
  return { api, forms, spreadsheets, logs, state, getForm: context.FormApp.openById };
}

function payload(audience = "partner") {
  const common = {
    audience, requestId: "6df73b4b-e20f-4d04-a9b0-d3b8ee2b7863", website: "",
    consent: true, privacyVersion: "2026-10-27", name: "Example Person", email: "person@example.com",
  };
  return audience === "partner" ? {
    ...common, company: "Example Company", relationship: "As a client", focus: "AI-enabled workflows",
    outcome: "We want to make our repeatable service workflows simpler and more reliable.", timeline: "",
  } : {
    ...common, location: "Canada / Eastern Time", engagement: "Open to either",
    skills: ["Workflow automation", "Solution design"], story: "I helped a team understand and resolve an unreliable automation workflow.", portfolio: "https://example.com",
  };
}

function post(api, data) {
  const encoded = typeof data === "string" ? data : JSON.stringify(data);
  return JSON.parse(api.doPost({ postData: { length: encoded.length }, parameter: { payload: encoded }, parameters: { payload: [encoded] } }));
}

test("setup configures only the two supplied forms, creates separate Sheets, and is idempotent", () => {
  const { api, forms, spreadsheets } = createBackend();
  api.setupXploreForms();
  assert.equal(forms.size, 2);
  assert.equal(spreadsheets.size, 2);
  assert.equal(JSON.parse(api.doGet()).ready, true);
  for (const form of forms.values()) {
    assert.ok(form.title.includes("Xplore Horizons"));
    assert.ok(form.description.includes("12 months"));
    assert.equal(form.items.length, 10);
    assert.ok(spreadsheets.has(form.destination));
  }
  api.setupXploreForms();
  assert.equal(spreadsheets.size, 2);
  assert.equal([...forms.values()][0].items.length, 10);
});

test("setup refuses to overwrite existing questions or responses", () => {
  for (const existing of ["questions", "responses"]) {
    const backend = createBackend();
    const firstId = Object.values(backend.api.XH.forms)[0].id;
    const form = backend.getForm(firstId);
    if (existing === "questions") form.addTextItem().setTitle("An existing question");
    else form.responses.push({ date: new Date() });
    assert.throws(() => backend.api.setupXploreForms(), /Setup stopped/);
    assert.equal(backend.spreadsheets.size, 0);
  }
});

test("rerunning setup refuses an unexpected response destination", () => {
  const { api, forms, spreadsheets } = createBackend();
  api.setupXploreForms();
  const form = forms.get(Object.values(api.XH.forms)[0].id);
  form.destination = "unexpected-sheet";
  assert.throws(() => api.setupXploreForms(), /destination changed/);
  assert.equal(spreadsheets.size, 2);
});

test("server validates both field schemas and rejects malformed, excessive, or unexpected values", () => {
  const { api } = createBackend();
  assert.equal(api.validatePayload_(payload()).audience, "partner");
  assert.equal(api.validatePayload_(payload("workforce")).skills.length, 2);
  const bad = [
    null, [], { ...payload(), audience: ["partner"] }, { ...payload(), audience: "__proto__" },
    { ...payload(), requestId: "invalid" }, { ...payload(), consent: false },
    { ...payload(), website: "spam" }, { ...payload(), privacyVersion: "old" },
    { ...payload(), email: "a@invalid" }, { ...payload(), outcome: "short" },
    { ...payload(), outcome: " ".repeat(31) }, { ...payload(), outcome: "a".repeat(3001) },
    { ...payload(), focus: "Unknown" }, { ...payload(), extra: "not allowed" },
    { ...payload(), name: "\u0000injected" }, { ...payload("workforce"), skills: [] },
    { ...payload("workforce"), skills: ["Solution design", "Solution design"] },
    { ...payload("workforce"), portfolio: "javascript:alert(1)" },
  ];
  for (const input of bad) assert.throws(() => api.validatePayload_(input));
  assert.equal(post(api, "{").code, "invalid");
  assert.equal(JSON.parse(api.doPost({ postData: { length: 65537 } })).code, "invalid");
});

test("maximum-length multilingual context fits the URL-encoded transport limit", () => {
  const { api } = createBackend();
  api.setupXploreForms();
  const data = { ...payload(), outcome: "\u754c".repeat(3000) };
  const raw = JSON.stringify(data);
  const bytes = Buffer.byteLength(new URLSearchParams({ payload: raw }).toString());
  assert.ok(bytes > 24000 && bytes < 65536);
  const response = JSON.parse(api.doPost({
    postData: { length: bytes }, parameter: { payload: raw }, parameters: { payload: [raw] },
  }));
  assert.equal(response.ok, true);
});

for (const audience of ["partner", "workforce"]) {
  test(`confirmed ${audience} submission creates one response, and retry never duplicates it`, () => {
    const { api, forms, state } = createBackend();
    api.setupXploreForms();
    const data = payload(audience);
    assert.deepEqual(post(api, data), { ok: true, requestId: data.requestId });
    assert.deepEqual(post(api, data), { ok: true, requestId: data.requestId });
    assert.equal(state.submits, 1);
    const record = forms.get(api.XH.forms[audience].id).responses[0];
    assert.ok(record.getItemResponses().some((entry) => entry.getResponse() === data.requestId));
    assert.equal(post(api, { ...data, name: "Different Person" }).code, "conflict");
    assert.equal(state.submits, 1);
  });
}

test("a lost acknowledgement is reconciled from the existing response, with no duplicate write or PII logging", () => {
  const { api, state, logs } = createBackend();
  api.setupXploreForms();
  state.failConfirmation = true;
  assert.equal(post(api, payload()).code, "unconfirmed");
  assert.equal(post(api, payload()).ok, true);
  assert.equal(state.submits, 1);
  assert.ok(!JSON.stringify(logs).includes("private@example.com"));
});

test("an uncertain pending write never silently succeeds or submits a second response", () => {
  const { api, state } = createBackend();
  api.setupXploreForms();
  state.failBeforeSubmit = true;
  assert.equal(post(api, payload()).code, "unconfirmed");
  state.failBeforeSubmit = false;
  assert.equal(post(api, payload()).code, "pending");
  assert.equal(state.submits, 1);
});

test("unconfigured and busy services return explicit failures without writing", () => {
  const { api, state } = createBackend();
  assert.equal(post(api, payload()).code, "unavailable");
  api.setupXploreForms();
  state.busy = true;
  assert.equal(post(api, payload()).code, "busy");
  assert.equal(state.submits, 0);
});

test("spreadsheet formula prefixes are neutralized without changing ordinary content", () => {
  const { api } = createBackend();
  for (const text of ["=HYPERLINK(\"x\")", "+1+1", "-1+1", "@SUM(1)"]) assert.equal(api.sheetSafe_(text), "'" + text);
  assert.equal(api.sheetSafe_("Normal text"), "Normal text");
});
