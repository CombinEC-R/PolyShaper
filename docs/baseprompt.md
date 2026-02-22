Du bist ein sehr erfahrener Frontend-Engineer (UX + Canvas/Geometry). Baue eine lauffähige Single-Page-Webapp (Prototyp), die lokal im Browser läuft. KEIN Backend. Liefere am Ende KOMPLETTEN CODE als eine einzelne HTML-Datei (mit eingebettetem CSS + JS), so dass ich sie direkt speichern und öffnen kann.

ZIEL: Tool zum Laden eines Bildes, Setzen/Löschen/Verschieben von Polygonpunkten, Anzeige eines transparenten Polygon-Overlays, korrekte Koordinaten-Ausgabe in einem skalierbaren Koordinatensystem mit frei setzbarem Ursprung, plus Pan/Zoom mit ZOOMBAR (SEHR WICHTIG).

MUSS-FEATURES (funktional):
1) Bild laden:
   - Drag & Drop in die App ODER Datei-Button.
   - Bild wird im Haupt-Canvas angezeigt.

2) Canvas-Interaktion (Bearbeitungsmodus):
   - Linksklick: Punkt setzen.
   - Klick auf Punkt: selektieren.
   - Punkt ziehen: Punkt verschieben (Drag).
   - Entf/Backspace: selektierten Punkt löschen.
   - Rechtsklick auf Punkt: Punkt löschen (Contextmenu unterdrücken).
   - ESC: Auswahl aufheben.
   - Undo/Redo: Strg+Z / Strg+Y (oder Strg+Shift+Z).

3) Polygon Overlay:
   - Verbinde Punkte in Reihenfolge.
   - Transparentes Fill + sichtbare Outline.
   - Optional Toggle: “Polygon schließen” (letzter->erster).
   - Punkte als kleine Marker; optional Index-Label.

4) Pan & Zoom (WICHTIG):
   - Canvas/Viewport zoombar und verschiebbar.
   - Mausrad zoomt um den Mauszeiger (nicht nur um die Mitte).
   - Pan per: Space+Drag ODER mittlere Maustaste Drag.
   - FIT-Button: Bild ins Viewport einpassen.
   - RESET-Button: Zoom/Pan zurücksetzen.
   - ZOOMBAR GANZ WICHTIG: sichtbarer Slider (z.B. 10% bis 800% oder 20x) + Prozentanzeige + +/- Buttons.

5) Achsen / Mittellinien:
   - Eine horizontale und eine vertikale Linie als Achsen (Crosshair), die den Koordinaten-Ursprung markieren.
   - Linien über dem Bild/Overlay sichtbar, aber nicht zu dick (UI-tauglich).
   - Die Linien sollen sich korrekt mit dem Bild mitbewegen, weil sie in “Weltkoordinaten” zur Origin-Position gehören.

6) Koordinatensystem (skalierbar) + Ursprung:
   - Der Ursprung (0,0) soll frei festlegbar sein:
     a) Standard: Bildmitte (empfohlen).
     b) Button “Set Origin”: danach Klick ins Bild setzt Origin an diese Stelle.
     c) Zusätzlich numerische Inputs: Origin X/Y in Bild-Pixeln oder in Weltunits (deine Wahl, aber konsistent).
   - Skalierung des Koordinatensystems:
     - Ein Control “Units per Pixel” ODER “Pixels per Unit”.
     - Beim Ändern der Skalierung dürfen sich die gesetzten Punkte NICHT auf dem Bild verschieben (sie bleiben in Bildpixeln gleich), aber die ausgegebenen Weltkoordinaten müssen sich korrekt neu berechnen.
   - Achsenrichtung definieren und klar machen:
     - Welt-X nach rechts positiv.
     - Welt-Y nach oben positiv (also invertiert zur Canvas-Y).
   - Formel/Mapping:
     - Punkte intern in Bildpixeln speichern: (px, py) relativ zum Bild.
     - Weltkoordinaten berechnen aus Origin + Scale (und Y-Invert):
       worldX = (px - originPxX) / pixelsPerUnit
       worldY = (originPxY - py) / pixelsPerUnit
     - Wenn du UnitsPerPixel nimmst, entsprechend invertieren (sauber dokumentieren).

7) Punktliste / Export:
   - Rechte Seitenleiste: Tabelle/Liste der Punkte:
     - Index
     - Pixelkoordinaten (px, py)
     - Weltkoordinaten (x, y) mit 2–3 Dezimalen
   - Button “Copy JSON” kopiert z.B.:
     { origin: {pxX, pxY}, pixelsPerUnit, pointsPx: [...], pointsWorld: [...] }
   - Button “Copy CSV” kopiert Weltkoordinaten als “x,y” pro Zeile.
   - Optional: Import JSON, um weiterzuarbeiten.

QUALITY OF LIFE (bitte wirklich einbauen, nicht nur erwähnen):
- Snapping Toggle (optional): Snap auf Raster oder auf Achsen (z.B. Shift hält Y oder X konstant).
- “Nearest point highlight” beim Hover.
- Zoom-to-cursor smooth (requestAnimationFrame/Throttle).
- High-DPI (devicePixelRatio) korrekt (Canvas scharf).
- Autosave in localStorage (Bild nicht zwingend, aber Punkte/Settings).
- Statuszeile unten: aktueller Mauspunkt in Weltkoordinaten + aktueller Zoom.
- Shortcuts anzeigen (kleines Help-Overlay “?”).
- Robust gegen Resize (Canvas passt sich an).

UI-LAYOUT:
- Linke Seite: großer Canvas-Bereich (maximaler Platz).
- Rechte Seite: Controls (Load, Fit/Reset, Zoombar, Origin/Scale, Point list, Copy buttons).
- Oben: kleine Toolbar (Mode toggle falls nötig).

TECHNISCHE ANFORDERUNGEN:
- Vanilla JS (ES6), keine externen Libraries.
- Alles in einer HTML-Datei.
- Klare Struktur: State (image, viewportTransform, origin, scale, points, selection, history).
- Saubere Trennung:
  - viewTransform: pan + zoom für Darstellung
  - worldTransform: origin + pixelsPerUnit für Koordinaten-Ausgabe
- Keine “magischen Zahlen” ohne Kommentar.
- Keine toten Buttons: alles muss funktionieren.

ABNAHMEKRITERIEN (selbst testen, bevor du ausgibst):
- Ich kann ein Bild reinziehen, reinzoomen per Slider und Mausrad, pannen, Punkte setzen, Punkte löschen, Punkte verschieben.
- Polygon bleibt korrekt auf dem Bild bei Pan/Zoom.
- Weltkoordinaten ändern sich korrekt, wenn ich origin oder scale ändere, ohne dass sich Pixelpunkte verschieben.
- Copy JSON/CSV liefert sinnvolle Werte.

Gib zuerst eine kurze Erklärung der Bedienung + Shortcuts (max 10 Zeilen), dann den vollständigen HTML-Code.