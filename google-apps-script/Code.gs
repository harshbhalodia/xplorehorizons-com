/* Paste this file into a standalone Google Apps Script project. Run setupXploreForms once. */
const XH = {
  version: "2026-10-27",
  contact: "harshkumar.bhalodia@gmail.com",
  privacy: "https://xplorehorizons.com/privacy.html",
  ledgerName: "Website delivery",
  forms: {
    partner: {
      id: "1bCjbc7Z2lcjaiRRaXjgUBdAe69IQag_U1k_ZOgdyg5I",
      title: "Partner with Xplore Horizons Inc.",
      sheet: "XH - Partnership enquiries",
      fields: [
        { key: "name", title: "Your name", type: "text", required: true, max: 100 },
        { key: "email", title: "Email address", type: "text", required: true, max: 254 },
        { key: "company", title: "Company or organization", type: "text", required: true, max: 160 },
        { key: "relationship", title: "How would you like to work with us?", type: "choice", required: true, options: ["As a client", "As a delivery partner", "Let's explore"] },
        { key: "focus", title: "Where should we start?", type: "choice", required: true, options: ["Choosing a new tool", "AI-enabled workflows", "A new project or initiative", "AI cost and planning", "An aligned consulting team", "Platform reliability", "Something else"] },
        { key: "outcome", title: "What would meaningful progress look like?", type: "paragraph", required: true, min: 30, max: 3000 },
        { key: "timeline", title: "Your timing", type: "choice", options: ["Exploring possibilities", "Within the next 3 months", "A defined deadline", "Let's discuss"] },
      ],
    },
    workforce: {
      id: "1fzI4Wg4-xm86QiqFd4vFjTIie7PMXLS2LONrnuQR0FE",
      title: "Join the Xplore Horizons Workforce",
      sheet: "XH - Workforce interest",
      fields: [
        { key: "name", title: "Your name", type: "text", required: true, max: 100 },
        { key: "email", title: "Email address", type: "text", required: true, max: 254 },
        { key: "location", title: "Country or region and time zone", type: "text", required: true, max: 120 },
        { key: "engagement", title: "The opportunity you're looking for", type: "choice", required: true, options: ["Employee", "Independent contractor", "Open to either"] },
        { key: "skills", title: "Your primary strengths", type: "checkbox", required: true, options: ["AI and machine learning", "Workflow automation", "Cloud and platforms", "On-premises and hybrid", "Security and observability", "Solution design", "Hands-on troubleshooting", "Project delivery"] },
        { key: "story", title: "A challenge you helped solve", type: "paragraph", required: true, min: 30, max: 3000 },
        { key: "portfolio", title: "LinkedIn, portfolio, or GitHub URL", type: "text", max: 500 },
      ],
    },
  },
};

const XH_META = [
  { key: "consent", title: "Permission to respond", type: "text", required: true },
  { key: "privacyVersion", title: "Privacy notice version", type: "text", required: true },
  { key: "requestId", title: "Website reference", type: "text", required: true },
];

function settingsKey_(audience) {
  return "XH_FORM_V1_" + audience;
}

function readSettings_(audience) {
  const value = PropertiesService.getScriptProperties().getProperty(settingsKey_(audience));
  return value ? JSON.parse(value) : null;
}

function saveSettings_(audience, settings) {
  PropertiesService.getScriptProperties().setProperty(settingsKey_(audience), JSON.stringify(settings));
}

function setupXploreForms() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    Object.keys(XH.forms).forEach(function (audience) {
      const definition = XH.forms[audience];
      const form = FormApp.openById(definition.id);
      const definitions = definition.fields.concat(XH_META);
      let settings = readSettings_(audience);
      if (settings && settings.ready) {
        if (form.getDestinationId() !== settings.sheetId) {
          throw new Error("The response destination changed for " + audience + ". Review it before continuing.");
        }
        console.log(audience + " already configured: " + SpreadsheetApp.openById(settings.sheetId).getUrl());
        return;
      }
      if (form.getResponses().length) {
        throw new Error("Setup stopped: " + audience + " has responses. Existing responses will not be overwritten.");
      }
      const items = form.getItems();
      const untouchedDefault = items.length === 1 && ["", "Untitled Question"].indexOf(items[0].getTitle()) !== -1;
      const knownTitles = definitions.map(function (field) { return field.title; });
      if (!untouchedDefault && items.some(function (item) { return knownTitles.indexOf(item.getTitle()) === -1; })) {
        throw new Error("Setup stopped: " + audience + " contains existing questions. Use an empty form or review it first.");
      }
      if (untouchedDefault) form.deleteItem(items[0]);
      if (!settings) {
        const spreadsheet = SpreadsheetApp.create(definition.sheet);
        settings = { formId: definition.id, sheetId: spreadsheet.getId(), items: {}, ready: false };
        saveSettings_(audience, settings);
        const ledger = spreadsheet.getSheets()[0];
        ledger.setName(XH.ledgerName);
        ledger.appendRow(["Request ID", "Payload hash", "Status", "Response ID", "Updated at"]);
        ledger.setFrozenRows(1);
      }
      const spreadsheet = SpreadsheetApp.openById(settings.sheetId);
      if (!spreadsheet.getSheetByName(XH.ledgerName)) {
        const ledger = spreadsheet.insertSheet(XH.ledgerName);
        ledger.appendRow(["Request ID", "Payload hash", "Status", "Response ID", "Updated at"]);
        ledger.setFrozenRows(1);
      }
      definitions.forEach(function (field) {
        const matches = form.getItems().filter(function (item) { return item.getTitle() === field.title; });
        if (matches.length > 1) throw new Error("Duplicate question: " + field.title);
        let item = matches[0];
        const expectedType = {
          text: FormApp.ItemType.TEXT,
          paragraph: FormApp.ItemType.PARAGRAPH_TEXT,
          choice: FormApp.ItemType.MULTIPLE_CHOICE,
          checkbox: FormApp.ItemType.CHECKBOX,
        }[field.type];
        if (item && item.getType() !== expectedType) throw new Error("Question type changed: " + field.title);
        if (!item) {
          if (field.type === "paragraph") item = form.addParagraphTextItem();
          else if (field.type === "choice") item = form.addMultipleChoiceItem();
          else if (field.type === "checkbox") item = form.addCheckboxItem();
          else item = form.addTextItem();
        }
        const typed = typedItem_(form.getItemById(item.getId()), field.type);
        typed.setTitle(field.title).setRequired(Boolean(field.required));
        if (field.options) typed.setChoiceValues(field.options);
        settings.items[field.key] = item.getId();
        saveSettings_(audience, settings);
      });
      form.setTitle(definition.title);
      form.setDescription(
        "A conversation with Xplore Horizons Inc. Share only information needed for your enquiry, never credentials or confidential client material. " +
        "Used to respond to enquiries and discuss relevant partnerships or work opportunities. " +
        "Initial enquiries are retained for 12 months after the last enquiry interaction, unless a separate relationship or legal obligation requires otherwise. " +
        "Privacy: " + XH.privacy + " | Contact: " + XH.contact
      );
      form.setCollectEmail(false);
      form.setLimitOneResponsePerUser(false);
      form.setPublishingSummary(false);
      form.setAllowResponseEdits(false);
      form.setConfirmationMessage("Thank you. Your enquiry has been recorded. We will review it and contact you when we have a relevant next step.");
      form.setDestination(FormApp.DestinationType.SPREADSHEET, settings.sheetId);
      if (form.supportsAdvancedResponderPermissions()) form.setPublished(true);
      form.setAcceptingResponses(true);
      settings.ready = true;
      saveSettings_(audience, settings);
      console.log(audience + " form: " + form.getEditUrl());
      console.log(audience + " private spreadsheet: " + spreadsheet.getUrl());
    });
    console.log("Setup complete. Review access on BOTH Forms and Sheets, then deploy this project as a web app: Execute as Me, access Anyone.");
  } finally {
    lock.releaseLock();
  }
}

function typedItem_(item, type) {
  if (type === "paragraph") return item.asParagraphTextItem();
  if (type === "choice") return item.asMultipleChoiceItem();
  if (type === "checkbox") return item.asCheckboxItem();
  return item.asTextItem();
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const ready = Object.keys(XH.forms).every(function (audience) {
    const settings = readSettings_(audience);
    return Boolean(settings && settings.ready);
  });
  return json_({ service: "xh-enquiries", version: XH.version, ready: ready });
}

class InputError_ extends Error {
  constructor(code, field) {
    super(code);
    this.name = "InputError";
    this.code = code;
    this.field = field || "";
  }
}

function validatePayload_(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError_("invalid");
  if (typeof input.audience !== "string" || !Object.prototype.hasOwnProperty.call(XH.forms, input.audience)) throw new InputError_("invalid", "audience");
  if (typeof input.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId)) {
    throw new InputError_("invalid", "requestId");
  }
  if (input.website !== "") throw new InputError_("rejected");
  if (input.consent !== true) throw new InputError_("invalid", "consent");
  if (input.privacyVersion !== XH.version) throw new InputError_("refresh");
  const definitions = XH.forms[input.audience].fields;
  const allowed = ["audience", "requestId", "website", "consent", "privacyVersion"].concat(definitions.map(function (field) { return field.key; }));
  if (Object.keys(input).some(function (key) { return allowed.indexOf(key) === -1; })) throw new InputError_("invalid");
  const result = {
    audience: input.audience,
    requestId: input.requestId.toLowerCase(),
    consent: true,
    privacyVersion: XH.version,
  };
  definitions.forEach(function (field) {
    const value = input[field.key];
    if (field.type === "checkbox") {
      if (!Array.isArray(value) || value.length < 1 || value.length > field.options.length ||
          new Set(value).size !== value.length || value.some(function (entry) { return field.options.indexOf(entry) === -1; })) {
        throw new InputError_("invalid", field.key);
      }
      result[field.key] = value.slice().sort();
      return;
    }
    if (typeof value !== "string") throw new InputError_("invalid", field.key);
    const text = value.trim();
    if ((field.required && !text) || text.length > (field.max || 160) ||
        (text && text.length < (field.min || 1)) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
      throw new InputError_("invalid", field.key);
    }
    if (field.options && text && field.options.indexOf(text) === -1) throw new InputError_("invalid", field.key);
    result[field.key] = text;
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new InputError_("invalid", "email");
  if (result.portfolio && !/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(result.portfolio)) throw new InputError_("invalid", "portfolio");
  return result;
}

function fingerprint_(payload) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(payload))
    .map(function (byte) { return ("0" + (byte & 255).toString(16)).slice(-2); }).join("");
}

function sheetSafe_(value) {
  return typeof value === "string" && /^[=+\-@]/.test(value) ? "'" + value : value;
}

function accepted_(requestId) {
  return { ok: true, requestId: requestId };
}

function saveSubmission_(payload) {
  const settings = readSettings_(payload.audience);
  if (!settings || !settings.ready) return { ok: false, code: "unavailable" };
  const form = FormApp.openById(settings.formId);
  if (form.getDestinationId() !== settings.sheetId) throw new Error("Response destination mismatch");
  const ledger = SpreadsheetApp.openById(settings.sheetId).getSheetByName(XH.ledgerName);
  if (!ledger) throw new Error("Delivery ledger missing");
  const hash = fingerprint_(payload);
  const match = ledger.getLastRow() > 1
    ? ledger.getRange(2, 1, ledger.getLastRow() - 1, 1).createTextFinder(payload.requestId).matchEntireCell(true).findNext()
    : null;
  let row;
  if (match) {
    row = match.getRow();
    const record = ledger.getRange(row, 1, 1, 5).getValues()[0];
    if (record[1] !== hash) return { ok: false, code: "conflict" };
    if (record[2] === "confirmed") return accepted_(payload.requestId);
    // A previous run may have stopped after Google's write, but before our acknowledgement.
    const existing = form.getResponses(new Date(new Date(record[4]).getTime() - 60000)).find(function (response) {
      return response.getItemResponses().some(function (itemResponse) {
        return itemResponse.getItem().getId() === settings.items.requestId && itemResponse.getResponse() === payload.requestId;
      });
    });
    if (!existing) return { ok: false, code: "pending" };
    ledger.getRange(row, 3, 1, 3).setValues([["confirmed", existing.getId(), new Date()]]);
    SpreadsheetApp.flush();
    return accepted_(payload.requestId);
  }
  row = ledger.getLastRow() + 1;
  ledger.getRange(row, 1, 1, 5).setValues([[payload.requestId, hash, "pending", "", new Date()]]);
  SpreadsheetApp.flush();
  const response = form.createResponse();
  XH.forms[payload.audience].fields.concat(XH_META).forEach(function (field) {
    let value = payload[field.key];
    if (field.key === "consent") value = "I agree that Xplore Horizons Inc. may use these details to respond to this enquiry, as described in the privacy notice.";
    if (value === "") return;
    const item = form.getItemById(settings.items[field.key]);
    if (!item) throw new Error("Mapped question missing");
    response.withItemResponse(typedItem_(item, field.type).createResponse(sheetSafe_(value)));
  });
  const submitted = response.submit();
  if (!submitted.getId()) throw new Error("Google did not confirm the response");
  ledger.getRange(row, 3, 1, 3).setValues([["confirmed", submitted.getId(), new Date()]]);
  SpreadsheetApp.flush();
  return accepted_(payload.requestId);
}

function doPost(event) {
  let requestId = "";
  let lock;
  try {
    if (!event || !event.postData || event.postData.length > 65536 ||
        !event.parameter || !event.parameters || !event.parameters.payload || event.parameters.payload.length !== 1 ||
        typeof event.parameter.payload !== "string") {
      throw new InputError_("invalid");
    }
    let input;
    try {
      input = JSON.parse(event.parameter.payload);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new InputError_("invalid");
    }
    const payload = validatePayload_(input);
    requestId = payload.requestId;
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ ok: false, code: "busy" });
    return json_(saveSubmission_(payload));
  } catch (error) {
    if (error instanceof InputError_) {
      console.warn("XH enquiry rejected: " + error.code + (error.field ? " / " + error.field : ""));
      return json_({ ok: false, code: error.code, field: error.field });
    }
    // Never log form answers, emails, or exception messages that may contain them.
    console.error("XH delivery failure. Reference: " + requestId + ". Error type: " + error.name);
    return json_({ ok: false, code: "unconfirmed" });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
