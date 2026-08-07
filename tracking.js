/* ============================================================
   Funnel-tracking (adfærd, ingen persondata).
   Sender events til Supabase-tabellen public.form_events via
   PostgREST REST-endpoint. Ingen dependency, ingen await der
   blokerer UI. Fejler tracking, fungerer formularen præcis som før.

   FLYT TIL ET ANDET PROJEKT:
   1) Kør migrationen (supabase/migrations/*_create_form_events_tracking.sql)
      i det ønskede projekt.
   2) Skift de to konstanter herunder til det projekts URL + anon-nøgle.
   Anon-nøglen er offentlig og kan kun INSERT (styret af RLS).
   ============================================================ */
(function () {
  "use strict";

  // --- Konfiguration (offentlig anon-nøgle; RLS tillader kun INSERT) ---
  var SUPABASE_URL = "https://brskrvvnisnuslufkeqi.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyc2tydnZuaXNudXNsdWZrZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODM4NjcsImV4cCI6MjEwMDY1OTg2N30.rI--xergHz_q-rGBz3h_BsbUBDv_2jCkT83kF4uBou0";
  var ENDPOINT = SUPABASE_URL + "/rest/v1/form_events";

  var SID_KEY = "nw_track_sid";
  var TS_KEY = "nw_track_last_ts";

  function uuid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    // Fallback (ældre browsere)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  var sessionId = null;
  try {
    sessionId = sessionStorage.getItem(SID_KEY);
    if (!sessionId) {
      sessionId = uuid();
      sessionStorage.setItem(SID_KEY, sessionId);
    }
  } catch (e) {
    try {
      sessionId = uuid();
    } catch (_) {
      sessionId = null;
    }
  }

  var ua = (navigator.userAgent || "");
  var device = /iPad|Tablet/i.test(ua)
    ? "tablet"
    : /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)
    ? "mobile"
    : "desktop";

  function msSincePrev(now) {
    var prev = null;
    try {
      prev = parseInt(sessionStorage.getItem(TS_KEY) || "", 10);
    } catch (e) {}
    var ms = prev && !isNaN(prev) ? now - prev : null;
    try {
      sessionStorage.setItem(TS_KEY, String(now));
    } catch (e) {}
    return ms;
  }

  function buildRow(event, extra) {
    var now = Date.now();
    var row = {
      session_id: sessionId,
      event: event,
      ms_since_prev: msSincePrev(now),
      device: device,
      viewport_w: window.innerWidth || null,
      user_agent: ua.slice(0, 500),
      referrer: document.referrer || null,
    };
    if (extra) {
      if (extra.step_index !== undefined && extra.step_index !== null)
        row.step_index = extra.step_index;
      if (extra.step_key !== undefined && extra.step_key !== null)
        row.step_key = extra.step_key;
      if (extra.meta !== undefined && extra.meta !== null) row.meta = extra.meta;
    }
    return row;
  }

  function send(row, useBeacon) {
    var body = JSON.stringify(row);
    if (useBeacon) {
      try {
        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: "application/json" });
          // apikey som query-param, da sendBeacon ikke kan sætte headers
          var ok = navigator.sendBeacon(
            ENDPOINT + "?apikey=" + encodeURIComponent(SUPABASE_ANON_KEY),
            blob
          );
          if (ok) return;
        }
      } catch (e) {}
      // Falder igennem til keepalive-fetch hvis beacon ikke er muligt
    }
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: body,
        keepalive: true,
        mode: "cors",
        cache: "no-store",
      }).catch(function () {});
    } catch (e) {}
  }

  // track(event, extra?, opts?) — fire and forget, kan aldrig kaste
  function track(event, extra, opts) {
    if (!sessionId || !event) return;
    try {
      send(buildRow(event, extra), !!(opts && opts.beacon));
    } catch (e) {}
  }

  window.NWTrack = { track: track, sessionId: sessionId };
})();
