# Nito10sek – ønsker, leveranse og endringslogg

**Prosjektmappe:** `Nito10sek/`

**Fullstendig siste masterprompt:** [`MASTERPROMPT.md`](./MASTERPROMPT.md)
**Status:** Lokal implementasjon og kontroller er fullført. Supabase og Vercel er ikke konfigurert eller tilkoblet.

## Ønskene dine

- Lag en moderne, responsiv og profesjonell NITO-inspirert standutfordring der timeren er hovedfokus.
- Bruk den offisielle NITO-logoen med korrekte proporsjoner, uten å hevde at NITO har godkjent arrangementet.
- La timeren vise tre desimaler og måle med `performance.now()`.
- Kvalifiser målinger innenfor **9,900–10,100 sekunder, inkludert grensene**. Avrunding skal ikke påvirke kvalifisering.
- Sorter kvalifiserte først, deretter etter minst absolutt avvik; ved likt avvik kommer det tidligste beste forsøket først. Ikke-kvalifiserte vises etter kvalifiserte.
- Registrer deltakere anonymt med stabil nettleser-ID, behold kallenavn og lagre alle forsøk.
- Vis personlig rekord, resultat, avvik og eventuell plassering. Åpne topplisten i en modal når den etterspørres.
- Lag et separat, autentisert adminpanel med statistikk, søk, filter, sortering, forsøkhistorikk, CSV og kontrollert sletting.
- Bruk servervalidering, Supabase RLS, rate limiting, tester og dokumentasjon. Ikke påstå at tidtakingen er manipulasjonssikker.

## Dette er implementert

- Timerfokusert, responsiv spillflate med stor tid, kallenavn, status, fullskjermknapp og berøringsvennlig start/stopp.
- Norsk tidsvisning med tre desimaler; måling skjer fra start-/stopptidsstempler med `performance.now()`.
- Kvalifiseringsregel på 9 900–10 100 ms og signert avvik. Resultater avgjøres av råmålingen, ikke vist avrunding.
- Modal toppliste med kvalifiserte og nærmeste resultater, Escape-/lukkeknapp, tomtilstander, statusmerker, podiummarkeringer og polling hvert femte sekund mens modalen er åpen.
- Offentlig toppliste viser opptil 100 deltakere, én rad per deltaker med beste forsøk. Lokal testmodus har bekreftet nullstilling av alle testresultater i gjeldende nettleser.
- Tilfeldig spiller-ID i nettleserlagring, servervalidering av kallenavn og kontrollert kallenavnoppdatering uten å dele opp spillerhistorikken.
- Egen standflyt: første person registrerer kallenavn og starter; «Nytt forsøk» beholder samme deltaker, mens «Neste deltaker» lager ny ID og tømmer navnefeltet. Tidligere lokale deltakerprofiler kan velges for å fortsette en kjent identitet.
- Supabase-migrering for spillere, alle forsøk, spilløkter, rate limits og adminbrukere. Databasen beregner avvik, kvalifisering og eksakt 10 000 ms.
- Databasevisning med beste forsøk per spiller, plassering, antall forsøk og tidspunkt for første kvalifisering.
- Serverruter for forberedelse, start og innsending av forsøk, offentlig toppliste og adminoperasjoner.
- Adminoversikt med deltaker-/forsøksstatistikk, rangering, kvalifiseringsfilter, søk, sortering, full forsøkhistorikk, CSV og bekreftet sletting.
- Supabase Auth-kontroll på server, HTTPOnly-cookies, Origin-sjekk, rate limits, RLS, CSP og sikkerhetsheadere.
- Tester for terskelverdier, uavrundet måling, avvik, rekkefølge, beste forsøk, unike spillere, kallenavn og admin-tilgang; ESLint er satt opp for kildekode og tester.
- Lokal testmodus når Supabase mangler: forsøk vises i topplisten i samme nettleser, med tydelig beskjed om at de ikke er permanent lagret.
- Sletting av lokale testdeltakere fra topplistemodalen med bekreftelse. Permanente spillere og forsøk slettes fortsatt gjennom det autentiserte adminpanelet.
- Oppdatert [`README.md`](./README.md), `.env.example` og denne oversikten. Den fullstendige masterprompten er lagret i [`MASTERPROMPT.md`](./MASTERPROMPT.md).

## Filområder

- Spillflate og modal: `src/components/challenge.tsx`, `src/components/leaderboard.tsx`, `src/app/globals.css`
- Spilleregler: `src/lib/challenge.ts`
- API: `src/app/api/game/`, `src/app/api/leaderboard/`, `src/app/api/admin/`
- Database: `supabase/migrations/202610250001_initial_schema.sql`
- Tester: `tests/`
- Prosjektoppsett og veiledning: `package.json`, `.env.example`, `README.md`, `OVERSIKT.md`, `MASTERPROMPT.md`
- Offisiell NITO-logo: `public/nito-logo-primary-deep.png`, hentet fra [NITOs logoside](https://nye.nito.no/dette-er-nito/presse-og-media/nitos-logo/).

## Verifisering og begrensninger

- TypeScript-kontroll: bestått.
- Tester: 25 bestått.
- ESLint: bestått uten lintfeil.
- Produksjonsbygging: bestått.
- Desktop-/mobilnettlesersjekk: to lokale testdeltakere ble vist med riktige forsøkstall; én kunne slettes mens den andre ble igjen; timeren fortsatte mens modal var åpen; Escape lukket og returnerte fokus; ny deltaker fikk ny ID; tidligere profil kunne gjenopptas uten å forskyve timeren; mobil hadde ingen horisontal scrolling.
- Nettleserkontroll: 120 lokale deltakere ga 100 viste rader (60 kvalifiserte og 40 nærmeste ikke-kvalifiserte); alle radene hadde unik deltaker. Nullstilling tømte listen og lokal forsøkshistorikk. Engangstilbakestilling fjernet 26. oktober-data i Europe/Oslo og beholdt gårsdagens forsøk. Mobilvisningen ved 390 px hadde ingen horisontal scrolling. API-et svarer `configured: false`, så data deles bare i samme nettleser til Supabase er konfigurert.
- Supabase-migrering og Auth: ikke kjørt mot faktisk prosjekt fordi tilkoblingsverdier mangler.
- Vercel: ikke deployet.

## Gjenstår for å ta løsningen i bruk

1. Fyll inn verdier fra et Supabase-prosjekt i `.env.local` eller Vercel-innstillinger.
2. Kjør migreringen `supabase/migrations/202610250001_initial_schema.sql`.
3. Opprett Supabase Auth-administrator og registrer brukerens UUID i `public.admin_users`.
4. Test registrering, lagring, toppliste, admin, CSV og sletting mot Supabase.
5. Deploy til Vercel og kontroller miljøvariabler og produksjonsflyt.

## Endringslogg

- **2026-10-25:** Opprettet prosjektet i `Nito10sek/`, hentet offisiell NITO-logo og la til Next.js/TypeScript/Tailwind, API-/databasegrunnlag, adminflyt og sikkerhetsoppsett.
- **2026-10-25:** La til første `OVERSIKT.md`, README, Supabase-migrering, tester og adminvisning.
- **2026-10-26:** Leste ny masterprompt og lagret den som `MASTERPROMPT.md`. Endret regel fra kun eksakt 10 000 ms til godkjent intervall 9 900–10 100 ms; oppdaterte signert avvik, sortering, skjermdesign, modal toppliste, personlig rekord, deltakerstatistikk og adminhistorikk.
- **2026-10-26:** La til ny deltaker-/fortsett deltaker-flyt for felles standmaskin. Nettlesersjekk bekreftet stabil ID, ny ID til neste deltaker, gjenopptak av forrige profil, 10,000 ms kvalifisering, timer under åpen modal, Escape/fokusretur og ingen horisontal scrolling på 390 px mobil.
- **2026-10-26:** Utvidet toppliste-API-et til alle deltakere og oppdatering hvert femte sekund når modalen er åpen. La til lokal sletting for testdeltakere. TypeScript-kontroll, 21 tester, ESLint og produksjonsbygging passerer.
- **2026-10-26:** Undersøkte tom toppliste i brukerens test. API-et svarte `configured: false`. La til tydelig lokal testmodus for å vise lokale testforsøk i topplisten; permanent/felles lagring krever fortsatt Supabase. Tester for lokal forsøkhistorikk er lagt til.
- **2026-10-26:** Rettet runtime-feil i tastaturbehandleren ved å kontrollere at `event.key` er en tekstverdi før `toLowerCase()` kalles. Kontrollert med en nettleserhendelse der `key` mangler; ingen sidefeil. Lint, TypeScript, 21 tester og produksjonsbygging passerer.
- **2026-10-26:** Kontrollerte topplisten med to lokale deltakere; begge vises i samme nettleser. API-et returnerer `configured: false`, fordi Supabase mangler. Økte IP-basert rate limit for standtrafikk fra 40 til 300 klargjøringer/innsendinger og fra 80 til 600 starter per 10 minutter, samt topplistekall fra 120 til 600 per minutt. Lint, TypeScript og 21 tester passerer etter endringen. Ingen grense på antall topplistedeltakere.
- **2026-10-26:** Utvidet offentlig toppliste til opptil 100 deltakere, én rad per deltaker; API-et prioriterer kvalifiserte og fyller resten med nærmeste ikke-kvalifiserte. La til bekreftet nullstilling av lokale testresultater i gjeldende nettleser og en engangs fjerning av lokale forsøk fra 26. oktober 2026 i Europe/Oslo. Modalen ble utvidet til 1 040 px bredde og 94 % av skjermhøyden. TypeScript, lint, 25 tester og produksjonsbygging passerer.
- **2026-10-26:** Publiserte prosjektet på [GitHub](https://github.com/moali-143/-Nito10sek), gren `main`. Koden er tilgjengelig for kollegaer å klone. Supabase er ikke konfigurert; lokale resultater deles ikke mellom PC-er.
