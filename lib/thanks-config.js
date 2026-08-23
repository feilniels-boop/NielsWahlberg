"use strict";

/* ------------------------------------------------------------------
   Statisk konfiguration til tal-sektionen på /en/thanks.
   Venstre kolonne er ren tekst her — ikke hardcodet i markup.
------------------------------------------------------------------ */

module.exports = {
  danishChannel: {
    heading: "The Danish channel",
    // Verificerede tal fra YouTube-eksporten. MÅ IKKE oppustes — hele
    // positionen hviler på at tallene er sande, også når de er små.
    lines: [
      "685 subscribers",
      "263 videos, each filmed in about 15 minutes",
      "median 272 views per video",
      "10+ paying clients, all of them from content",
      "0 spent on ads",
      "more than 50 dollars earned per 1,000 views, versus a few dollars from AdSense",
    ],
  },
  englishChannel: {
    heading: "The English channel",
    // Etiketter til de dynamiske tal. Rækkefølgen styres i koden.
    labels: {
      videos: "videos",
      views: "total views",
      plans: "plans requested",
      calls: "calls booked",
      clients: "clients",
    },
  },
  // Vises under de to kolonner. {date} udfyldes fra CHANNEL_START_DATE.
  footnoteWithDate: "I started this one from zero on {date}. These numbers update themselves.",
  footnoteNoDate: "I started this one from zero. These numbers update themselves.",
};
