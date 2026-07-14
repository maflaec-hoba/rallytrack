# RallyTrack – Rövid alkalmazásötlet

A **RallyTrack** egy mobile-first, PWA-alapú alkalmazás veterán autós túrák követésére, távolság- és időmérésre, valamint az itiner használatának támogatására.

Az alkalmazás mobiltelefonon fut, telepíthető a kezdőképernyőre, és internetkapcsolat nélkül is teljes értékűen használható.

## Túrák kezelése

A felhasználó új túrát indíthat, követhet és lezárhat.

Túra közben az alkalmazás:

- méri a teljes megtett távolságot
- mutatja az eltelt időt
- rögzíti a GPS-útvonalat
- kijelzi az aktuális és az átlagsebességet

A lezárt túrák később visszanézhetők, beleértve az útvonalat, a távolságokat, az időadatokat és a kapcsolódó itinert.

## Trip Counter

A túrán belül használható egy külön nullázható Trip Counter.

**Megjelenített adatok:**

- Trip távolság
- Trip idő
- Trip átlagsebesség
- GPS alapján mért távolság
- Kalibrált (Autó Odometer) távolság

**Funkciók:**

- Trip nullázása
- Távolság korrekció (+10/-10 és +100/-100 méter)
- Kalibráció alkalmazása

## Odometer-kalibráció

A felhasználó megadhatja, hogy egy kalibrációs szakaszon mennyit mért az alkalmazás GPS alapján, és mennyit mutatott az autó kilométerórája.

Az alkalmazás automatikusan kiszámítja a kalibrációs arányt, és menet közben egyszerre mutatja:

- GPS távolság
- Kalibrált (Autó Odometer) távolság

A kalibráció autóprofilként elmenthető, így több jármű vagy gumiméret is kezelhető.

## Itiner

A túrához itiner csatolható.

Lehetőségek:

- PDF feltöltése
- Papír alapú itiner lefotózása
- Oldalankénti lapozás
- Offline megtekintés

## Stopper

Századmásodperces stopper regularity feladatokhoz.

- Start
- Stop
- Reset
- 1/100 mp pontosság
- Opcionális köridők

## Nagyméretű megjelenítés

Menet közben választható egy egyszerű, nagy kontrasztú navigátor nézet.

Megjelenített adatok:

- Trip távolság
- Kalibrált odometer
- Eltelt idő
- Átlagsebesség
- Aktuális sebesség

## Offline működés

A RallyTrack mobile-first PWA-ként készül.

- Telepíthető mobilra
- Teljes képernyőn fut
- Internet nélkül is működik
- Offline rögzíti a GPS-adatokat és a túrákat
- Az itinerek és a korábbi túrák helyben tárolhatók
- Internetkapcsolat esetén szinkronizálható

## Export

A lezárt túrák exportálhatók:

- GPX
- CSV
- PDF

Az export tartalmazhatja:

- Túra adatai
- Útvonal
- Időadatok
- Távolságok
- Átlagsebességek
- Kalibrációs adatok
