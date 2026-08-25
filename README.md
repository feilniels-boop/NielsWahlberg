# klinik.nielswahlberg.dk

Statisk one-pager for Niels Wahlberg — behandlingssider til danske tandklinikker.

Ét selvstændigt `index.html`. Ingen build, intet framework, ingen eksterne
scripts (kun Google Fonts). Filen kan lægges direkte på en hvilken som helst
statisk host.

## Vigtigt: dette er et **underdomæne**

Siden hører hjemme på:

    klinik.nielswahlberg.dk

Rodddomænet `nielswahlberg.dk` er optaget af noget andet og **må ikke røres**.
Alle absolutte URL'er i siden (Open Graph, canonical) peger allerede på
`https://klinik.nielswahlberg.dk/`. Skal domænet skiftes, ændres det kun ét
sted i `index.html`.

## Før den går live

Tre pladsholdere i `index.html` skal udfyldes (søg efter `TODO:`):

- **Telefonnummer** — både i `href="tel:…"` og i den synlige tekst
- **Firmanavn** — i footeren
- **CVR-nummer** — i footeren

Mailadressen `niels@nielswahlberg.dk` er allerede skrevet ind.

## Deploy på Cloudflare Pages (underdomæne)

1. Opret et Cloudflare Pages-projekt og enten upload mappen direkte eller
   forbind git-repoet.
2. Under **Custom domains** i Pages-projektet, tilføj `klinik.nielswahlberg.dk`.
3. DNS:
   - Ligger DNS for `nielswahlberg.dk` **allerede hos Cloudflare**, opretter
     Cloudflare selv den nødvendige CNAME-record for `klinik`.
   - Ligger DNS hos **en anden udbyder**, opret manuelt én CNAME-record hos
     dem, fra `klinik` til det `<projekt>.pages.dev`-domæne Cloudflare tildeler.

## Rør ikke rodddomænet

Der tilføjes **kun én ny CNAME-record på `klinik`**. Rodddomænets eksisterende
records — `A`, `AAAA` og især `MX` — bliver stående uændret. Der oprettes ingen
redirects eller referencer til roden fra denne side.

Mailen på `nielswahlberg.dk` (fx `niels@nielswahlberg.dk`) kører videre helt
uændret: e-mail styres af domænets `MX`-records, som hører til roden og ikke
påvirkes af at et underdomæne peger et andet sted hen.
