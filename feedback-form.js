/* ============================================================
   Fælles lead magnet-formular.
   Bruges af /feedback, /forretning og /en/quiz. Konfiguration sættes
   via window.FeedbackFormConfig FØR dette script indlæses:

     window.FeedbackFormConfig = {
       source: "feedback" | "forretning" | "feedback-en",
       questions: [ ...tællende spørgsmål... ],
       text:       { ...override af UI-tekster (default = dansk)... },
       contact:    { ...override af kontakt-trin (default = dansk)... },
       redirectTo: "/tak",     // hvor der sendes hen ved success
       homeHref:   "/",        // brand-link
       phoneMode:  "dk" | "intl"
     };

   Alt der ikke sættes i config falder tilbage til dansk, så
   /feedback og /forretning er uændrede.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.FeedbackFormConfig || {};
  var QUESTIONS = cfg.questions || [];
  var SOURCE = cfg.source || "feedback";
  var REDIRECT_TO = cfg.redirectTo || "/tak";
  var SUBMIT_TO = cfg.submitTo || "/api/feedback";
  var HOME_HREF = cfg.homeHref || "/";
  var PHONE_MODE = cfg.phoneMode || "dk";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function merge(base, over) {
    var out = {};
    for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (over) for (var j in over) if (Object.prototype.hasOwnProperty.call(over, j)) out[j] = over[j];
    return out;
  }
  function fmt(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? vars[key] : "{" + key + "}";
    });
  }

  /* ---- UI-tekster (dansk default; kan overrides via cfg.text) ---- */
  var DEFAULT_TEXT = {
    brandName: "Niels Wahlberg",
    brandSubtitle: "Coaching",
    counterPrefix: "Spørgsmål ",
    counterMid: " af ",
    sublineLast: "Sidste spørgsmål",
    sublineLastTwo: "Sidste to spørgsmål",
    sublineHalf: "Du er over halvvejs.",
    sublineContact: "Sidste trin",
    btnNext: "Næste",
    btnSend: "Send",
    btnBack: "← Tilbage",
    hint: "Tryk Enter for at gå videre.",
    hpLabel: "Udfyld ikke dette felt",
    scaleLow: "Slet ikke klar",
    scaleHigh: "Meget klar",
    loading: "Sender …",
    submitError: "Noget gik galt, og dine svar blev ikke sendt. Tjek din forbindelse og prøv igen.",
    valChoice: "Vælg en mulighed for at gå videre.",
    valTextarea: "Skriv et kort svar.",
    valScale: "Vælg et tal fra {min} til {max}.",
  };
  var T = merge(DEFAULT_TEXT, cfg.text);

  /* ---- Kontakt-trin (dansk default; kan overrides via cfg.contact) ---- */
  var DEFAULT_CONTACT = {
    heading: "Tak for dit svar.",
    subtext: "Udfyld lige, hvem jeg sender svaret til.",
    newsletterLabel: "Ja tak, send mig også værktøjer og råd på mail",
    newsletterRevealsEmail: true,
    newsletterEmailPlaceholder: "Din e-mail",
    newsletterEmailMsgRequired: "Skriv din e-mail.",
    newsletterEmailMsgInvalid: "Skriv en gyldig e-mail.",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Dit navn",
        placeholder: "Fx Jonas",
        autocomplete: "name",
        msgRequired: "Skriv dit navn.",
      },
      {
        id: "age",
        type: "number",
        label: "Din alder",
        placeholder: "Fx 24",
        min: 13,
        max: 99,
        payloadLabel: "Alder",
        msgRequired: "Skriv din alder.",
        msgInvalid: "Alderen skal være mellem {min} og {max}.",
      },
      {
        id: "phone",
        type: "tel",
        label: "Telefonnummer",
        placeholder: "Fx 12 34 56 78",
        help: "jeg ringer ikke, kun til at sende lydbesked",
        autocomplete: "tel",
        msgRequired: "Skriv dit telefonnummer.",
        msgInvalid: "Skriv et gyldigt dansk telefonnummer.",
      },
    ],
  };
  var CONTACT = cfg.contact || DEFAULT_CONTACT;

  var COUNT = QUESTIONS.length; // antal tællende spørgsmål
  var LAST = COUNT; // index for kontakt-trinet (det sidste)
  var STORAGE_KEY = "nw_form_" + SOURCE + "_v1";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---- Byg skelettet (samme markup for alle formularer) ---- */
  var skeleton =
    '<header class="fb-top">' +
    '<div class="fb-main" style="padding: 0; justify-content: flex-start">' +
    '<div class="fb-top-row">' +
    '<a class="brand" href="' + esc(HOME_HREF) + '" aria-label="' + esc(T.brandName + " " + T.brandSubtitle) + '">' +
    '<span class="brand-mark" aria-hidden="true"></span>' +
    '<span class="brand-text">' +
    '<span class="brand-name">' + esc(T.brandName) + "</span>" +
    '<span class="brand-subtitle">' + esc(T.brandSubtitle) + "</span>" +
    "</span>" +
    "</a>" +
    '<span class="fb-counter" id="fbCounter" hidden></span>' +
    "</div>" +
    '<div class="fb-progress" id="fbProgressWrap" role="progressbar" aria-valuemin="1" aria-valuemax="' +
    COUNT +
    '" hidden><div class="fb-progress-fill" id="fbProgressFill"></div></div>' +
    '<p class="fb-subline" id="fbSubline" hidden></p>' +
    "</div>" +
    "</header>" +
    '<main class="fb-main" id="fbMain">' +
    '<form id="fbForm" novalidate>' +
    '<div id="fbStepMount" aria-live="polite"></div>' +
    '<div class="fb-hp" aria-hidden="true"><label>' + esc(T.hpLabel) +
    '<input type="text" id="fbHp" name="fb_hp_field" tabindex="-1" autocomplete="off" ' +
    'data-lpignore="true" data-1p-ignore="" data-form-type="other" /></label></div>' +
    '<p class="fb-error" id="fbError" role="alert"></p>' +
    '<div class="fb-nav">' +
    '<button class="btn btn-secondary fb-back" id="fbBack" type="button" hidden>' + esc(T.btnBack) + "</button>" +
    '<button class="btn btn-primary fb-next" id="fbNext" type="submit">' + esc(T.btnNext) + "</button>" +
    "</div>" +
    '<p class="fb-hint">' + esc(T.hint) + "</p>" +
    "</form>" +
    "</main>";

  document.body.insertAdjacentHTML("afterbegin", skeleton);

  /* ---- DOM ---- */
  var form = document.getElementById("fbForm");
  var mount = document.getElementById("fbStepMount");
  var counterEl = document.getElementById("fbCounter");
  var progressWrap = document.getElementById("fbProgressWrap");
  var progressFill = document.getElementById("fbProgressFill");
  var sublineEl = document.getElementById("fbSubline");
  var backBtn = document.getElementById("fbBack");
  var nextBtn = document.getElementById("fbNext");
  var errorEl = document.getElementById("fbError");
  var hpInput = document.getElementById("fbHp");

  progressWrap.setAttribute("aria-valuemax", String(COUNT));

  /* ---- State ---- */
  var state = { answers: {}, currentIdx: 0, started: false };

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.answers) {
          state.answers = parsed.answers;
          state.started = !!parsed.started;
          state.currentIdx = typeof parsed.currentIdx === "number" ? parsed.currentIdx : 0;
        }
      }
    } catch (e) {}
  }
  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }
  function clearSaved() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---- Tracking (adfærd, ingen persondata) — må aldrig vælte formularen ---- */
  var seenSteps = {}; // dedupe af step_view
  var formStarted = false;
  var abandonSent = false;
  var submitted = false;

  function stepKey(idx) {
    return idx < COUNT ? (QUESTIONS[idx] && QUESTIONS[idx].id) || "step_" + idx : "contact";
  }
  function trk(event, extra, opts) {
    try {
      if (!window.NWTrack) return;
      extra = extra || {};
      var meta = extra.meta || {};
      meta.source = SOURCE; // så de forskellige formularer kan adskilles i tabellen
      extra.meta = meta;
      window.NWTrack.track(event, extra, opts);
    } catch (e) {}
  }
  function trackStepView(idx) {
    if (seenSteps[idx]) return; // et re-render må ikke sende samme event igen
    seenSteps[idx] = true;
    trk("step_view", { step_index: idx, step_key: stepKey(idx) });
  }
  function markStarted() {
    if (formStarted) return;
    formStarted = true;
    trk("form_start", { step_index: 0, step_key: stepKey(0) });
  }
  function maybeAbandon() {
    if (abandonSent || submitted) return;
    abandonSent = true;
    trk("abandon", { step_index: state.currentIdx, step_key: stepKey(state.currentIdx) });
  }

  /* ---- Progress ---- */
  function sublineFor(idx) {
    if (idx === COUNT - 1) return T.sublineLast;
    if (idx >= COUNT - 2) return T.sublineLastTwo;
    if (idx >= Math.floor(COUNT / 2)) return T.sublineHalf;
    return "";
  }
  function updateProgress(idx) {
    if (idx < COUNT) {
      var pct = Math.round(((idx + 1) / COUNT) * 100);
      progressFill.style.width = pct + "%";
      counterEl.textContent = T.counterPrefix + (idx + 1) + T.counterMid + COUNT;
      counterEl.hidden = false;
      progressWrap.setAttribute("aria-valuenow", String(idx + 1));
      var sub = sublineFor(idx);
      sublineEl.textContent = sub;
      sublineEl.hidden = !sub;
    } else {
      // Kontakt-trin: baren er fuld, tælleren skjules
      progressFill.style.width = "100%";
      counterEl.hidden = true;
      progressWrap.setAttribute("aria-valuenow", String(COUNT));
      sublineEl.textContent = T.sublineContact;
      sublineEl.hidden = false;
    }
    progressWrap.hidden = false;
  }

  /* ---- Validering ---- */
  function validPhone(v) {
    if (PHONE_MODE === "intl") {
      var d = String(v).replace(/[\s()\-]/g, "");
      return /^\+?\d{7,15}$/.test(d);
    }
    var n = String(v).replace(/\s+/g, "").replace(/^(\+45|0045)/, "");
    return /^\d{8}$/.test(n);
  }
  function validateQuestion(step, val) {
    switch (step.type) {
      case "choice":
        return !val || !val.key ? T.valChoice : "";
      case "scale":
        return val === undefined || val === null || val === ""
          ? fmt(T.valScale, { min: step.min, max: step.max })
          : "";
      case "textarea":
        return !val || !String(val).trim() ? T.valTextarea : "";
    }
    return "";
  }
  function validateField(f, val) {
    var v = String(val == null ? "" : val).trim();
    // Valgfrit felt uden værdi er altid ok. Har det en værdi, valideres formatet nedenfor.
    if (f.optional && !v) return "";
    if (f.type === "email") {
      if (!v) return f.msgRequired;
      if (!EMAIL_RE.test(v)) return f.msgInvalid;
      return "";
    }
    if (f.type === "tel") {
      if (!v) return f.msgRequired;
      if (!validPhone(v)) return f.msgInvalid;
      return "";
    }
    if (f.type === "number") {
      if (!v) return f.msgRequired;
      var n = parseInt(v, 10);
      if (isNaN(n) || n < f.min || n > f.max) return fmt(f.msgInvalid, { min: f.min, max: f.max });
      return "";
    }
    if (!v) return f.msgRequired;
    return "";
  }

  /* ---- Rendering af spørgsmål ---- */
  function buildQuestionField(step) {
    var val = state.answers[step.id];
    var wrap = document.createElement("div");
    wrap.className = "fb-field";

    if (step.type === "textarea") {
      var ta = document.createElement("textarea");
      ta.id = "fbInput";
      ta.placeholder = step.placeholder || "";
      ta.rows = 4;
      if (val) ta.value = val;
      wrap.appendChild(ta);

      // Valgfri "spring over"-knap (fx "Har ikke nogen")
      if (step.skipLabel) {
        var skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.className = "fb-skip";
        skipBtn.textContent = step.skipLabel;
        skipBtn.addEventListener("click", function () {
          var v = step.skipValue || step.skipLabel;
          ta.value = v;
          state.answers[step.id] = v;
          save();
          clearError();
          goNext();
        });
        wrap.appendChild(skipBtn);
      }
    } else if (step.type === "choice") {
      wrap.className = "fb-options";
      step.options.forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "fb-option";
        if (val && val.key === opt.key) b.classList.add("is-selected");
        b.innerHTML = '<span class="fb-key">' + esc(opt.key) + "</span><span>" + esc(opt.label) + "</span>";
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(wrap.children, function (c) {
            c.classList.remove("is-selected");
          });
          b.classList.add("is-selected");
          state.answers[step.id] = { key: opt.key, label: opt.label };
          save();
          clearError();
          setTimeout(goNext, 250);
        });
        wrap.appendChild(b);
      });
    } else if (step.type === "scale") {
      var scale = document.createElement("div");
      scale.className = "fb-scale";
      for (var i = step.min; i <= step.max; i++) {
        (function (num) {
          var b = document.createElement("button");
          b.type = "button";
          b.textContent = num;
          if (val === num) b.classList.add("is-selected");
          b.addEventListener("click", function () {
            Array.prototype.forEach.call(scale.children, function (c) {
              c.classList.remove("is-selected");
            });
            b.classList.add("is-selected");
            state.answers[step.id] = num;
            save();
            clearError();
            setTimeout(goNext, 250);
          });
          scale.appendChild(b);
        })(i);
      }
      wrap.appendChild(scale);
      var legend = document.createElement("div");
      legend.className = "fb-scale-legend";
      var lo = document.createElement("span");
      lo.textContent = T.scaleLow;
      var hi = document.createElement("span");
      hi.textContent = T.scaleHigh;
      legend.appendChild(lo);
      legend.appendChild(hi);
      wrap.appendChild(legend);
    }
    return wrap;
  }

  function renderQuestion(idx) {
    var step = QUESTIONS[idx];
    mount.innerHTML = "";
    var container = document.createElement("div");
    container.className = "fb-step";

    var q = document.createElement("h2");
    q.className = "fb-q";
    q.textContent = step.question;
    container.appendChild(q);

    container.appendChild(buildQuestionField(step));
    mount.appendChild(container);

    backBtn.hidden = idx === 0;
    nextBtn.textContent = T.btnNext;
    clearError();
    updateProgress(idx);

    setTimeout(function () {
      var focusable = mount.querySelector("textarea, input:not([type=checkbox])");
      if (focusable) focusable.focus();
    }, 40);
  }

  /* ---- Rendering af kontakt-trin ---- */
  function renderContact() {
    mount.innerHTML = "";
    var a = state.answers;
    var c = document.createElement("div");
    c.className = "fb-step";

    var h = document.createElement("h2");
    h.className = "fb-q";
    h.textContent = CONTACT.heading;
    c.appendChild(h);

    var help = document.createElement("p");
    help.className = "fb-help";
    help.textContent = CONTACT.subtext;
    c.appendChild(help);

    CONTACT.fields.forEach(function (f) {
      var wrap = document.createElement("div");
      wrap.className = "fb-contact-field";

      var lbl = document.createElement("label");
      lbl.className = "fb-flabel";
      lbl.setAttribute("for", "fb" + cap(f.id));
      lbl.textContent = f.label;
      wrap.appendChild(lbl);

      var input = document.createElement("input");
      input.id = "fb" + cap(f.id);
      input.type = f.type === "number" ? "text" : f.type; // number som text -> pænere mobiltastatur
      if (f.type === "number") input.inputMode = "numeric";
      if (f.type === "tel") input.inputMode = "tel";
      if (f.type === "email") input.inputMode = "email";
      input.placeholder = f.placeholder || "";
      if (f.autocomplete) input.autocomplete = f.autocomplete;
      if (a[f.id]) input.value = a[f.id];
      wrap.appendChild(input);

      if (f.help) {
        var fh = document.createElement("p");
        fh.className = "fb-fhelp";
        fh.textContent = f.help;
        wrap.appendChild(fh);
      }
      var er = document.createElement("p");
      er.className = "fb-ferr";
      er.id = "err-" + f.id;
      wrap.appendChild(er);
      c.appendChild(wrap);
    });

    // Nyhedsbrev
    var nl = a.newsletter || { optIn: false, email: "" };
    var lblc = document.createElement("label");
    lblc.className = "fb-consent";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "fbConsent";
    cb.checked = !!nl.optIn;
    var tx = document.createElement("span");
    tx.textContent = CONTACT.newsletterLabel;
    lblc.appendChild(cb);
    lblc.appendChild(tx);
    c.appendChild(lblc);

    if (CONTACT.newsletterRevealsEmail) {
      // Dansk: checkboxen folder et e-mailfelt ud
      var ew = document.createElement("div");
      ew.className = "fb-email-wrap" + (nl.optIn ? " is-open" : "");
      var em = document.createElement("input");
      em.type = "email";
      em.id = "fbEmail";
      em.placeholder = CONTACT.newsletterEmailPlaceholder;
      em.autocomplete = "email";
      if (nl.email) em.value = nl.email;
      ew.appendChild(em);
      var ee = document.createElement("p");
      ee.className = "fb-ferr";
      ee.id = "err-email";
      ew.appendChild(ee);
      c.appendChild(ew);

      cb.addEventListener("change", function () {
        ew.classList.toggle("is-open", cb.checked);
        state.answers.newsletter = { optIn: cb.checked, email: em.value };
        save();
        if (cb.checked) setTimeout(function () { em.focus(); }, 60);
      });
      em.addEventListener("input", function () {
        state.answers.newsletter = { optIn: cb.checked, email: em.value };
        save();
      });
    } else {
      // Engelsk: e-mail er allerede et felt ovenfor — checkboxen er ren opt-in
      cb.addEventListener("change", function () {
        state.answers.newsletter = { optIn: cb.checked };
        save();
      });
    }

    mount.appendChild(c);

    backBtn.hidden = false;
    nextBtn.textContent = T.btnSend;
    clearError();
    updateProgress(LAST);

    setTimeout(function () {
      var first = CONTACT.fields[0];
      var f = first ? document.getElementById("fb" + cap(first.id)) : null;
      if (f) f.focus();
    }, 40);
  }

  function renderStep(idx) {
    trackStepView(idx);
    if (idx < COUNT) renderQuestion(idx);
    else renderContact();
  }

  function clearError() {
    errorEl.textContent = "";
  }
  function showError(msg) {
    errorEl.textContent = msg;
  }
  function showFieldError(id, msg) {
    var el = document.getElementById("err-" + id);
    if (el) el.textContent = msg || "";
  }

  /* ---- Læs aktuelle felter ind i state ---- */
  function captureCurrent() {
    var idx = state.currentIdx;
    if (idx < COUNT) {
      var step = QUESTIONS[idx];
      if (step.type === "textarea") {
        var el = document.getElementById("fbInput");
        if (el) {
          state.answers[step.id] = el.value;
          save();
        }
      }
      // choice/scale gemmes ved klik
    } else {
      CONTACT.fields.forEach(function (f) {
        var fel = document.getElementById("fb" + cap(f.id));
        if (fel) state.answers[f.id] = fel.value;
      });
      var cb = document.getElementById("fbConsent");
      if (cb) {
        if (CONTACT.newsletterRevealsEmail) {
          var em = document.getElementById("fbEmail");
          state.answers.newsletter = { optIn: cb.checked, email: em ? em.value : "" };
        } else {
          state.answers.newsletter = { optIn: cb.checked };
        }
      }
      save();
    }
  }

  function validateContact() {
    captureCurrent();
    var a = state.answers;
    var firstInvalid = null;
    var errs = {};

    CONTACT.fields.forEach(function (f) {
      var msg = validateField(f, a[f.id]);
      showFieldError(f.id, msg);
      if (msg) {
        errs[f.id] = msg;
        if (!firstInvalid) firstInvalid = "fb" + cap(f.id);
      }
    });

    if (CONTACT.newsletterRevealsEmail) {
      var nl = a.newsletter || {};
      var eE = "";
      if (nl.optIn) {
        var v = String(nl.email || "").trim();
        if (!v) eE = CONTACT.newsletterEmailMsgRequired;
        else if (!EMAIL_RE.test(v)) eE = CONTACT.newsletterEmailMsgInvalid;
      }
      showFieldError("email", eE);
      if (eE) {
        errs.email = eE;
        if (!firstInvalid) firstInvalid = "fbEmail";
      }
    }

    if (firstInvalid) {
      trk("validation_error", { step_index: COUNT, step_key: "contact", meta: { errors: errs } });
      var f = document.getElementById(firstInvalid);
      if (f) f.focus();
      return false;
    }
    return true;
  }

  /* ---- Navigation ---- */
  function goTo(idx, push) {
    state.currentIdx = idx;
    state.started = true;
    save();
    if (push) history.pushState({ fbIdx: idx }, "");
    renderStep(idx);
  }

  function goNext() {
    if (state.currentIdx === LAST) {
      if (!validateContact()) return;
      submitForm();
      return;
    }
    captureCurrent();
    var step = QUESTIONS[state.currentIdx];
    var err = validateQuestion(step, state.answers[step.id]);
    if (err) {
      trk("validation_error", {
        step_index: state.currentIdx,
        step_key: stepKey(state.currentIdx),
        meta: { message: err },
      });
      showError(err);
      return;
    }
    trk("step_complete", {
      step_index: state.currentIdx,
      step_key: stepKey(state.currentIdx),
    });
    goTo(state.currentIdx + 1, true);
  }

  function goBack() {
    if (state.currentIdx > 0) {
      trk("step_back", {
        step_index: state.currentIdx,
        step_key: stepKey(state.currentIdx),
      });
      captureCurrent();
      history.back();
    }
  }

  window.addEventListener("popstate", function (e) {
    if (e.state && typeof e.state.fbIdx === "number") {
      state.currentIdx = e.state.fbIdx;
      save();
      renderStep(e.state.fbIdx);
    }
  });

  /* ---- Enter-håndtering ---- */
  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t && t.tagName === "TEXTAREA") {
      if (e.shiftKey) return; // Shift+Enter = linjeskift
      e.preventDefault();
      goNext();
    } else if (t && t.tagName === "INPUT" && t.type !== "checkbox") {
      e.preventDefault();
      if (state.currentIdx === LAST) {
        // Kontakt-trin: hop til næste synlige felt, ellers send
        var inputs = Array.prototype.slice.call(mount.querySelectorAll("input:not([type=checkbox])"));
        var i = inputs.indexOf(t);
        if (i > -1 && i < inputs.length - 1 && inputs[i + 1].offsetParent !== null) {
          inputs[i + 1].focus();
        } else {
          goNext();
        }
      } else {
        goNext();
      }
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    goNext();
  });
  backBtn.addEventListener("click", goBack);

  /* form_start: første ægte brugerinteraktion (ikke vores autofokus).
     pointerdown/input/keydown udløses ikke af programmatisk fokus. */
  form.addEventListener("pointerdown", markStarted);
  form.addEventListener("input", markStarted);
  form.addEventListener("keydown", markStarted);

  /* abandon: forlader siden uden submit_success. visibilitychange->hidden
     er mere pålidelig end beforeunload på iOS Safari; pagehide som backup. */
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") maybeAbandon();
  });
  window.addEventListener("pagehide", maybeAbandon);

  /* ---- Afsendelse ---- */
  function formatAnswer(step) {
    var val = state.answers[step.id];
    if (step.type === "choice") return val ? val.key + " – " + val.label : "";
    if (step.type === "scale") return val != null ? val + " / " + step.max : "";
    return val != null ? String(val).trim() : "";
  }

  function buildPayload() {
    var lines = QUESTIONS.map(function (step) {
      return { q: step.question, a: formatAnswer(step) };
    });
    // Kontakt-felter med payloadLabel (fx alder) tilføjes som linjer;
    // navn/telefon/e-mail lægges i header-felterne herunder.
    CONTACT.fields.forEach(function (f) {
      if (f.payloadLabel) {
        lines.push({ q: f.payloadLabel, a: String(state.answers[f.id] || "").trim() });
      }
    });
    // Struktureret svar-array (id/type/rå værdi) — bruges af server-routes
    // (fx /api/quiz → Claude). Display-strengen ligger stadig i "lines".
    var answers = QUESTIONS.map(function (step) {
      return {
        id: step.id,
        type: step.type,
        question: step.question,
        value: state.answers[step.id] != null ? state.answers[step.id] : null,
        display: formatAnswer(step),
      };
    });
    // Alle kontaktfelter samlet efter id (fx contact.company).
    var contact = {};
    CONTACT.fields.forEach(function (f) {
      contact[f.id] = String(state.answers[f.id] || "").trim();
    });
    var consent = state.answers.newsletter || {};
    var email = state.answers.email || consent.email || "";
    return {
      source: SOURCE,
      name: (state.answers.name || "").trim(),
      phone: (state.answers.phone || "").trim(),
      email: String(email).trim(),
      newsletter: !!consent.optIn,
      hp: hpInput.value,
      lines: lines,
      contact: contact,
      answers: answers,
    };
  }

  function submitForm() {
    showError("");
    trk("submit_attempt", { step_index: COUNT, step_key: "contact" });
    nextBtn.disabled = true;
    backBtn.disabled = true;
    var original = nextBtn.textContent;
    nextBtn.textContent = T.loading;

    var httpStatus = 0;
    fetch(SUBMIT_TO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    })
      .then(function (res) {
        httpStatus = res.status;
        return res.json().catch(function () {
          return { ok: res.ok };
        });
      })
      .then(function (data) {
        if (data && data.ok) {
          submitted = true; // så visibilitychange under redirect ikke sender abandon
          trk("submit_success", { step_index: COUNT, step_key: "contact" });
          clearSaved();
          window.location.href = REDIRECT_TO;
        } else {
          throw new Error((data && data.error) || "fejl");
        }
      })
      .catch(function (err) {
        trk("submit_error", {
          step_index: COUNT,
          step_key: "contact",
          meta: { status: httpStatus || null, message: (err && err.message) || "fejl" },
        });
        nextBtn.disabled = false;
        backBtn.disabled = false;
        nextBtn.textContent = original;
        showError(T.submitError);
      });
  }

  /* ---- Gå direkte til første spørgsmål (eller genoptag efter reload) ---- */
  load();
  var startIdx =
    state.started && state.currentIdx > 0 && state.currentIdx <= LAST ? state.currentIdx : 0;
  state.started = true;
  save();
  history.replaceState({ fbIdx: startIdx }, "");
  trk("page_view");
  renderStep(startIdx);
})();
