# nielswahlberg.dk/klinik

Statisk side for Niels Wahlberg — behandlingssider til danske tandklinikker.

Ingen build, intet framework, ingen eksterne scripts (kun Google Fonts).
Filerne kan lægges direkte på en hvilken som helst statisk host.

## Mappestruktur

Hele siden ligger i mappen `klinik/`, så den kan serveres på stien
`nielswahlberg.dk/klinik/`:

    klinik/
      index.html            one-pageren (forsiden)
      tandregulering.html   demo-behandlingsside (skabelon til klinikker)
      niels-portrait.png    portræt i headeren
      foer.jpg / efter.jpg  før/efter-fotos i demoens slider

Alle links mellem filerne er relative, så de virker uændret uanset hvor
mappen ligger, så længe den serveres med afsluttende skråstreg (`/klinik/`).

## Vigtigt: dette ligger nu på **roddomænet**

Alle absolutte URL'er i siden (Open Graph, canonical) peger på
`https://nielswahlberg.dk/klinik/`. Skal stien skiftes, ændres det kun to
steder i toppen af `klinik/index.html`.

Fordi siden nu ligger på en **sti** under roddomænet — ikke på et
underdomæne — skal den serveres af **samme host som `nielswahlberg.dk`**.
Man kan ikke pege et separat projekt på en sti på et eksisterende domæne,
sådan som man kan med et underdomæne. Se deploy nedenfor.

## Deploy — tre muligheder

1. **Læg mappen ind hos den nuværende host.** Driver noget allerede
   `nielswahlberg.dk`, så upload `klinik/`-mappen dertil, så den svarer på
   `/klinik/`. Det er den enkleste vej hvis du har adgang til den host.

2. **Cloudflare Pages + proxy-regel.** Ligger `nielswahlberg.dk` bag
   Cloudflare, kan et separat Pages-projekt med denne mappe kobles på stien
   `/klinik/*` via en Cloudflare-regel (Rules → Redirect/Rewrite eller en
   Worker der proxier `/klinik/*` til `<projekt>.pages.dev`).

3. **Behold underdomænet.** Vil du undgå at røre roddomænet, kan siden i
   stedet ligge på `klinik.nielswahlberg.dk` (ét CNAME-record på `klinik`,
   roddomænets `A`/`AAAA`/`MX` uændret). Så skal canonical/og:url i
   `index.html` blot sættes tilbage til `https://klinik.nielswahlberg.dk/`.

## Kontaktinfo (allerede udfyldt)

- Telefon: **+45 60 88 06 18**
- Mail: **feilniels@gmail.com**
- Firma: **Niels Wahlberg**, CVR **46655443**
- Adresse: **Frederiksgade 71, 1. sal, 8000 Aarhus C**

## Lokal forhåndsvisning

    node _serve.js

og åbn `http://127.0.0.1:8787/klinik/`.
