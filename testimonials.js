/* ============================================================
   Fælles kilde til testimonials + anmeldelser.
   Bruges af både index.html (forsiden) og tak.html, så
   indholdet kun skal vedligeholdes ét sted.

   Rediger data herunder — markup og styling genbruges 1:1.
   ============================================================ */
(function () {
  "use strict";

  // Sprog: sæt window.NW_LANG = "en" på en side FØR dette script indlæses.
  var LANG = window.NW_LANG === "en" ? "en" : "da";

  /* Video-testimonials (klip-sektionen på forsiden) — altid de samme danske
     videoklip. UI-teksten (overskrift, knap, billedtekster) oversættes efter
     LANG. Sæt subsEn til stien på en engelsk .vtt-fil, så vises engelske
     undertekster på /en (tomt = ingen undertekster endnu). */
  var videoFeature = {
    src: "/videos/hvorfor-niels.mp4#t=0.1",
    subsEn: "/videos/hvorfor-niels.en.vtt",
    heading: { da: "Hvorfor vælge Niels?", en: "Why choose Niels?" },
    ctaHref: "https://calendly.com/feilniels/15min",
    ctaText: { da: "Book gratis samtale", en: "Book a free call" },
  };

  var videoClips = [
    {
      src: "/videos/anbefaling-elias.mp4#t=0.1",
      subsEn: "/videos/anbefaling-elias.en.vtt",
      strong: { da: "Elias anbefaling", en: "Elias's recommendation" },
      span: { da: "Hvad han fik ud af forløbet.", en: "What he got out of the program." },
    },
    {
      src: "/videos/for-efter-elias.mp4#t=0.1",
      subsEn: "/videos/for-efter-elias.en.vtt",
      strong: { da: "Elias før / efter", en: "Elias before / after" },
      span: { da: "Fra kaos til mere struktur.", en: "From chaos to more structure." },
    },
    {
      src: "/videos/aziz-for-efter.mp4#t=0.1",
      subsEn: "/videos/aziz-for-efter.en.vtt",
      strong: { da: "Aziz før / efter", en: "Aziz before / after" },
      span: { da: "Konkrete ændringer i hverdagen.", en: "Concrete changes in everyday life." },
    },
    {
      src: "/videos/aziz-taknemlig.mp4#t=0.1",
      subsEn: "/videos/aziz-taknemlig.en.vtt",
      strong: { da: "Aziz taknemlig", en: "Aziz grateful" },
      span: { da: "En personlig anbefaling.", en: "A personal recommendation." },
    },
  ];

  /* Skrevne anmeldelser */
  var reviews = [
    {
      name: "Kasper",
      tag: "Efter forløbet",
      stars: 5,
      answers: [
        {
          h: "Vigtigste udbytte",
          p: "Gode vaner især om aftenen og gode træningsråd.",
        },
        {
          h: "Konkrete resultater",
          p: "Det jeg har opnået er at blive meget stærkere fra hver træning, grundet den rette struktur.",
        },
        {
          h: "Om Niels som coach",
          p: "Niels er en god coach, da han bl.a. ser en som ens ven. Han er god at snakke med, og man kan være ærlig uden han dømmer en. Han finder i stedet en plan for at komme på sporet igen.",
        },
      ],
    },
    {
      name: "Mikkel",
      tag: "Efter forløbet",
      stars: 5,
      answers: [
        { h: "Vigtigste udbytte", p: "Hjælp til vejning og træningstips." },
        {
          h: "Konkrete resultater",
          p: "At kunne mærke mit bryst bedre, og har fået styr på nogen sociale ting.",
        },
        {
          h: "Om Niels som coach",
          p: "Måden han gør det på er faktisk det jeg rigtig godt kan lide ved Niels. Han er en ung mand, der har gået gennem det samme som mig, så tror han forstår mig bedre end en anden gør. Niels har god energi og lytter på en.",
        },
      ],
    },
    {
      name: "Alfred",
      tag: "Efter forløbet",
      stars: 4,
      answers: [
        {
          h: "Vigtigste udbytte",
          p: "Jeg har haft mange gode samtaler med Niels, hvor jeg har vendt og udviklet en række idéer sammen med ham, og det har hjulpet mig til at blive mere afklaret omkring, hvilken retning jeg vil gå i mit liv.",
        },
        {
          h: "Konkrete resultater",
          p: "Jeg havde personligt ikke mange konkrete målsætninger, som for eksempel at træne fem gange om ugen. Til gengæld er jeg gennem sparringen kommet videre og har gjort fremskridt i mit liv.",
        },
        {
          h: "Om Niels som coach",
          p: "Det, jeg godt kan lide ved netop Niels, er, at han er nede på jorden, og at det føles som at tale med en ven, hvilket jeg sætter pris på.",
        },
      ],
    },
  ];

  /* Engelske oversættelser af de skrevne anmeldelser (videoerne forbliver danske) */
  var reviewsEn = [
    {
      name: "Kasper",
      tag: "After the program",
      stars: 5,
      answers: [
        {
          h: "Biggest takeaway",
          p: "Good habits, especially in the evening, and solid training advice.",
        },
        {
          h: "Concrete results",
          p: "I've gotten much stronger in every session, thanks to the right structure.",
        },
        {
          h: "About Niels as a coach",
          p: "Niels is a great coach — he sees you almost like a friend. He's easy to talk to and you can be honest without being judged; instead he finds a plan to get you back on track.",
        },
      ],
    },
    {
      name: "Mikkel",
      tag: "After the program",
      stars: 5,
      answers: [
        { h: "Biggest takeaway", p: "Help with tracking my weight, plus training tips." },
        {
          h: "Concrete results",
          p: "I can feel my chest better, and I've sorted out some social things.",
        },
        {
          h: "About Niels as a coach",
          p: "The way he does it is exactly what I like about Niels. He's a young guy who's been through the same as me, so I feel he understands me better than most. Great energy, and he really listens.",
        },
      ],
    },
    {
      name: "Alfred",
      tag: "After the program",
      stars: 4,
      answers: [
        {
          h: "Biggest takeaway",
          p: "I've had many good conversations with Niels where we explored and developed ideas together, and it's helped me get clearer about the direction I want in life.",
        },
        {
          h: "Concrete results",
          p: "I didn't have many concrete goals like training five times a week, but through the sparring I've moved forward and made real progress.",
        },
        {
          h: "About Niels as a coach",
          p: "What I like about Niels is that he's down to earth — it feels like talking to a friend, which I really appreciate.",
        },
      ],
    },
  ];

  var reviewsByLang = { da: reviews, en: reviewsEn };
  var STARS_LABEL = { da: " ud af 5 stjerner", en: " out of 5 stars" };

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function starMarkup(n) {
    var filled = "★★★★★".slice(0, n);
    var empty = n < 5 ? '<span class="empty">' + "★★★★★".slice(0, 5 - n) + "</span>" : "";
    return filled + empty;
  }

  // Vælg sprogvariant af et felt ({da, en}) — falder tilbage til dansk.
  function pick(v) {
    return v && typeof v === "object" ? (v[LANG] || v.da) : v;
  }

  // Engelske undertekster: vises kun på /en, og kun hvis en .vtt er angivet.
  function subtitleTrack(item) {
    if (LANG === "en" && item.subsEn) {
      return (
        '<track kind="subtitles" srclang="en" label="English" src="' +
        item.subsEn +
        '" default />'
      );
    }
    return "";
  }

  function renderVideoShowcase(el) {
    el.innerHTML =
      '<div class="clip-feature">' +
      '<video controls preload="metadata" playsinline>' +
      '<source src="' + videoFeature.src + '" type="video/mp4" />' +
      subtitleTrack(videoFeature) +
      "</video>" +
      "</div>" +
      '<div class="clip-side">' +
      "<h3>" + esc(pick(videoFeature.heading)) + "</h3>" +
      '<a class="btn btn-primary" href="' + videoFeature.ctaHref + '">' + esc(pick(videoFeature.ctaText)) + "</a>" +
      "</div>";
  }

  function renderVideoGrid(el) {
    el.innerHTML = videoClips
      .map(function (c) {
        return (
          '<article class="clip-card">' +
          '<video controls preload="metadata" playsinline>' +
          '<source src="' + c.src + '" type="video/mp4" />' +
          subtitleTrack(c) +
          "</video>" +
          '<div class="clip-meta">' +
          "<strong>" + esc(pick(c.strong)) + "</strong>" +
          "<span>" + esc(pick(c.span)) + "</span>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderReviews(el) {
    var starsLabel = STARS_LABEL[LANG] || STARS_LABEL.da;
    el.innerHTML = (reviewsByLang[LANG] || reviews)
      .map(function (r) {
        var answers = r.answers
          .map(function (a) {
            return (
              '<div class="review-answer"><h3>' +
              esc(a.h) +
              "</h3><p>" +
              esc(a.p) +
              "</p></div>"
            );
          })
          .join("");
        return (
          '<article class="review-card">' +
          '<div class="review-top">' +
          '<div class="review-person"><strong>' + esc(r.name) + "</strong><span>" + esc(r.tag) + "</span></div>" +
          '<div class="review-stars" aria-label="' + r.stars + esc(starsLabel) + '">' + starMarkup(r.stars) + "</div>" +
          "</div>" +
          answers +
          "</article>"
        );
      })
      .join("");
  }

  function mount() {
    var showcase = document.getElementById("tm-video-showcase");
    if (showcase) renderVideoShowcase(showcase);
    var grid = document.getElementById("tm-video-grid");
    if (grid) renderVideoGrid(grid);
    var rev = document.getElementById("tm-reviews");
    if (rev) renderReviews(rev);
  }

  // Ekspose til evt. senere brug + auto-mount ind i kendte containere.
  window.Testimonials = {
    reviews: reviews,
    videoFeature: videoFeature,
    videoClips: videoClips,
    renderReviews: renderReviews,
    renderVideoShowcase: renderVideoShowcase,
    renderVideoGrid: renderVideoGrid,
  };

  // Scriptet ligger sidst i <body>, så mount-containerne er allerede parset.
  // Mount synkront NU, så en efterfølgende scroll-reveal-observer kan nå at
  // se de renderede kort (ellers ville de sidde fast på opacity:0).
  mount();
})();
