/* ============================================================
   Fælles kilde til testimonials + anmeldelser.
   Bruges af både index.html (forsiden) og tak.html, så
   indholdet kun skal vedligeholdes ét sted.

   Rediger data herunder — markup og styling genbruges 1:1.
   ============================================================ */
(function () {
  "use strict";

  /* Video-testimonials (klip-sektionen på forsiden) */
  var videoFeature = {
    src: "/videos/hvorfor-niels.mp4#t=0.1",
    heading: "Hvorfor vælge Niels?",
    ctaHref: "https://calendly.com/feilniels/15min",
    ctaText: "Book gratis samtale",
  };

  var videoClips = [
    {
      src: "/videos/anbefaling-elias.mp4#t=0.1",
      strong: "Elias anbefaling",
      span: "Hvad han fik ud af forløbet.",
    },
    {
      src: "/videos/for-efter-elias.mp4#t=0.1",
      strong: "Elias før / efter",
      span: "Fra kaos til mere struktur.",
    },
    {
      src: "/videos/aziz-for-efter.mp4#t=0.1",
      strong: "Aziz før / efter",
      span: "Konkrete ændringer i hverdagen.",
    },
    {
      src: "/videos/aziz-taknemlig.mp4#t=0.1",
      strong: "Aziz taknemlig",
      span: "En personlig anbefaling.",
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

  function renderVideoShowcase(el) {
    el.innerHTML =
      '<div class="clip-feature">' +
      '<video controls preload="metadata" playsinline>' +
      '<source src="' + videoFeature.src + '" type="video/mp4" />' +
      "</video>" +
      "</div>" +
      '<div class="clip-side">' +
      "<h3>" + esc(videoFeature.heading) + "</h3>" +
      '<a class="btn btn-primary" href="' + videoFeature.ctaHref + '">' + esc(videoFeature.ctaText) + "</a>" +
      "</div>";
  }

  function renderVideoGrid(el) {
    el.innerHTML = videoClips
      .map(function (c) {
        return (
          '<article class="clip-card">' +
          '<video controls preload="metadata" playsinline>' +
          '<source src="' + c.src + '" type="video/mp4" />' +
          "</video>" +
          '<div class="clip-meta">' +
          "<strong>" + esc(c.strong) + "</strong>" +
          "<span>" + esc(c.span) + "</span>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderReviews(el) {
    el.innerHTML = reviews
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
          '<div class="review-stars" aria-label="' + r.stars + ' ud af 5 stjerner">' + starMarkup(r.stars) + "</div>" +
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
