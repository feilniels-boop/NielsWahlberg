"use strict";

/* ------------------------------------------------------------------
   Statisk konfiguration til tal-sektionen på /en/thanks.
   Venstre kolonne er ren tekst her — ikke hardcodet i markup.
------------------------------------------------------------------ */

module.exports = {
  danishChannel: {
    heading: "The Danish channel",
    lines: [
      "37,000 subscribers",
      "median 63 views per video",
      "10+ clients, all from content",
      "0 kr spent on ads",
    ],
  },
  englishChannel: {
    heading: "The English channel",
    // Etiketter til de dynamiske tal. Rækkefølgen styres i koden.
    labels: {
      videos: "videos",
      views: "total views",
      plans: "plans sent",
      calls: "calls booked",
      clients: "clients",
    },
  },
  // Vises under de to kolonner. {date} udfyldes fra CHANNEL_START_DATE.
  footnoteWithDate: "I started this one from zero on {date}. These numbers update themselves.",
  footnoteNoDate: "I started this one from zero. These numbers update themselves.",
};
