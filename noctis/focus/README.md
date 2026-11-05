# NOCTIS / Piazza del Gesù — focus architettonico 3D, test 2026-11-05

Questo **non è un gioco** né una scansione 3D. È un test browser WebGL separato, costruito a partire dall'atlante OSM pubblicato su `/noctis/atlas/`.

## Cosa è verificato

- 121 impronte di edifici e 47 tracciati OSM dell'atlante esistente.
- La parete frontale della chiesa è orientata lungo un segmento della sua impronta reale OSM (segmento su Piazza del Gesù).
- La fotografia della facciata (Wittylama, CC BY-SA 4.0) viene ritagliata e trattata per ottenere una texture notturna con trasparenza del cielo.
- Il bugnato è aggiunto tramite una superficie triangolata con lievi sporgenze 3D; il resto della chiesa ha ancora volumi OSM e quote approssimative.
- Una guglia di studio alta circa 30 m è collocata **in posizione indicativa**, ancora non rilevata.
- Lo sfondo usa sagome OSM senza dettagli artistici. La pavimentazione usa materiale già prodotto per il prototipo NOCTIS, **non una foto autentica** della piazza.

## Limitazioni

- Non è la qualità grafica obiettivo vista nel video di riferimento. Non ci sono ancora facciate circostanti curate, animazioni e personaggio.
- Le fotografie possono mostrare pedoni e cartelli diurni; richiedono sostituzione con texture d'ambiente editorialmente pulite.
- Alcuni controlli funzionano come esploratore di studio (orbita e zoom), non come controller di survival horror.
- Il test automatico del browser ha verificato la pianta 2D e la sintassi del JS, ma **non** il rendering WebGL: Chromium dell'ambiente ha WebGL non disponibile. La vista 3D deve essere provata su Android.

## Licenze

Geodati: © OpenStreetMap contributors, Open Database License 1.0. https://www.openstreetmap.org/copyright
Foto: Wittylama, *Facade of Chiesa del Gesù Nuovo*, Wikimedia Commons, CC BY-SA 4.0. https://commons.wikimedia.org/wiki/File:Facade_of_Chiesa_del_Ges%C3%B9_Nuovo.jpg
La fotografia è stata ritagliata, scurita e quantizzata a 256 colori; non è una texture fotogrammetrica.