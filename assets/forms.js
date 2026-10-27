"use strict";

(() => {
  const dialog = document.querySelector("#form-dialog");
  if (!dialog) return;
  const config = window.XH_CONFIG;
  const forms = [...dialog.querySelectorAll("[data-enquiry]")];
  const states = new Map();
  let endpoint = "";
  let trigger;

  if (config && config.enquiryEndpoint) {
    try {
      const url = new URL(config.enquiryEndpoint);
      if (url.protocol !== "https:" || url.hostname !== "script.google.com" ||
          !/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url.pathname) ||
          url.username || url.password || url.port || url.search || url.hash ||
          !/^\d{4}-\d{2}-\d{2}$/.test(config.enquiryPrivacyVersion)) {
        throw new Error("Expected a deployed Apps Script /exec URL and a privacy notice version.");
      }
      endpoint = url.href;
    } catch (error) {
      console.error("Xplore Horizons: enquiry endpoint configuration is invalid.", error);
    }
  } else if (!config) {
    console.error("Xplore Horizons: enquiry configuration did not load.");
  }
  const available = Boolean(endpoint && typeof crypto.randomUUID === "function");
  dialog.querySelector(".form-unavailable").hidden = available;

  const emit = (name, audience) => {
    document.dispatchEvent(new CustomEvent("xh:form-event", { detail: { name, audience } }));
  };
  const focusStatus = (form) => {
    if (dialog.open && !form.hidden) form.querySelector(".form-status").focus();
  };
  const setStatus = (form, message, error = false) => {
    const status = form.querySelector(".form-status");
    status.classList.toggle("is-error", error);
    status.textContent = message;
  };

  forms.forEach((form) => {
    const audience = form.dataset.enquiry;
    const fieldset = form.querySelector(".enquiry-fields");
    const submit = form.querySelector("[type=submit]");
    const initialSubmitText = submit.textContent;
    const state = { payload: null, sending: false, confirmed: false };
    states.set(audience, state);
    fieldset.disabled = !available;
    submit.disabled = !available;

    const validate = () => {
      form.querySelectorAll("input:not([type=checkbox]), textarea").forEach((input) => {
        input.setCustomValidity("");
        const text = input.value.trim();
        if (input.required && !text) input.setCustomValidity("Please complete this field.");
        else if (input.minLength > 0 && text.length < input.minLength) input.setCustomValidity(`Please use at least ${input.minLength} characters of useful context.`);
        else if (input.type === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) input.setCustomValidity("Please enter a complete email address.");
        else if (input.type === "url" && text) {
          try {
            const url = new URL(text);
            if (!["http:", "https:"].includes(url.protocol)) input.setCustomValidity("Please use a public http:// or https:// link.");
          } catch (error) {
            if (!(error instanceof TypeError)) throw error;
            input.setCustomValidity("Please enter a complete URL, starting with https://.");
          }
        }
      });
      const skills = [...form.querySelectorAll("[name=skills]")];
      if (skills.length) skills[0].setCustomValidity(skills.some((input) => input.checked) ? "" : "Choose at least one primary strength.");
    };
    form.addEventListener("input", validate);
    form.addEventListener("change", validate);
    validate();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!available) {
        setStatus(form, "Online submissions are not connected. Please use the email link instead.", true);
        focusStatus(form);
        return;
      }
      if (state.sending || state.confirmed) return;
      if (!state.payload) {
        validate();
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const values = Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value).trim()]));
        if (audience === "workforce") values.skills = data.getAll("skills");
        state.payload = {
          ...values,
          consent: data.get("consent") === "on",
          audience,
          requestId: crypto.randomUUID(),
          privacyVersion: config.enquiryPrivacyVersion,
        };
      }
      const payload = state.payload;
      state.sending = true;
      fieldset.disabled = true;
      submit.disabled = true;
      submit.textContent = "Sending securely...";
      form.setAttribute("aria-busy", "true");
      setStatus(form, "Sending your enquiry. Please wait for a confirmation.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        // A simple POST avoids preflight; a readable, matching acknowledgement is still required.
        const response = await fetch(endpoint, {
          method: "POST",
          body: new URLSearchParams({ payload: JSON.stringify(payload) }),
          mode: "cors",
          credentials: "omit",
          redirect: "follow",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("The enquiry service returned an unsuccessful HTTP status.");
        const result = await response.json();
        if (result && result.ok === true && result.requestId === payload.requestId) {
          state.confirmed = true;
          state.payload = null;
          form.reset();
          form.querySelector(".form-content").hidden = true;
          const success = form.querySelector(".form-success");
          success.hidden = false;
          form.querySelector(".receipt-reference").textContent = payload.requestId;
          setStatus(form, "Thank you. Your enquiry has been recorded.");
          emit("contact_form_submit", audience);
        } else if (result && result.ok === false && ["invalid", "refresh", "rejected", "unavailable", "busy"].includes(result.code)) {
          state.payload = null;
          fieldset.disabled = false;
          submit.textContent = initialSubmitText;
          const messages = {
            invalid: "Please check your details and try again. Your enquiry was not accepted.",
            refresh: "This form has been updated. Please reload the page, review the privacy notice, and try again. This attempt was not accepted.",
            rejected: "We couldn't accept this enquiry. Please contact us using the email link.",
            unavailable: "Online enquiries are temporarily unavailable. Your enquiry was not accepted. Please email us or try again later.",
            busy: "The enquiry service is busy. This attempt was not accepted. Please try again in a moment.",
          };
          setStatus(form, messages[result.code], true);
          console.warn("Xplore Horizons: enquiry was not accepted.", result.code);
        } else {
          throw new Error("Delivery was not confirmed by the enquiry service.");
        }
      } catch (error) {
        console.warn("Xplore Horizons: enquiry delivery could not be confirmed.", error.name);
        submit.textContent = "Check / retry delivery";
        setStatus(form, `We couldn't confirm delivery. Your details are kept here for a safe retry using the same reference: ${payload.requestId}. Choose Check / retry delivery, or email us with this reference. Please don't start a second enquiry for the same request.`, true);
      } finally {
        clearTimeout(timeout);
        state.sending = false;
        submit.disabled = state.confirmed;
        form.removeAttribute("aria-busy");
        focusStatus(form);
      }
    });
  });

  const focusOptions = {
    tools: "Choosing a new tool",
    workflows: "AI-enabled workflows",
    design: "A new project or initiative",
    cost: "AI cost and planning",
    talent: "An aligned consulting team",
    platforms: "Platform reliability",
  };
  document.querySelectorAll("[data-form]").forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", "form-dialog");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const audience = link.dataset.form;
      const form = forms.find((item) => item.dataset.enquiry === audience);
      if (!form) {
        console.error("Xplore Horizons: unknown enquiry type.");
        return;
      }
      trigger = link;
      forms.forEach((item) => { item.hidden = item !== form; });
      document.querySelector("#form-dialog-title").textContent = audience === "workforce"
        ? "Your next chapter starts here." : "Let's move something forward.";
      document.querySelector("#form-dialog-description").textContent = audience === "workforce"
        ? "Bring your curiosity, your craft, and your drive to make things work. We'd like to get to know the person behind the skills."
        : "Start with what matters to you. We'll bring curiosity, practical thinking, and a shared sense of ownership.";
      const state = states.get(audience);
      const service = link.closest(".journey-panel");
      if (audience === "partner" && service && !state.payload && !state.confirmed) {
        form.elements.focus.value = focusOptions[service.id.replace("journey-", "")] || "";
      }
      dialog.showModal();
      dialog.scrollTop = 0;
      if (available && !state.payload && !state.confirmed) form.querySelector("[name=name]").focus({ preventScroll: true });
      else dialog.querySelector("[data-close-dialog]").focus({ preventScroll: true });
      if (available) emit("contact_form_open", audience);
    });
  });
  dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  dialog.addEventListener("close", () => {
    if (trigger) trigger.focus({ preventScroll: true });
  });
  window.addEventListener("beforeunload", (event) => {
    if ([...states.values()].some((state) => state.payload && !state.confirmed)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
