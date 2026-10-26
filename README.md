# Nito10sek

En responsiv konkurranseflate for 10-sekundersutfordringen. Timeren er hovedfokus, topplisten åpnes i en modal, deltakere identifiseres anonymt per nettleser, og serveren lagrer alle forsøk når Supabase er konfigurert.

Prosjektet bruker Next.js App Router, TypeScript strict mode, Tailwind CSS, Supabase PostgreSQL og Supabase Auth. Det er ikke koblet til en faktisk Supabase-instans eller publisert på Vercel ennå.

## Lokal oppstart

Krever Node.js 20.9 eller nyere. Hent prosjektet fra [GitHub](https://github.com/moali-143/-Nito10sek):

```bash
git clone https://github.com/moali-143/-Nito10sek.git
cd -- -Nito10sek
npm ci --legacy-peer-deps
npm run dev
```

Åpne `http://localhost:3000`. For lokal forhåndsvisning skal `.env.local` ikke opprettes. Uten Supabase-verdier fungerer lokal testmodus: forsøk vises i topplista i samme nettleser, og testdeltakere kan slettes enkeltvis eller nullstilles samlet etter bekreftelse. Den første oppdaterte sidelastingen nullstiller også lokale testresultater fra 26.10.2026 i tidssonen Europe/Oslo. Resultatene sendes ikke til en database eller andre enheter. For en felles toppliste på flere PC-er må Supabase konfigureres nedenfor. Lockfilen bruker npm sin legacy peer resolver på grunn av en Arborist-feil i npm 10 under opprinnelig installasjon.

## Supabase-oppsett

1. Opprett et Supabase-prosjekt.
2. Kjør `supabase/migrations/202610250001_initial_schema.sql` i SQL Editor, eller legg migreringen inn i Supabase CLI-prosjektet og kjør `supabase db push`.
3. Kopier Project URL, publishable/anon key og `service_role`-nøkkel fra Supabase Project Settings → API til `.env.local`.
4. Generer to forskjellige serverhemmeligheter, for eksempel `openssl rand -base64 48`, for `GAME_TOKEN_SECRET` og `RATE_LIMIT_SECRET`.
5. Opprett administratorbruker i Supabase Auth. Slå av offentlig registrering hvis administratorer skal inviteres.
6. Finn Auth-brukerens UUID og legg den til i adminlisten:

```sql
insert into public.admin_users (user_id)
values ('AUTH_USER_UUID');
```

RLS er aktivert på databasetabellene. Anonyme klienter får ikke direkte tilgang til spiller-, forsøks- eller admin-data. Serverrutene validerer data og bruker service-role-nøkkelen. Denne nøkkelen skal aldri få `NEXT_PUBLIC_`-prefiks eller lagres i Git.

## Miljøvariabler

Se `.env.example` for mal uten hemmelige verdier.

| Variabel | Bruk |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-prosjektets URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Offentlig Supabase-nøkkel for Auth-klienten |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only databaseoperasjoner |
| `GAME_TOKEN_SECRET` | Signering av tidsbegrensede forsøkssesjoner |
| `RATE_LIMIT_SECRET` | HMAC-salting av rate-limit-nøkkelen |
| `NEXT_PUBLIC_SITE_URL` | Kanonisk URL for Origin-kontroll og admin-redirect |

## Spilleregler og lagring

- Målet er 10 000 ms. Et forsøk kvalifiserer hvis den fullpresise målingen er `9 900 ≤ elapsed_ms ≤ 10 100`, inkludert grensene.
- Avviket lagres med fortegn som `elapsed_ms - 10 000`. Rangering bruker absolutt avvik; nærmest 10 000 kommer først. Ved likt avvik kommer det tidligste beste forsøket først.
- Kvalifiserte deltakere kommer før ikke-kvalifiserte. En deltaker vises én gang, med sitt beste forsøk. 10 000 ms er det best mulige resultatet.
- Den offentlige topplisten viser opptil 100 deltakere, én rad per deltaker med vedkommendes beste forsøk. Den oppdateres når et lokalt forsøk lagres, og poller hvert femte sekund mens modalvinduet er åpent.
- Skjermen viser tre desimaler og bruker norsk komma. Avrundet skjermtekst avgjør aldri kvalifisering.
- Timeren bruker `performance.now()` for måling. `requestAnimationFrame` oppdaterer bare visningen.
- Alle fullførte forsøk lagres i `attempts`, også forsøk uten kvalifisering. Personlig rekord og offentlig rangering bruker samme databasevisning.
- Uten Supabase lagres testforsøk bare i nettleserens lokale lagring for forhåndsvisning. De er synlige på denne maskinen og må ikke forveksles med permanent eller felles lagring. Topplistemodalen har en bekreftet knapp for å nullstille alle lokale testforsøk i den nettleseren.
- Spiller-ID er tilfeldig og lagres i nettleserens lokale lagring. Historikken følger denne identiteten i samme nettleserprofil; slettet lagring eller en annen enhet kan ikke automatisk kobles til samme person.
- På en delt standmaskin: skriv kallenavn og trykk **START** for å registrere første deltaker. Etter resultatet beholder **NYTT FORSØK** samme person og historikk. Trykk **Neste deltaker · nytt kallenavn** for å gi neste person en ny ID og blankt navn. Tidligere lokale profiler kan velges under «Fortsett som tidligere deltaker».
- Nettlesermåling er ikke jukssikker og beviser ikke fysisk presisjon. Serveren bruker signert økttoken, tidsgrense, engangsinnsending og sammenligner målingen med økttiden for å avvise åpenbart ugyldige forsøk.

## Admin

`/admin/login` bruker Supabase Auth. Serveren kontrollerer også at brukeren finnes i `admin_users`. Adminoversikten viser deltaker- og forsøksstatistikk, rangering, søk, kvalifiseringsfilter og sortering. Hver deltaker kan utvides for å vise hele forsøkhistorikken. CSV-eksporten inneholder beste resultat per deltaker. Sletting krever bekreftelse; sletting av en spiller fjerner alle tilhørende forsøk gjennom fremmednøkkelens cascade-regel.

## Kontroller

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

Automatiske tester dekker toleransegrensene, avrundingsuavhengig kvalifisering, signert avvik, rangering, beste forsøk per spiller, kallenavn og avvisning av uautorisert adminlesing/sletting. Desktop- og mobilflyt er også gjennomgått i nettleser. Databaseintegrasjon, Supabase Auth og faktisk adminflyt må verifiseres mot et konfigurert prosjekt.

## Vercel

Importer mappen `Nito10sek` i Vercel. Legg inn alle verdiene i `.env.example` i Project Settings → Environment Variables, kjør migreringen i Supabase, og deploy. Sett `NEXT_PUBLIC_SITE_URL` til produksjonsdomenet. Etter publisering må du verifisere forsøk, toppliste, admininnlogging, sletting og CSV med en testadministrator. Ingen deploy er utført fra denne arbeidsøkten.

## Logo

`public/nito-logo-primary-deep.png` er NITOs offisielle primærlogo fra [NITOs logoside](https://nye.nito.no/dette-er-nito/presse-og-media/nitos-logo/), brukt med originale proporsjoner. Siden omtaler konkurransen som en frittstående standaktivitet og hevder ikke at NITO har godkjent arrangementet.
