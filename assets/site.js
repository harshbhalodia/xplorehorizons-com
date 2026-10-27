"use strict";

(() => {
  const config = window.XH_CONFIG;
  const status = document.querySelector("#site-status");
  const announce = (message) => {
    if (status) status.textContent = message;
  };

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const menu = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#main-nav");
  if (menu && nav) {
    menu.hidden = false;
    document.querySelector(".site-header").classList.add("nav-enhanced");
    const closeMenu = () => {
      menu.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    };
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") !== "true";
      menu.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
        closeMenu();
        menu.focus();
      }
    });
    window.matchMedia("(min-width: 901px)").addEventListener("change", closeMenu);
  }

  const choices = [...document.querySelectorAll("[data-journey]")];
  if (choices.length) {
    const list = document.querySelector(".journey-list");
    const panels = document.querySelector(".journey-panels");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-orientation", "vertical");
    panels.classList.add("is-enhanced");
    const selectJourney = (choice, moveFocus = false) => {
      choices.forEach((item) => {
        const active = item === choice;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
        document.getElementById(`journey-${item.dataset.journey}`).hidden = !active;
      });
      if (moveFocus) choice.focus();
    };
    choices.forEach((choice, index) => {
      const id = `journey-${choice.dataset.journey}`;
      choice.id = `tab-${choice.dataset.journey}`;
      choice.setAttribute("role", "tab");
      choice.setAttribute("aria-controls", id);
      const panel = document.getElementById(id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", choice.id);
      panel.tabIndex = 0;
      choice.addEventListener("click", (event) => {
        event.preventDefault();
        selectJourney(choice);
      });
      choice.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowDown") next = (index + 1) % choices.length;
        if (event.key === "ArrowUp") next = (index - 1 + choices.length) % choices.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = choices.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          selectJourney(choices[next], true);
        }
        if (event.key === " ") {
          event.preventDefault();
          selectJourney(choice);
        }
      });
    });
    const selectHash = () => {
      const match = choices.find((choice) => choice.getAttribute("href") === window.location.hash);
      if (match) selectJourney(match);
    };
    selectJourney(choices[0]);
    selectHash();
    window.addEventListener("hashchange", selectHash);
  }

  if (!config) {
    console.error("Xplore Horizons: assets/config.js did not load. Forms and analytics are unavailable.");
    announce("Enquiry links and analytics preferences could not load. Please refresh to try again.");
    return;
  }

  const consentKey = "xh-analytics-consent";
  const banner = document.querySelector(".cookie-banner");
  let consent = "denied";
  let storedConsent = null;
  let analyticsLoaded = false;
  let analyticsFailed = false;
  let analyticsScript;
  let preferencesTrigger;
  const measurementId = config.analyticsMeasurementId;
  const disableKey = `ga-disable-${measurementId}`;
  const productionHost = config.analyticsHosts.includes(window.location.hostname);

  try {
    storedConsent = localStorage.getItem(consentKey);
  } catch (error) {
    console.warn("Xplore Horizons: preferences cannot be read from browser storage.", error);
    announce("Your browser blocks preference storage. Analytics stays off until you accept.");
  }
  if (storedConsent === "granted") consent = "granted";

  const track = (name, parameters) => {
    if (consent === "granted" && analyticsLoaded && !analyticsFailed) {
      window.gtag("event", name, parameters);
    }
  };

  const loadAnalytics = () => {
    if (!productionHost || analyticsLoaded || consent !== "granted") return;
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) {
      console.error("Xplore Horizons: invalid Google Analytics measurement ID.");
      announce("Analytics configuration is unavailable. Site features still work.");
      return;
    }
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    // Never include arbitrary query strings, hashes, or referrers in analytics.
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `${window.location.origin}${window.location.pathname}`,
      page_referrer: "",
    });
    analyticsLoaded = true;
    track("page_view", { page_title: document.title });
    analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    analyticsScript.addEventListener("error", () => {
      analyticsFailed = true;
      console.warn("Xplore Horizons: Google Analytics could not load; browsing is unaffected.");
      announce("Analytics could not load. All site features remain available.");
    });
    document.head.append(analyticsScript);
  };

  const clearAnalyticsCookies = () => {
    const parts = window.location.hostname.split(".");
    const domains = [""];
    for (let index = 0; index < parts.length - 1; index += 1) {
      const domain = parts.slice(index).join(".");
      domains.push(domain, `.${domain}`);
    }
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name !== "_ga" && !name.startsWith("_ga_")) return;
      domains.forEach((domain) => {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
      });
    });
  };

  const saveConsent = (value) => {
    const wasLoaded = analyticsLoaded;
    consent = value;
    try {
      localStorage.setItem(consentKey, value);
    } catch (error) {
      console.warn("Xplore Horizons: the analytics preference could not be saved.", error);
      announce("This preference applies to this page only. Your browser prevented saving it.");
    }
    if (banner) banner.hidden = true;
    if (preferencesTrigger) preferencesTrigger.focus();
    if (value === "granted") {
      loadAnalytics();
    } else {
      window[disableKey] = true;
      clearAnalyticsCookies();
      // Reload unloads Google's runtime, including any listeners it registered.
      if (wasLoaded) window.location.reload();
    }
  };

  document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => {
      if (!banner) return;
      preferencesTrigger = button;
      banner.hidden = false;
      banner.querySelector("button").focus();
    });
  });
  document.querySelectorAll("[data-consent]").forEach((button) => {
    button.addEventListener("click", () => saveConsent(button.dataset.consent));
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== consentKey && event.key !== null) return;
    consent = event.newValue === "granted" ? "granted" : "denied";
    if (consent === "granted") {
      if (banner) banner.hidden = true;
      loadAnalytics();
    } else {
      window[disableKey] = true;
      clearAnalyticsCookies();
      if (analyticsLoaded) window.location.reload();
      else if (banner) banner.hidden = event.newValue === "denied";
    }
  });
  if (banner) banner.hidden = storedConsent === "granted" || storedConsent === "denied";
  window[disableKey] = consent !== "granted";
  loadAnalytics();

  document.addEventListener("xh:form-event", (event) => {
    const { name, audience } = event.detail || {};
    if (["contact_form_open", "contact_form_submit"].includes(name) && ["partner", "workforce"].includes(audience)) {
      track(name, { audience });
    }
  });
})();
