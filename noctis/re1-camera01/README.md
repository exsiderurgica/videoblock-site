# NOCTIS — Camera 01 · Piazza del Gesù Nuovo

Prova giocabile nel browser (desktop e Android, verticale a schermo intero e orizzontale).
Telecamera fissa stile Resident Evil: sfondo dipinto + personaggio 3D in tempo reale sulla
stessa prospettiva, con collisioni, occlusioni e profondità.

## Come si gioca
- **PC:** W/S avanti e indietro, A/D ruota, SHIFT corri, E azione.
- **Touch:** joystick a sinistra (su/giù cammina, lati ruota), CORRI, AZIONE.
- `♪ AUDIO` silenzia, `↺ RIPARTI` riporta il personaggio all'inizio, `DEBUG` mostra
  area calpestabile e ostacoli.

## Cosa c'è dentro
- `index.html` — la build, da aprire o pubblicare così com'è (nessun server necessario
  oltre a uno statico: i modelli sono base64 per poter girare anche dove `.glb` non è servibile).
- `bg.jpg` — sfondo della piazza con la guglia dell'Immacolata ricostruita in 3D e fusa
  nel render (circa 16 m, prima era alta la metà).
- `hero2.txt` — protagonista, costruito dalle 4 foto di riferimento: sagome da fronte,
  retro e profilo, texture presa dalle foto stesse.
- `zombie.txt` — zombie Pulcinella: stessa pipeline, texture dipinta (camicione sporco
  e insanguinato, maschera nera, calze rosse).
- `soldier.txt` — solo per le animazioni (modello di esempio three.js, clip Mixamo
  Idle/Walk/Run): le clip vengono ritargettate sugli scheletri di cui sopra.
- `bgm.ogg` — "Notte Ambient Zorlon 01" (traccia dell'autore), ricomposta da `noctis/music/p*.bin`.
- `src/` — sorgenti separati, si ricostruisce con `src/build.sh` (concatena i pezzi in `index.html`).
- `tools/` — script che generano i modelli e la guglia (Python + Playwright, non servono a runtime).

## Note tecniche
- Calibrazione pinhole dal render: `f=900, cx=395, cy=418, altezza camera 3.26 m`;
  `src/r2.js` contiene la geometria della piazza in coordinate immagine.
- Audio: Web Audio. Musica di sottofondo molto sotto gli effetti; passi sincronizzati
  alla distanza percorsa; lamento dello zombie con flanger + chorus e strascico dei piedi.
- Lo zombie insegue il giocatore a 0,44 m/s con passo accorciato e movimento scoordinato.
