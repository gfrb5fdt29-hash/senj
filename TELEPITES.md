# Senj útikalauz — közzététel és telepítés

## 1. Feltöltés GitHubra (egyszer kell)

1. GitHubon hozz létre egy új, **Public** repositoryt (a név szabadon választható, pl. `senj-utikalauz`).
2. A repo oldalán: **Add file → Upload files** → húzd be ennek a zipnek a **teljes kicsomagolt tartalmát**
   (az `index.html` a repo gyökerébe kerüljön, ne almappába).
3. Commit után: **Settings → Pages** → „Build and deployment" alatt Source: **Deploy from a branch**,
   Branch: **main**, mappa: **/ (root)** → Save.
4. Pár perc múlva él az oldal: `https://<felhasználónév>.github.io/<repo-név>/`

Minden útvonal relatív, ezért bármilyen repo-név alatt működik, átnevezés után is.

## 2. Telepítés iPhone-ra

1. Nyisd meg a fenti címet **Safariban**.
2. Koppints a **Megosztás** gombra (négyzet felfelé nyíllal).
3. Válaszd: **Főképernyőhöz adás** → **Hozzáadás**.
4. A főképernyőről indítva teljes képernyős, appszerű élményt kapsz.

## 3. Mit tud offline?

- Az összes hely, lista, gyűjtemény, keresés és kedvencek **internet nélkül is működik**
  (első megnyitás után automatikusan eltárolódik).
- A térkép csempéi és a Google Maps útvonaltervezés internetkapcsolatot igényel —
  offline a térkép helyett a listákat érdemes használni.
- Tipp: ha pár hétig nem használod, az iPhone törölheti a mentett adatokat és a kedvenceket —
  online megnyitáskor minden automatikusan visszatöltődik (a kedvencek kivételével).

## 4. Frissítés később

Ha új adatfájl vagy módosítás készül: töltsd fel az új fájlokat a repóba (felülírva a régieket),
és a `sw.js` első sorában lévő verziószámot írd át (pl. `senj-utikalauz-v2`) — a telefonokon a
következő online megnyitáskor magától frissül.
