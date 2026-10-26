# CODEX MASTER PROMPT – NITO 10-Seconds Challenge
## Redesign, fullskjermmodus, live toppliste og deltakerregistrering

Du skal arbeide direkte i det eksisterende prosjektet:

`Nito10sek/`

Dette er et eksisterende prosjekt som skal forbedres, ikke et nytt prosjekt som skal bygges ved siden av det.

**Hovedmålet:** Gjør 10-Seconds Challenge til en moderne, profesjonell og responsiv konkurranseapplikasjon for bruk på en NITO-stand. Timeren skal være hovedfokuset på skjermen. Topplisten skal åpnes i en popup når brukeren ønsker det, og systemet skal registrere alle deltakere, alle forsøk og hvert enkelt resultat per deltaker.

Arbeid gjennom hele implementasjonen. Ikke stopp etter å ha laget en plan eller en statisk prototype.

---

# 1. Start med å undersøke prosjektet

Før du endrer kode:

1. Undersøk hele prosjektstrukturen.
2. Les eksisterende komponenter, sider, API-ruter, databaseoppsett, styling og konfigurasjon.
3. Identifiser hvilken funksjonalitet som allerede fungerer.
4. Kontroller om Supabase, autentisering og database allerede er konfigurert.
5. Finn ut hvordan timeren, topplisten og administrasjonspanelet fungerer i dag.
6. Identifiser eksisterende feil og manglende funksjonalitet.
7. Lag en kort intern arbeidsplan og implementer deretter løsningen.

Ikke slett eller overskriv fungerende kode uten en konkret grunn.

Behold eksisterende teknologistack dersom den allerede er egnet. Hvis prosjektet bruker Next.js, TypeScript, Tailwind CSS og Supabase, skal disse videreføres.

Ikke opprett en ny app, en alternativ prosjektmappe eller en separat prototype.

---

# 2. Designmål: En moderne NITO-konkurranse

Dagens grensesnitt bruker for mye plass på topplisten og har for lite fokus på selve konkurransen.

Redesign hele den offentlige spillvisningen.

## Visuell retning

Designet skal være:

- Moderne, minimalistisk og teknologisk.
- Profesjonelt nok til å brukes på en messe eller stand.
- Inspirert av NITOs visuelle profil.
- Optimalisert for store skjermer, berøringsskjermer og mobil.
- Lett å forstå uten forklaring fra en arrangør.
- Bygget rundt en stor, tydelig timer.

Bruk NITOs relevante merkevarefarger, primært mørk grønn, turkis, hvit og passende nøytrale bakgrunnsfarger.

Bruk den offisielle NITO-logoen fra godkjente ressurser. Bevar proporsjonene og ikke tegn logoen på nytt.

Unngå tilfeldige gradienter, overdrevne skygger, unødvendige kort og dekorasjoner som konkurrerer med timeren.

Bruk tydelig typografi, god kontrast, gjennomtenkte mellomrom og diskrete animasjoner.

Ikke påstå at NITO offisielt støtter arrangementet dersom dette ikke er bekreftet.

## Foreslått skjermlayout

På en stor skjerm skal layouten være omtrent slik:

- Toppfelt med NITO-logo, konkurransens navn og diskret status.
- Stor timer sentrert på skjermen.
- Kallenavn og status for deltakeren.
- En stor START- eller STOPP-knapp.
- Personlig rekord og siste resultat i et kompakt område.
- En diskret knapp for å åpne topplisten.
- Eventuelt en diskret lenke til administrasjon, uten å eksponere adminfunksjoner.

Timeren skal være det visuelt dominerende elementet.

Ikke vis en permanent, stor toppliste ved siden av timeren.

---

# 3. Fullskjermmodus for stand

Opprett en egen, gjennomført spillmodus som fungerer godt på en stor skjerm.

## Krav

- Bruk hele tilgjengelige skjermflaten.
- Unngå unødvendig scrolling på vanlige skjermer.
- Plasser timeren sentralt.
- Gjør START og STOPP enkle å treffe på en berøringsskjerm.
- Hold tekst og tall lesbare på avstand.
- Tilpass layouten til både liggende og stående skjermer.
- Sørg for at innholdet ikke blir beskåret på mobil.
- Bruk responsiv typografi og fleksible dimensjoner.
- Respekter redusert bevegelse dersom brukeren har aktivert dette i operativsystemet.

Implementer en knapp for fullskjerm dersom nettleseren støtter Fullscreen API.

Fullskjerm må aktiveres gjennom en eksplisitt brukerhandling, for eksempel ved å trykke «Start konkurransen i fullskjerm».

Håndter at nettleseren kan avvise fullskjermforespørselen. Applikasjonen skal fortsatt fungere uten fullskjerm.

Ikke skjul nettleserens sikkerhetsmekanismer eller forsøk å tvinge fullskjerm uten brukerens tillatelse.

---

# 4. Timeren skal være hovedfunksjonen

Timeren skal være enkel, presis og umiddelbart forståelig.

## Visning

Vis tiden med tre desimaler under forsøket, for eksempel:

`9,847`

Bruk norsk tallformat dersom det er naturlig i grensesnittet.

Vis en tydelig målmarkør for 10,000 sekunder.

Timeren skal oppdatere seg visuelt kontinuerlig, uten at oppdateringsfrekvensen påvirker den målte tiden.

## Måling

Bruk `performance.now()` for å måle tiden.

Ved START:

- Registrer starttidspunktet.
- Start den visuelle timeren.
- Endre spilltilstanden til aktivt forsøk.

Ved STOPP:

- Registrer stopptidspunktet.
- Beregn forløpt tid fra tidsstemplene.
- Stopp den visuelle oppdateringen.
- Vis det endelige resultatet.

Ikke beregn tiden ved å telle `setInterval`-intervaller.

Bruk `requestAnimationFrame` eller en annen egnet mekanisme for visuell oppdatering, men beregn alltid tiden fra tidsstemplene.

Unngå unødvendige React-renderinger og minnelekkasjer.

Ikke rund av målingen før kvalifiseringen avgjøres.

Dokumenter at nettleserbasert måling ikke kan garantere en fysisk hendelse på nøyaktig 10,000 sekunder og ikke er fullstendig beskyttet mot manipulering.

---

# 5. Vinnerregel og rangering

Dette er en fast forretningsregel og skal implementeres konsekvent i hele applikasjonen.

## Kvalifiseringsområde

Målet er 10,000 sekunder.

Et resultat kvalifiserer som et godkjent treff når den målte tiden er innenfor:

`9,900 ≤ målt tid ≤ 10,100 sekunder`

Grensene er inkludert.

Eksempler:

| Målt tid | Kvalifisert? | Avvik |
|---|---|---|
| 9,899 s | Nei | −0,101 s |
| 9,900 s | Ja | −0,100 s |
| 9,950 s | Ja | −0,050 s |
| 10,000 s | Ja | 0,000 s |
| 10,050 s | Ja | +0,050 s |
| 10,100 s | Ja | +0,100 s |
| 10,101 s | Nei | +0,101 s |

Avvik beregnes som:

`målt tid − 10,000 sekunder`

Bruk en konsistent numerisk representasjon for å unngå feil ved sammenligning av desimaltall.

Ikke bruk en avrundet visningsverdi til å avgjøre kvalifisering.

Et resultat på 10,101 sekunder skal ikke bli kvalifisert fordi skjermen viser 10,10.

## Prioritert rangering

Rangeringen skal følge denne rekkefølgen:

1. Deltakere med minst ett godkjent treff.
2. Blant kvalifiserte deltakere rangeres de med minst absolutt avvik fra 10,000 sekunder først.
3. Dersom to deltakere har samme absolutte avvik, kommer deltakeren som oppnådde sitt beste resultat først, først i rangeringen.
4. Deltakere uten godkjent treff vises etter alle kvalifiserte deltakere.
5. Blant ikke-kvalifiserte deltakere rangeres resultatene etter minst absolutt avvik fra 10,000 sekunder.
6. Ved like resultater blant ikke-kvalifiserte deltakere brukes tidspunktet for det beste forsøket som sekundært sorteringskriterium.
7. Hver deltaker skal bare vises én gang.

Nøyaktig 10,000 sekunder er det beste resultatet.

Et resultat på 9,999 sekunder er bedre enn 9,950 sekunder, selv om begge kvalifiserer.

Viktig: En kvalifisert deltaker har ikke automatisk bedre plassering enn alle andre kvalifiserte deltakere. Avviket avgjør plasseringen innenfor den kvalifiserte gruppen.

Lagre alle forsøk, ikke bare det beste.

---

# 6. Deltakerregistrering og anonym identitet

Alle deltakere skal registreres uten krav om konto.

## Registrering

Før første forsøk skal deltakeren kunne oppgi et kallenavn.

Krav:

- Kallenavnet er obligatorisk.
- Trim mellomrom i begynnelsen og slutten.
- Maksimalt 24 tegn.
- Avvis tomme navn og kontrolltegn.
- Valider på serveren.
- Ikke krev e-postadresse, telefonnummer eller fullt navn.
- Vis tydelige feilmeldinger ved ugyldig input.

## Stabil spilleridentitet

Bruk en anonym, tilfeldig generert spiller-ID som opprettes ved første registrering og lagres i nettleseren.

Bruk denne identiteten til å knytte flere forsøk til samme deltaker.

Ikke bruk kallenavnet som eneste identifikator.

Hvis deltakeren kommer tilbake i samme nettleser, skal vedkommende kunne fortsette med samme identitet.

Tillat at deltakeren endrer kallenavn gjennom en kontrollert flyt dersom dette er nødvendig, uten at historikken deles opp i flere spillere.

Hvis nettleserens lagring slettes, eller deltakeren bruker en annen enhet, kan systemet ikke automatisk garantere at dette er samme person. Dokumenter denne begrensningen.

Unngå å lagre unødvendige personopplysninger.

---

# 7. Registrer alle forsøk og beste resultat

Databasen skal lagre hele historikken.

Hvert fullførte forsøk skal registreres, også når resultatet ikke kvalifiserer.

Ikke slett tidligere forsøk når en deltaker setter en ny rekord.

## Datamodell

Viderefør eksisterende datamodell hvis den er god nok. Hvis ikke, opprett nødvendige migreringer.

### `players`

Minimumsfelter:

- `id`: UUID, primærnøkkel.
- `nickname`: kallenavn.
- `created_at`: tidspunkt for registrering.
- `updated_at`: tidspunkt for siste oppdatering dersom nødvendig.

### `attempts`

Minimumsfelter:

- `id`: UUID, primærnøkkel.
- `player_id`: fremmednøkkel til `players`.
- `elapsed_ms`: målt tid med tilstrekkelig presisjon.
- `deviation_ms`: signert avvik fra 10 000 millisekunder.
- `is_qualified`: om forsøket ligger innenfor toleransegrensen.
- `created_at`: tidspunkt for forsøket.

Bruk en egnet numerisk datatype for å bevare tilstrekkelig målepresisjon.

Hvis du bruker millisekunder, må du bevare desimaler der dette er nødvendig. Ikke lagre målinger som heltall dersom dette fører til tap av presisjon.

Opprett indekser for spiller-ID, tidspunkt og andre felt som brukes i rangering og oppslag.

Legg til nødvendige begrensninger og fremmednøkler.

## Beste resultat per spiller

Opprett en serverstyrt spørring eller databasevisning som returnerer ett beste resultat per spiller.

Den skal inkludere:

- Spiller-ID.
- Kallenavn.
- Beste målte tid.
- Avvik.
- Kvalifiseringsstatus.
- Tidspunkt for forsøket.
- Antall forsøk dersom det er nyttig.
- Eventuelt tidspunkt for første godkjente treff.

Bruk samme rangering i topplisten og administrasjonspanelet.

Ikke hent hele forsøkhistorikken til klienten for å beregne rangeringen der.

Alle forsøk skal fortsatt være tilgjengelige i databasen og i administrasjonspanelet.

---

# 8. Popup for topplisten

Dette er en sentral del av redesignet.

Den permanente topplisten fra dagens design skal fjernes fra hovedskjermen.

## Åpne topplisten

Legg til en tydelig, men visuelt diskret knapp:

`TOPPLISTE`

Når brukeren trykker på den:

- Åpne en moderne modal eller et overlegg.
- Dim bakgrunnen med en diskret mørk overflate.
- Vis rangeringen i et kompakt og lettlest panel.
- Behold tydelig NITO-profil.
- La brukeren lukke panelet med en tydelig lukkeknapp.
- Tillat lukking med Escape dersom dette er tilgjengelig.
- Sørg for at modalen fungerer på mobil og berøringsskjerm.

Ikke la popupen endre eller nullstille et aktivt forsøk.

Hvis timeren kjører når popupen åpnes, skal målingen fortsette korrekt. Sørg for at fokus, animasjoner og visuell oppdatering ikke påvirker målingen.

## Innhold i topplisten

Vis:

- Plassering.
- Kallenavn.
- Beste tid.
- Absolutt avvik fra 10,000 sekunder.
- Status: kvalifisert eller ikke kvalifisert.

Vis kvalifiserte deltakere først.

Bruk tydelige, men nøkterne markeringer for de tre beste plasseringene.

Ikke bruk overdrevne animasjoner eller effekter som gjør listen vanskelig å lese.

Vis en egen seksjon for deltakere som ikke har kvalifisert seg, under de kvalifiserte deltakerne.

Legg til en kort forklaring av reglene:

«Godkjent treff: mellom 9,900 og 10,100 sekunder. Jo nærmere 10,000 sekunder, desto bedre resultat.»

## Tom tilstand

Hvis ingen har spilt:

«Ingen resultater ennå. Start utfordringen for å komme på listen.»

Hvis det finnes forsøk, men ingen kvalifiserte deltakere:

«Ingen godkjente treff ennå. Her er de nærmeste resultatene.»

Hvis ingen kvalifiserte deltakere finnes, skal ingen feilaktig fremheves som vinner.

## Liveoppdatering

Topplisten skal oppdateres automatisk når nye forsøk registreres.

Bruk Supabase Realtime dersom eksisterende konfigurasjon støtter dette på en sikker og egnet måte.

Ellers kan du bruke kontrollert polling med et passende intervall.

Unngå unødvendige databasekall og dupliserte abonnementer.

Oppdater også listen etter administrativ sletting eller endring av resultater.

---

# 9. Resultatvisning etter hvert forsøk

Når deltakeren stopper timeren, skal det vises en tydelig resultatvisning.

Vis:

- Målt tid med tre desimaler.
- Avvik fra 10,000 sekunder.
- Om resultatet er kvalifisert.
- Deltakerens personlige rekord.
- Eventuell ny plassering.
- En knapp for nytt forsøk.

## Kvalifisert resultat

Hvis resultatet ligger innenfor toleransegrensen:

- Vis en tydelig melding om godkjent treff.
- Vis avviket.
- Vis deltakerens plassering dersom den kan hentes pålitelig.
- Oppdater topplisten.

Ikke kall deltakeren vinner dersom vedkommende bare har kvalifisert seg og andre har bedre resultater.

Bruk for eksempel «Godkjent treff» eller «Du er kvalifisert».

## Ikke-kvalifisert resultat

Hvis resultatet er utenfor grensen:

- Vis at forsøket ikke kvalifiserer.
- Vis avviket.
- Vis personlig rekord.
- Tilby et nytt forsøk.

## Nytt forsøk

Når deltakeren velger nytt forsøk:

- Behold spilleridentiteten.
- Behold kallenavnet.
- Behold all historikk.
- Nullstill bare den aktive spilltilstanden.
- La deltakeren starte umiddelbart.

Ikke krev at deltakeren registrerer seg på nytt for hvert forsøk.

---

# 10. Personlig rekord

Vis deltakerens beste resultat i et kompakt område under eller ved siden av timeren.

Eksempel:

`DIN BESTE TID: 10,037 s`

Hvis deltakeren ennå ikke har gjennomført et forsøk:

`DIN BESTE TID: –`

Oppdater rekorden når deltakeren oppnår et bedre resultat.

Personlig rekord og offentlig rangering skal bruke samme definisjon av beste resultat.

Alle tidligere forsøk skal likevel lagres.

---

# 11. Adminpanelet skal være separat

Behold eller forbedre eksisterende adminrute, for eksempel `/admin`.

Adminpanelet skal ikke vises permanent på den offentlige konkurranseskjermen.

Krev autentisering gjennom Supabase Auth og kontroller autorisasjon på serveren.

## Adminoversikt

Vis:

- Totalt antall registrerte spillere.
- Totalt antall forsøk.
- Antall kvalifiserte forsøk.
- Antall unike deltakere med kvalifiserte resultater.
- Beste resultat per spiller.
- Kallenavn.
- Målt tid og avvik.
- Tidspunkt for beste resultat.
- Antall forsøk per spiller.

## Søk og filtrering

Implementer:

- Søk etter kallenavn.
- Filtrering på kvalifiserte og ikke-kvalifiserte deltakere.
- Sortering etter rangering, tid og dato.
- Mulighet for å vise alle forsøk for en valgt spiller.
- CSV-eksport av beste resultat per spiller.
- Kontrollert sletting av spiller eller forsøk.

Sletting skal kreve bekreftelse.

Hvis en spiller slettes, må systemet håndtere tilhørende forsøk på en konsistent måte.

Ikke eksponer adminfunksjoner, private nøkler eller administrative API-er for offentlige brukere.

---

# 12. Sikkerhet og backend

Ikke stol blindt på data fra klienten.

Implementer:

- Servervalidering av kallenavn og input.
- Sikker lagring av resultater.
- Supabase Row Level Security.
- Beskyttede administratorhandlinger.
- Rate limiting på relevante endepunkter.
- Kontrollert opprettelse av spillere.
- Beskyttelse mot SQL-injeksjon og XSS.
- Generiske feilmeldinger uten sensitive detaljer.
- Ingen service role-nøkkel i klienten.

Bruk bare nødvendige miljøvariabler.

Ikke eksponer hemmeligheter i Git.

Hvis resultatet beregnes i nettleseren, dokumenter at klientbasert tid kan manipuleres. Implementer rimelige tiltak mot å sende inn åpenbart ugyldige eller oppdiktede resultater.

Ikke påstå at løsningen er juksefri.

Behold anonym deltakerregistrering. Ikke innfør obligatorisk e-post, telefon eller brukerkonto for deltakere.

---

# 13. Tilgjengelighet og ytelse

Sørg for at applikasjonen fungerer på:

- Store skjermer i liggende format.
- Bærbare PC-er.
- Nettbrett.
- Mobil.
- Berøringsskjermer.

Bruk semantiske HTML-elementer og tilgjengelige knapper.

Sørg for:

- Tydelig fokusmarkering.
- God kontrast.
- Fornuftig tastaturnavigasjon.
- Tilgjengelige etiketter.
- Forståelige feilmeldinger.
- Redusert bevegelse når dette er ønsket.
- Riktig håndtering av modal fokus.
- Ingen horisontal scrolling på vanlige skjermstørrelser.

Unngå tunge biblioteker hvis eksisterende teknologi kan løse oppgaven.

Optimaliser ytelsen uten å gjøre arkitekturen unødvendig komplisert.

---

# 14. Testing

Skriv og kjør tester for forretningsregler, databasefunksjonalitet og brukerflyt.

## Kvalifisering

Test minst:

- 9,899 sekunder er ikke kvalifisert.
- 9,900 sekunder er kvalifisert.
- 10,000 sekunder er kvalifisert og gir null avvik.
- 10,100 sekunder er kvalifisert.
- 10,101 sekunder er ikke kvalifisert.
- Visningsavrunding påvirker ikke kvalifisering.
- Absolutt avvik avgjør rangeringen blant kvalifiserte.
- Tidspunkt avgjør ved like avvik.
- Ikke-kvalifiserte deltakere rangeres etter alle kvalifiserte deltakere.

## Deltakerregistrering og historikk

Test minst:

- Ugyldige kallenavn avvises.
- Samme spiller-ID gjenbrukes i samme nettleser.
- Flere forsøk knyttes til samme spiller.
- Alle forsøk lagres.
- Beste resultat beregnes korrekt.
- Hver spiller vises bare én gang i topplisten.
- En ny rekord oppdaterer personlig rekord.
- Et dårligere nytt forsøk overskriver ikke et bedre resultat.

## UI og sikkerhet

Test minst:

- Popupen åpnes og lukkes.
- Timeren fortsetter korrekt mens popupen er åpen.
- Fullskjerm fungerer der nettleseren tillater det.
- Topplisten oppdateres etter nye resultater.
- Tom database viser en fornuftig tomtilstand.
- Adminruten avviser uautentiserte brukere.
- Offentlige brukere kan ikke slette andres forsøk.
- CSV-eksporten inneholder forventede data.
- Applikasjonen fungerer på mobil og stor skjerm.

Kjør relevante tester, linting, TypeScript-kontroll og produksjonsbygging.

Rett feil som oppstår som følge av endringene.

---

# 15. Implementasjonsrekkefølge

Arbeid i følgende rekkefølge:

1. Undersøk eksisterende prosjekt.
2. Dokumenter kort hva som må endres.
3. Implementer det nye visuelle designsystemet.
4. Bygg om spillvisningen til fullskjermorientert layout.
5. Implementer timeren og resultatvisningen.
6. Implementer popup-topplisten.
7. Implementer deltakeridentitet og registrering.
8. Implementer lagring av alle forsøk.
9. Implementer beste resultat per spiller og rangering.
10. Implementer automatisk oppdatering av topplisten.
11. Forbedre administrasjonspanelet.
12. Kontroller sikkerhet og databasepolicyer.
13. Skriv og kjør tester.
14. Kjør produksjonsbygging.
15. Oppdater README og konfigurasjonsinstruksjoner.

Prioriter en fungerende, komplett løsning fremfor dekorative detaljer.

Ikke stopp etter redesignet dersom database, historikk eller rangering fortsatt mangler.

---

# 16. Miljøvariabler og dokumentasjon

Opprett eller oppdater `.env.example` uten hemmelige verdier.

Dokumenter alle nødvendige miljøvariabler, inkludert Supabase URL og offentlig nøkkel der dette er relevant.

Oppdater README med:

- Hvordan starte prosjektet lokalt.
- Hvordan installere avhengigheter.
- Hvordan konfigurere Supabase.
- Hvordan kjøre databasemigreringer.
- Hvordan konfigurere administratorinnlogging.
- Hvordan kjøre tester.
- Hvordan bygge produksjonsversjonen.
- Hvordan deploye til Vercel.
- Hvordan feilsøke vanlige konfigurasjonsproblemer.

Ikke påstå at Supabase, autentisering eller deploy er konfigurert før dette faktisk er testet.

Hvis nødvendige tilganger mangler, fullfør alt som kan gjøres lokalt, og dokumenter de konkrete manuelle stegene som gjenstår.

---

# 17. Ferdigkriterier

Oppgaven er ikke ferdig før følgende er oppfylt:

- Den offentlige spillvisningen er visuelt redesignet.
- Timeren er det dominerende elementet.
- Topplisten er skjult til brukeren åpner popupen.
- Deltakere kan registreres uten konto.
- Samme deltaker kan gjøre flere forsøk.
- Alle forsøk lagres permanent i databasen.
- Hver deltaker vises én gang i topplisten.
- Beste resultat per spiller beregnes korrekt.
- Toleransegrensen er nøyaktig 9,900–10,100 sekunder, inkludert grensene.
- Kvalifiserte deltakere rangeres foran ikke-kvalifiserte.
- Mindre absolutt avvik gir bedre plassering.
- Tidspunkt avgjør ved like avvik.
- Topplisten oppdateres automatisk.
- Adminpanelet er separat og beskyttet.
- Tester og produksjonsbygging er gjennomført.
- README og `.env.example` er oppdatert.

## Sluttrapport

Når implementasjonen er ferdig, rapporter:

1. Hvilke filer som ble opprettet eller endret.
2. Hvilke funksjoner som er implementert.
3. Hvordan rangering og toleransegrense fungerer.
4. Hvilke databasedeler og migreringer som ble lagt til.
5. Hvilke tester og bygg som ble kjørt, og resultatene.
6. Hvilken manuell konfigurasjon som eventuelt gjenstår.

Ikke rapporter funksjoner som ferdige dersom de ikke er implementert og kontrollert.

**Start med å undersøke prosjektmappen `Nito10sek/`, og implementer løsningen direkte i den eksisterende kodebasen.**
