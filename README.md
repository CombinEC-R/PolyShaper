# Polygon Coordinate Tool

Browser Tool zum Laden eines Bildes und Erstellen von Polygon Shapes per Klick. Fokus auf sauberes Editieren, verlässliches Pan und Zoom, ein klar definiertes Koordinatensystem mit Ursprung, sowie stabile Exporte für Weiterverarbeitung.

## Features

### Bild und Canvas
- Drag and Drop oder Datei auswählen
- High DPI Rendering für scharfes Canvas
- Pan per Space plus Drag oder Mitteltaste Drag
- Zoom per Mausrad um den Mauszeiger
- Zoombar Slider mit Prozentanzeige und Plus Minus
- Fit to Screen und Reset View

### Shapes und Punkte
- Mehrere Shapes in einer Layer Liste
- Shape anlegen, duplizieren, löschen, Punkte leeren
- Aktivieren durch Klick in der Liste
- Rename per Doppelklick auf den Namen
- Punkte setzen per Klick
- Punkte selektieren, verschieben, löschen
- Multi Select und Box Select
- Insert on Edge zum Einfügen eines Punktes auf einer Kante
- Nudge per Pfeiltasten, optional schneller mit Shift
- Reorder von Punkten

### Koordinatensystem
- Sichtbare Achsen für X und Y mit Tick Marks und Labels
- Ursprung frei positionierbar, Achsen Snapping möglich
- Zahlen Labels sind immer kontrastisch zum Hintergrund durch Halo und optional Backplate
- Umschalter für Y Mode
  - Math Mode, Y positiv nach oben
  - GPU Mode, Y positiv nach unten, nach oben wird negativ
- Center Snap des Achsenkreuzes auf Punkte, stabil mit Hysterese

### Snapping
- Enable Snapping Toggle
- Magnetisches Verhalten mit snap in und snap out
- Alt hält Snapping temporär aus
- Punkt Snapping beim Platzieren und beim Verschieben
  - an Achsen X0 und Y0
  - an andere Punkte
  - an Kanten Projektion auf Segment
- Preview vor dem Platzieren
  - Marker am Snap Ziel, optional pulsierender Ring
- Snap Scope Option
  - Active Shape only
  - Active plus Hovered
  - All visible unlocked

### Polygon Move und Centering
- Ctrl oder Cmd Drag verschiebt das komplette aktive Polygon
- Button zum Zentrieren des aktiven Polygons auf World 0,0 ohne Formänderung

### Export und Import
- JSON und CSV Copy und Download
- Dezimalstellen Einsteller für Export, Standard 2
- Export Modus Auswahl
  - absolute, Punkte im aktuellen World Koordinatensystem
  - centered, Polygon Center auf 0,0
  - 0 centered, erster Punkt auf 0,0
- Pro Shape nur eine points Liste im Export, basierend auf Modus und Dezimals
- Optional Project JSON Import und Autosave, abhängig von Projektkonfiguration

## Projektstruktur

Kein Single File Monolith. Sauber getrennte Bereiche für UI, Rendering, Input, State, Geometrie, Snapping und IO.

Empfohlene Gliederung
- index.html
- styles
- src
  - state
  - view
  - canvas
  - input
  - geometry
  - snap
  - io
  - ui

## Setup

Kein Build Tool nötig. Es reicht ein lokaler Static Server, weil Browser bei file Scheme teils zickt, vor allem Clipboard.

Python Beispiel
```bash
python3 -m http.server 8000
```

Dann im Browser öffnen
- http://localhost:8000

## Bedienung

### Maus
- Linksklick auf leere Fläche setzt Punkt
- Drag auf Punkt verschiebt Punkt
- Shift plus Klick erweitert Selection
- Shift plus Drag Box Select
- Alt hält Snapping aus
- Space plus Drag pannt den View
- Mausrad zoomt um den Mauszeiger

### Tastatur
- Delete oder Backspace löscht selektierte Punkte
- Ctrl Z undo
- Ctrl Y redo
- Ctrl A selektiert alle Punkte im aktiven Shape
- Ctrl Shift A selektiert alle Punkte in allen sichtbaren unlocked Shapes
- Tab wechselt Shape, Shift Tab rückwärts

## Export Formate

### JSON
- coord enthält originPxX originPxY pixelsPerUnit yMode
- export enthält mode und decimals
- shapes enthält id name closed points

### CSV
- Standard aktives Shape
- Zeilenformat x,y

## Entwicklung

Regel für Änderungen
- Keine Regressionen, bestehende Interaktionen dürfen nicht verschwinden
- Neue Features additiv integrieren
- Transform Logik bleibt sauber getrennt zwischen View und Coord
- Snapping Entscheidungen immer in Screen Pixeln für konsistentes Gefühl bei Zoom

## Lizenz

Dieses Projekt ist unter der MIT License veröffentlicht. Du darfst es kostenlos für alles nutzen, kopieren, verändern, veröffentlichen, vertreiben und auch kommerziell verwenden, solange der Copyright Hinweis und die Lizenz im Code bzw. in abgeleiteten Werken erhalten bleiben.

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
