/* Zrno po zrno – sadržaj (prema skripti „Osnovni nivo“).
   Tipovi koraka: story, explore, clip, game, mc, tf, num, order, match, sort, hotspot.
   Tekst podržava **podebljano**. */
window.ZPZ = window.ZPZ || {};

ZPZ.PASS = 0.8;        // prag za završni test (80%)
ZPZ.EXAM_SIZE = 20;    // broj pitanja na završnom testu
ZPZ.DAILY_GOAL = 50;   // dnevni cilj u zrnima

ZPZ.PARTS = [
  { title: "Deo 1 · Zrno", mods: ["m1", "m2"] },
  { title: "Deo 2 · Oprema", mods: ["m3", "m4"] },
  { title: "Deo 3 · Espresso", mods: ["m5", "m6"] },
  { title: "Deo 4 · Filter i mleko", mods: ["m7", "m8"] }
];

ZPZ.RANKS = [
  { min: 0, t: "Zeleno zrno" },
  { min: 120, t: "Prženo zrno" },
  { min: 300, t: "Prvi šot" },
  { min: 550, t: "Šef mlina" },
  { min: 850, t: "Latte artista" },
  { min: 1200, t: "Spreman za bar" }
];

ZPZ.BADGES = [
  { id: "first", t: "Prvi gutljaj", d: "Završi prvi nivo." },
  { id: "perfect", t: "Bez greške", d: "Završi nivo bez ijedne greške." },
  { id: "combo5", t: "Niz od 5", d: "Pet tačnih odgovora zaredom." },
  { id: "streak3", t: "Tri dana zaredom", d: "Uči tri dana u nizu." },
  { id: "half", t: "Pola puta", d: "Završi četiri nivoa." },
  { id: "dial", t: "Dial-in majstor", d: "Uštimaj šot u igri Uštimaj mlin." },
  { id: "swipe", t: "Brzi prsti", d: "Osvoji 15+ poena u Brzoj rundi." },
  { id: "milk", t: "Kralj pare", d: "Spenuj mleko sa 3 zvezdice." },
  { id: "latte", t: "Srce iz prve", d: "Nacrtaj srce sa 3 zvezdice." },
  { id: "recipe", t: "Recept-mašina", d: "Složi tri recepta bez greške." },
  { id: "allstars", t: "Sve zvezdice", d: "Tri zvezdice na svih 8 nivoa." },
  { id: "ready", t: "Spreman za kurs", d: "Položi završni test." }
];

ZPZ.MODULES = [
  /* ───────────────────────── NIVO 1 ───────────────────────── */
  {
    id: "m1", n: 1, title: "Priča o kafi", icon: "leaf", color: "#277C4D", min: 6,
    desc: "Legenda o Kaldiju, put kafe kroz svet i biljka koja sve pokreće.",
    steps: [
      { t: "story", img: "img/kaldi.jpg", title: "Kaldi i razigrane koze",
        text: "Etiopija, 9. vek. Pastir **Kaldi** iz oblasti Kafa primećuje da su mu koze pune energije kad pojedu crvene bobice sa jednog žbuna. Toliko da noću neće da spavaju. Tako, kaže legenda, počinje priča o kafi.",
        remember: "Legenda: pastir Kaldi, Etiopija, 9. vek" },
      { t: "story", img: "img/qahveh.jpg", title: "Jemen: prve kuće kafe",
        text: "Najraniji zapisi kažu da je **Jemen** prvi počeo da gaji, prži i prodaje kafu. Napitak su zvali **qahwa**, a mesta gde se pio **qahveh khaneh**, kuće kafe. To su preci današnjih kafića.",
        remember: "Jemen: prvi uzgoj, prženje i trgovina · qahwa" },
      { t: "mc", q: "Odakle dolazi ime „kafa“?",
        opts: ["Od jemenske reči qahwa", "Od italijanskog caffè", "Od imena pastira Kaldija", "Od imena brazilskog grada"], a: 0,
        why: "Jemenci su napitak zvali qahwa, a Evropljani su po tome dali ime biljci." },
      { t: "story", title: "Kafa kreće u svet",
        list: [
          { y: "17. vek", t: "Holanđani prvi iznose zrna iz Arabije i sade ih u Bataviji (danas Indonezija), pa na Sumatri i Sulavesiju." },
          { y: "17. vek", t: "Putnici sa Bliskog istoka donose priče o tamnom napitku i kafa postaje hit u Evropi." },
          { y: "1723.", t: "Oficir Gabriel de Clieu nosi seme na Martinik. Za 50 godina tamo raste 18 miliona stabala." },
          { y: "Brazil", t: "Francisco de Mello Palheta donosi seme skriveno u buketu i pokreće globalnu industriju." }
        ],
        remember: "Holanđani prvi iznose kafu iz Arabije · De Clieu → Martinik, 1723." },
      { t: "order", q: "Poređaj priču kafe, od najstarijeg događaja",
        items: ["Kaldi i koze u Etiopiji", "Jemen: qahwa i kuće kafe", "Holanđani sade kafu u Indoneziji", "De Clieu nosi kafu na Martinik"],
        why: "Etiopija (legenda, 9. vek) → Jemen → Holanđani (17. vek) → Martinik (1723.)." },
      { t: "story", img: "img/grana.jpg", fit: "contain", bg: "#fff", title: "Upoznaj biljku",
        text: "Kafa je zimzelena biljka roda **Coffea** iz porodice **Rubiaceae**. Na plantažama se orezuje na **3–5 m** da bi se lakše brala, a inače može da naraste i do 12 m. Najbolje uspeva na **15–30 °C**.",
        remember: "Coffea · porodica Rubiaceae · orezuje se na 3–5 m" },
      { t: "tf", q: "Na istoj grani kafe mogu istovremeno da budu i zrele i nezrele trešnje.", a: true,
        why: "Biljka rađa u kontinuiranom ciklusu, pa su na grani često i crvene i zelene trešnje." },
      { t: "story", img: "img/tresnje-grana.jpg", title: "Brojke za pamćenje",
        text: "Trešnji treba oko **godinu dana** da sazri. Drvo pun potencijal dostiže za oko 5 godina, najbolje rađa **od 7. do 20. godine**, a može da poživi i 100. Za **1 kg kafe** treba **5–6 kg trešanja**, oko 8.800 komada.",
        remember: "5–6 kg trešanja = 1 kg kafe" },
      { t: "num", q: "Koliko kilograma trešanja treba za 1 kg kafe?", min: 1, max: 12, step: 1, unit: "kg", a: [5, 6], start: 2,
        why: "Za 1 kg kafe treba 5–6 kg trešanja, odnosno oko 8.800 bobica." },
      { t: "story", img: "img/pojas.jpg", title: "Pojas kafe",
        text: "Kafa raste samo u pojasu između **25° severno i 30° južno**. Treba joj bogato zemljište, umerena temperatura, povremena kiša i hlad.",
        remember: "Pojas kafe: 25° severno – 30° južno" },
      { t: "mc", q: "U kojoj zemlji kafa NE može da raste na otvorenom?",
        opts: ["Norveška", "Kolumbija", "Etiopija", "Vijetnam"], a: 0,
        why: "Norveška je daleko izvan pojasa kafe. Ostale tri zemlje su veliki proizvođači kafe." }
    ],
    pool: [
      { t: "mc", q: "Kojoj porodici biljaka pripada kafa?", opts: ["Rubiaceae", "Rosaceae", "Fabaceae", "Solanaceae"], a: 0, why: "Kafa (Coffea) pripada porodici Rubiaceae." },
      { t: "mc", q: "U kom veku je, po legendi, Kaldi otkrio kafu?", opts: ["9. veku", "5. veku", "13. veku", "17. veku"], a: 0, why: "Legenda smešta Kaldija u Etiopiju, u 9. vek." },
      { t: "mc", q: "Na koju visinu se orezuje drvo kafe na plantaži?", opts: ["3–5 m", "Do 1 m", "8–10 m", "12–15 m"], a: 0, why: "Orezuje se na 3–5 m, zbog energije drveta i lakše berbe." },
      { t: "mc", q: "Koliko treba trešnji kafe da sazri?", opts: ["Oko godinu dana", "Oko mesec dana", "Oko tri meseca", "Oko pet godina"], a: 0, why: "Trešnjama treba oko godinu dana da sazru." },
      { t: "tf", q: "Holanđani su prvi izneli zrna kafe izvan Arabije.", a: true, why: "Holanđani su prvi preneli zrna i uzgajali kafu u Bataviji." },
      { t: "tf", q: "Drvo kafe najbolje rađa u prvoj godini.", a: false, why: "Najbolje plodove daje između 7. i 20. godine." },
      { t: "mc", q: "Ko je 1723. preneo kafu na Martinik?", opts: ["Gabriel de Clieu", "Francisco de Mello Palheta", "Angelo Moriondo", "Pastir Kaldi"], a: 0, why: "Oficir Gabriel de Clieu, uprkos piratima i lošem vremenu." }
    ],
    swipe: [
      ["Kaldi je bio pastir iz Etiopije.", true],
      ["Jemen je prvi počeo da prži i prodaje kafu.", true],
      ["Drvo kafe se na plantažama orezuje na 3–5 m.", true],
      ["Kafa može da raste na otvorenom u Skandinaviji.", false],
      ["Za 1 kg kafe treba oko 8.800 trešanja.", true],
      ["Kafa pripada porodici Rubiaceae.", true],
      ["De Clieu je kafu doneo na Martinik 1923.", false],
      ["Drvo kafe može da živi i do 100 godina.", true]
    ]
  },

  /* ───────────────────────── NIVO 2 ───────────────────────── */
  {
    id: "m2", n: 2, title: "Od trešnje do zrna", icon: "cherry", color: "#D7263D", min: 8,
    desc: "Šest slojeva trešnje, arabika protiv robuste i kako se zrno obrađuje.",
    steps: [
      { t: "explore", art: "cherry", title: "Preseci trešnju",
        text: "U svakoj trešnji krije se **6 slojeva**. Tapni svaki sloj i upoznaj ga.",
        remember: "Opna → pulpa → sluz → parčment → srebrna opna → zrno" },
      { t: "order", q: "Poređaj slojeve trešnje, od spolja ka unutra",
        items: ["Spoljašnja opna", "Pulpa", "Sluz (musilaž)", "Parčment", "Srebrna opna", "Zeleno zrno"],
        why: "Spolja ka unutra: opna, pulpa, sluz, parčment, srebrna opna i na kraju zeleno zrno." },
      { t: "story", img: "img/arabika-robusta.jpg", fit: "contain", bg: "#fff", title: "Arabika ili robusta?",
        text: "Postoji preko 100 vrsta biljke Coffea, ali svet uglavnom pije dve: **arabiku** i **canephoru (robustu)**. Arabika voli visinu i blažu klimu, robusta toplinu i niže predele.",
        remember: "Arabika: 900–2000 m, 15–25 °C · Robusta: 0–900 m, 20–30 °C" },
      { t: "story", art: "beans2", title: "Zašto specialty bira arabiku",
        text: "Arabika ima složeniju aromu (voćne, cvetne i čokoladne note), više šećera i **manje kofeina** od robuste. Robusta ima jednostavniji ukus i daje **jaču, čvršću kremu** u espresu.",
        remember: "Arabika = složen ukus, manje kofeina" },
      { t: "sort", q: "Arabika ili robusta?", left: "Arabika", right: "Robusta",
        items: [["44 hromozoma", 0], ["22 hromozoma", 1], ["Raste na 900–2000 m", 0], ["Raste na 0–900 m", 1], ["Idealno 15–25 °C", 0], ["Idealno 20–30 °C", 1], ["Dubok koren", 0], ["Plitak koren, traži 2000–3000 mm kiše", 1], ["15–17% masti", 0], ["Jača i čvršća krema", 1]],
        why: "Arabika: 44 hromozoma, viši predeli, 15–25 °C, dubok koren. Robusta: 22 hromozoma, niže i toplije, plitak koren." },
      { t: "story", img: "img/berba.jpg", title: "Od sadnice do berbe",
        text: "Sadnica raste u hladu oko **9 meseci**, pa se sa 10–16 listova presađuje na plantažu u kišnoj sezoni. Stablo procveta posle **3–4 godine**. Berba je ručna ili mašinska, jednom ili dvaput godišnje.",
        remember: "Ručna selektivna berba = bolji kvalitet" },
      { t: "mc", q: "Zašto ručna berba daje bolju kafu?",
        opts: ["Beru se samo zrele trešnje", "Brža je od mašinske", "Trešnje su veće", "Ne treba im obrada"], a: 0,
        why: "Mašina pokupi i zrele i nezrele plodove. Ručna berba traži više vremena i znanja, ali bira samo zrelo." },
      { t: "story", img: "img/prirodna.jpg", title: "Prirodna (suva) obrada",
        text: "Cele trešnje se suše na izdignutim **krevetima** i okreću više puta dnevno, nedeljama, dok zrno ne dođe do **12% vlage**. Na kesi piše **natural**. Ukus: **čokoladno i slatko**.",
        remember: "Natural: suši se cela trešnja do 12% vlage" },
      { t: "story", img: "img/prana.jpg", title: "Prana obrada",
        text: "Mašina skine opnu i pulpu, a zrno sa sluzi **fermentiše u vodi 10–30 sati**. Na kesi piše **washed**. Ukus: **kiselost, citrus, voće**. Preduga fermentacija daje previše kiselu kafu.",
        remember: "Washed: fermentacija u vodi 10–30 h" },
      { t: "sort", q: "Natural ili washed?", left: "Natural", right: "Washed",
        items: [["Suši se cela trešnja na krevetima", 0], ["Fermentiše u vodi 10–30 h", 1], ["Čokoladni i slatki ukusi", 0], ["Citrusne i voćne note", 1], ["Suši se do 12% vlage", 0], ["Opna i pulpa se skidaju mašinom", 1], ["Taman srednji rez prženog zrna", 0]],
        why: "Natural je suva obrada cele trešnje. Washed znači skidanje pulpe i fermentaciju u vodi." },
      { t: "tf", q: "Preduga fermentacija može da napravi previše kiselu kafu.", a: true,
        why: "Kiselost je poželjna samo do neke mere. Preduga fermentacija je greška u obradi." }
    ],
    pool: [
      { t: "mc", q: "Koji sloj trešnje je odmah ispod pulpe?", opts: ["Sluz (musilaž)", "Parčment", "Srebrna opna", "Zeleno zrno"], a: 0, why: "Redosled: opna, pulpa, sluz, parčment, srebrna opna, zrno." },
      { t: "mc", q: "Koliko hromozoma ima arabika?", opts: ["44", "22", "12", "88"], a: 0, why: "Arabika ima 44, robusta 22 hromozoma." },
      { t: "mc", q: "Do koliko vlage se suši zrno u prirodnoj obradi?", opts: ["12%", "2%", "25%", "50%"], a: 0, why: "Suši se dok zrno ne dostigne 12% vlage." },
      { t: "mc", q: "Koliko traje fermentacija kod prane obrade?", opts: ["10–30 sati", "1–2 sata", "3–5 dana", "Dve nedelje"], a: 0, why: "Fermentacija u vodi traje 10–30 sati." },
      { t: "tf", q: "Robusta ima više šećera od arabike.", a: false, why: "Arabika ima 6–9% šećera, robusta 3–7%." },
      { t: "tf", q: "Mašinska berba pokupi i zrele i nezrele plodove.", a: true, why: "Zato je ručna selektivna berba kvalitetnija." },
      { t: "mc", q: "Posle koliko godina stablo arabike procveta?", opts: ["3–4", "1", "10", "20"], a: 0, why: "Stablo procveta posle 3–4 godine." }
    ],
    swipe: [
      ["Arabika ima 44 hromozoma.", true],
      ["Robusta raste na većim visinama od arabike.", false],
      ["Natural kafe su često slatke i čokoladne.", true],
      ["Kod prane obrade cela trešnja se suši na suncu.", false],
      ["Srebrna opna je sloj odmah uz zeleno zrno.", true],
      ["Arabika ima manje kofeina od robuste.", true],
      ["Ručna berba je brža od mašinske.", false],
      ["Robusta daje jaču i čvršću kremu.", true]
    ]
  },

  /* ───────────────────────── NIVO 3 ───────────────────────── */
  {
    id: "m3", n: 3, title: "Espresso aparat", icon: "machine", color: "#55697F", min: 7,
    desc: "Od parne mašine do E61: pritisak, bojleri i predinfuzija.",
    steps: [
      { t: "story", img: "img/aparati-istorija.jpg", fit: "contain", bg: "#fff", title: "Od pare do pumpe",
        text: "**1884.** Angelo Moriondo patentira parnu mašinu. **1905.** Desiderio Pavoni kupuje Bezzerin patent i pravi **La Ideale**. **1947.** Achille Gaggia uvodi ručnu polugu i predinfuziju. **1961.** **FAEMA E61** donosi električnu pumpu i termosifon.",
        remember: "1884. Moriondo · 1905. La Ideale · 1947. Gaggia · 1961. E61" },
      { t: "order", q: "Poređaj aparate po godini nastanka",
        items: ["Moriondo – parna mašina", "Bezzera i Pavoni – La Ideale", "Gaggia – ručna poluga", "FAEMA E61 – električna pumpa"],
        why: "1884. → 1905. → 1947. → 1961." },
      { t: "story", art: "pressure4", title: "Četiri načina da napraviš pritisak",
        list: [
          { y: "Para", t: "prvi i jeftiniji modeli" },
          { y: "Klip", t: "ručna poluga, uveo je Gaggia" },
          { y: "El. pumpa", t: "stabilan pritisak, prva je FAEMA E61" },
          { y: "Vazduh", t: "kompresovani vazduh, od 2007." }
        ],
        remember: "Para · klip · električna pumpa · vazdušna pumpa" },
      { t: "match", q: "Spoji način rada i pronalazak",
        pairs: [["Para", "Moriondo, 1884."], ["Ručni klip", "Gaggia, 1947."], ["Električna pumpa", "FAEMA E61, 1961."], ["Vazdušna pumpa", "Od 2007."]] },
      { t: "story", img: "img/bojleri.jpg", fit: "contain", bg: "#fff", title: "Dva bojlera, dva posla",
        text: "**Protočni bojler** je za espresso: voda **88–95 °C**, pritisak **8–9 bara**. **Akumulacioni bojler** daje paru i vruću vodu: do **120 °C**, a stimer radi na oko **1 bar**.",
        remember: "Espresso: 88–95 °C i 8–9 bara · para: do 120 °C, ~1 bar" },
      { t: "num", q: "Koliki je pritisak pri ekstrakciji espresa?", min: 1, max: 15, step: 0.5, unit: "bar", a: [8, 9], start: 3,
        why: "Protočni bojler radi na 8–9 bara." },
      { t: "num", q: "Na kojoj temperaturi je voda za espresso?", min: 70, max: 120, step: 1, unit: "°C", a: [88, 95], start: 75,
        why: "Protočni bojler drži 88–95 °C." },
      { t: "story", art: "machine", title: "Pre nego što upališ aparat",
        text: "Uvek prvo proveri **dovod vode**. Ako aparat povuče vazduh, mogu da se oštete unutrašnji delovi. Mnogi aparati imaju automatski on/off i **stand-by** režim kad se ne koriste.",
        remember: "Pre paljenja: proveri dovod vode" },
      { t: "clip", clip: "preinf", title: "Predinfuzija protiv kanalisanja",
        text: "Na početku ekstrakcije voda pod niskim pritiskom (**oko 3 bara**) polako natopi kolač kafe. Tako se ne prave **kanali**, pukotine kroz koje voda pobegne. Kod Gaggie traje oko 10 s: 5 s punjenje i 5 s natapanje.",
        remember: "Predinfuzija: ~3 bara, sprečava kanalisanje" },
      { t: "story", img: "img/predinfuzija.jpg", fit: "contain", bg: "#fff", title: "Pogledaj presek",
        text: "Levo je ekstrakcija sa predinfuzijom: ceo kolač je natopljen i mlaz je ravnomeran. Desno je **kanalisanje**: voda je probila pukotinu i jurnula kroz nju, a ostatak kafe je ostao neiskorišćen." },
      { t: "mc", q: "Čemu služi predinfuzija?",
        opts: ["Ravnomerno natapa kolač i sprečava kanalisanje", "Hladi kafu pre ekstrakcije", "Pravi više mlečne pene", "Ubrzava mlevenje"], a: 0,
        why: "Postepeno natapanje pod ~3 bara priprema zrna i sprečava kanale." },
      { t: "tf", q: "Akumulacioni bojler služi za ekstrakciju espresa.", a: false,
        why: "Za espresso je protočni bojler. Akumulacioni daje paru i vruću vodu." }
    ],
    pool: [
      { t: "mc", q: "Ko je 1947. napravio mašinu sa ručnom polugom?", opts: ["Achille Gaggia", "Angelo Moriondo", "Luigi Bezzera", "Desiderio Pavoni"], a: 0, why: "Achille Gaggia, 1947." },
      { t: "mc", q: "Kako se zvala mašina koju je Pavoni komercijalizovao 1905?", opts: ["La Ideale", "E61", "La Gaggia", "Moka"], a: 0, why: "La Ideale je postavila standard ranih aparata." },
      { t: "mc", q: "Koji aparat je prvi imao električnu pumpu?", opts: ["FAEMA E61", "La Ideale", "Gaggijina mašina", "Moriondova mašina"], a: 0, why: "FAEMA E61 iz 1961." },
      { t: "mc", q: "Koliki je pritisak predinfuzije?", opts: ["Oko 3 bara", "Oko 9 bara", "Oko 1 bar", "Oko 15 bara"], a: 0, why: "Predinfuzija ide pod znatno manjim pritiskom, oko 3 bara." },
      { t: "mc", q: "Do koje temperature ide akumulacioni bojler?", opts: ["Do 120 °C", "Do 95 °C", "Do 60 °C", "Do 200 °C"], a: 0, why: "Akumulacioni bojler ide do 120 °C." },
      { t: "tf", q: "Kanalisanje znači da voda ravnomerno prolazi kroz kolač.", a: false, why: "Kanalisanje je kad voda nađe prečicu kroz pukotinu u kolaču." },
      { t: "tf", q: "Vazdušna pumpa koristi kompresovani vazduh.", a: true, why: "Tako radi, a razvijena je od 2007." },
      { t: "mc", q: "Koliko otprilike traje predinfuzija na Gaggijinoj mašini?", opts: ["Oko 10 s", "Oko 1 s", "Oko 30 s", "Oko 1 min"], a: 0, why: "Oko 5 s punjenje komore i još oko 5 s natapanje." }
    ],
    swipe: [
      ["FAEMA E61 je uvela električnu pumpu.", true],
      ["Espresso se pravi vodom od oko 120 °C.", false],
      ["Stimer radi na pritisku od oko 1 bar.", true],
      ["Predinfuzija ide pod punim pritiskom od 9 bara.", false],
      ["Pre paljenja aparata treba proveriti dovod vode.", true],
      ["Moriondo je patentirao svoju mašinu 1884.", true],
      ["Gaggia je uveo predinfuziju.", true],
      ["Protočni bojler daje paru za mleko.", false]
    ]
  },

  /* ───────────────────────── NIVO 4 ───────────────────────── */
  {
    id: "m4", n: 4, title: "Mlin i granulacija", icon: "grinder", color: "#7B4A2D", min: 9,
    desc: "FINE ili COARSE, delovi mlina i mlinovi sa kojima ćeš raditi.",
    steps: [
      { t: "explore", art: "grinder", title: "Delovi mlina",
        text: "Tapni delove mlina. Sve počinje u silosu, a završava u portafilteru.",
        remember: "Silos drži zrna · noževi melju · držač drži portafilter" },
      { t: "hotspot", art: "grinder", q: "Pronađi delove mlina",
        ask: [{ part: "silos", q: "Tapni silos" }, { part: "nozevi", q: "Gde su noževi?" }, { part: "drzac", q: "Tapni držač za portafilter" }] },
      { t: "story", img: "img/mlin-delovi.jpg", fit: "contain", bg: "#fff", title: "Pravi mlin, isti delovi",
        text: "Ovako isti delovi izgledaju na pravom espresso mlinu. Noževi mogu biti **konusni** ili **ravni** (flat).",
        remember: "Noževi su konusni ili ravni (flat)" },
      { t: "story", img: "img/granulacija.jpg", fit: "contain", bg: "#fff", title: "FINE ili COARSE",
        text: "Što su **noževi bliže**, kafa je **sitnija** (FINE). Što su **dalje**, kafa je **krupnija** (COARSE). Na mlinu to piše kao brojevi ili kao FINE i COARSE.",
        remember: "Noževi bliže = sitnije" },
      { t: "clip", clip: "silos", title: "Zašto granulacija menja protok",
        text: "Zamisli dva silosa: jedan pun zrna, drugi pun sitno mlevene kafe. Voda kroz zrna proleti, a kroz prah se probija polako, jer je **manje prostora između čestica**.",
        remember: "Sitnije = sporiji protok · krupnije = brži protok" },
      { t: "mc", q: "Šot ti curi prebrzo. Šta radiš?",
        opts: ["Pomeram noževe ka FINE (sitnije)", "Pomeram noževe ka COARSE (krupnije)", "Sipam više vode", "Ništa, brže je bolje"], a: 0,
        why: "Brz protok znači da je kafa prekrupna. Sitnija kafa usporava vodu." },
      { t: "mc", q: "Šot curi presporo, kap po kap. Šta radiš?",
        opts: ["Pomeram noževe ka COARSE (krupnije)", "Pomeram noževe ka FINE (sitnije)", "Jače tampujem", "Gasim aparat"], a: 0,
        why: "Spor protok znači da je kafa presitna. Krupnija kafa pušta vodu brže." },
      { t: "story", title: "Tri vrste mlinova",
        gallery: [{ img: "img/mlin-manuelni.jpg", cap: "Manuelni" }, { img: "img/mlin-poluautomatski.jpg", cap: "Poluautomatski" }, { img: "img/mlin-automatski.jpg", cap: "Automatski" }],
        text: "**Manuelni**: melješ ručno, okretanjem ručice. **Poluautomatski**: melje sam, a ti povlačenjem ručice doziraš kafu u portafilter. **Automatski**: programiraš **single i double** dozu.",
        remember: "Automatski mlin = programirane single i double doze" },
      { t: "match", q: "Spoji mlin i opis",
        pairs: [["Manuelni", "Melješ okretanjem ručice"], ["Poluautomatski", "Doziraš povlačenjem ručice"], ["Automatski", "Programirane single i double doze"]] },
      { t: "story", img: "img/mlin-panel.jpg", fit: "contain", bg: "#111", title: "Doza na automatskom mlinu",
        text: "Doza se programira u **sekundama mlevenja**: dugo drži **MENU**. Pazi: kad mlin podesiš **krupnije, doza raste**, a kad ga podesiš **sitnije, doza pada**. **Dose counter** broji samlevene doze.",
        remember: "Krupnije → veća doza · sitnije → manja doza" },
      { t: "tf", q: "Kad mlin podesiš sitnije, doza u istom vremenu mlevenja se smanji.", a: true,
        why: "Sitnija kafa sporije izlazi iz mlina, pa za isto vreme dobiješ manje grama." },
      { t: "story", title: "Mazzer mlinovi",
        gallery: [{ img: "img/mazzer-major-e.jpg", cap: "Major E" }, { img: "img/mazzer-super-jolly.jpg", cap: "Super Jolly" }, { img: "img/mazzer-kold.jpg", cap: "Kold" }, { img: "img/mazzer-robur.jpg", cap: "Robur" }],
        text: "Mazzer pravi mlinove od 1940. **Major E** je najčešći: 1.400–1.600 obrtaja u minuti. **Super Jolly** je za srednju potrošnju. **Kold** i **Robur** imaju konusne noževe, 420–500 obrtaja, za veliku potrošnju. **Kony SG** meri dozu na gram, a **Major V/VP** ima ravne noževe od 83 mm.",
        remember: "Major E najčešći · Kold i Robur: konusni noževi" },
      { t: "story", title: "Single shot mlinovi",
        gallery: [{ img: "img/ek43.jpg", cap: "Mahlkönig EK-43" }, { img: "img/mazzer-philos.jpg", cap: "Mazzer Philos" }],
        text: "Za filter kafu se koriste **single shot** mlinovi. Melju dozu po dozu, sporiji su i rade drugačije od espresso mlinova. Najčešći su **Mahlkönig EK-43** i **Mazzer Philos**.",
        remember: "EK-43 i Philos = single shot, za filter" },
      { t: "match", q: "Spoji pojam i značenje",
        pairs: [["Granulacija", "Veličina čestice samlevene kafe"], ["Doza", "Količina kafe koja se koristi"], ["Distribucija", "Ravnomerno raspoređivanje kafe"], ["Prinos", "Rastvorene materije u šoljici"]] }
    ],
    pool: [
      { t: "mc", q: "Ko je 1665. usavršio ručni mlin?", opts: ["Nikolas Buk", "Achille Gaggia", "Alan Adler", "Melitta Bentz"], a: 0, why: "Nikolas Buk, 1665." },
      { t: "mc", q: "Koji Mazzer mlin je najzastupljeniji?", opts: ["Major E", "Robur", "Kold", "Philos"], a: 0, why: "Major E je najčešći mlin." },
      { t: "mc", q: "Koliko obrtaja u minuti imaju Kold i Robur?", opts: ["420–500", "1.400–1.600", "Oko 3.000", "Oko 100"], a: 0, why: "Konusni noževi i lagana rotacija: 420–500 o/min." },
      { t: "mc", q: "Koji mlin meri dozu na težinu (load cell)?", opts: ["Kony SG", "Super Jolly", "Major E", "EK-43"], a: 0, why: "Kony SG ima load cell za merenje doze." },
      { t: "tf", q: "EK-43 je single shot mlin, najčešće za filter kafu.", a: true, why: "Mahlkönig EK-43 i Mazzer Philos su single shot mlinovi." },
      { t: "mc", q: "Kakve noževe ima Major V?", opts: ["Ravne, 83 mm", "Konusne", "Keramičke, 40 mm", "Nema noževe"], a: 0, why: "Major V/VP ima ravne (flat) noževe prečnika 83 mm." },
      { t: "tf", q: "Što su noževi dalje, kafa je sitnija.", a: false, why: "Obrnuto: noževi dalje = krupnija kafa." },
      { t: "mc", q: "Kako se na automatskom mlinu ulazi u podešavanje doze?", opts: ["Dugo držiš dugme MENU", "Okreneš silos", "Izvučeš kontejner", "Dvaput pritisneš prekidač"], a: 0, why: "Dugim pritiskom na MENU, a doza se koriguje u sekundama." }
    ],
    swipe: [
      ["Kad šot curi brzo, mlin podešavaš ka COARSE.", false],
      ["Što su noževi bliže, kafa je sitnija.", true],
      ["Kold i Robur imaju konusne noževe.", true],
      ["Major E radi na 420–500 obrtaja u minuti.", false],
      ["Na automatskom mlinu doza se podešava u sekundama.", true],
      ["Krupnija granulacija smanjuje dozu.", false],
      ["Mahlkönig EK-43 je single shot mlin.", true],
      ["Nikolas Buk je 1665. usavršio ručni mlin.", true]
    ]
  },

  /* ───────────────────────── NIVO 5 ───────────────────────── */
  {
    id: "m5", n: 5, title: "Recept za espresso", icon: "scale", color: "#A86A0C", min: 10,
    desc: "Doza, razmera i vreme. Plus prvi pravi izazov: uštimaj mlin.",
    steps: [
      { t: "clip", clip: "shot", title: "Ovako izgleda dobar šot",
        text: "20 g kafe daje 40 g espresa za oko 28 s. To je razmera **1:2**. Prati vagu i tajmer.",
        remember: "Dobar espresso: 1:2 za oko 25–30 s" },
      { t: "story", art: "ebr", title: "Šta je EBR?",
        text: "**EBR (Espresso Brew Ratio)** je odnos mase suve samlevene kafe u portafilteru i mase espresa u šoljici. Recept uvek kaže tri stvari: **koliko kafe**, **koliko espresa** i **za koliko sekundi**.",
        remember: "Recept = doza + prinos + vreme" },
      { t: "match", q: "Spoji napitak i razmeru",
        pairs: [["Ristretto", "1:1"], ["Espresso", "1:2"], ["Lungo", "1:3"]],
        why: "Svetski standard: ristretto 1:1, espresso 1:2, lungo 1:3." },
      { t: "story", art: "rules", title: "Zlatna pravila štelovanja",
        list: [
          { y: "18–20 g", t: "mlin se uvek šteluje po duploj dozi" },
          { y: "60%", t: "single doza je 60% mase duple" },
          { y: "~25 s", t: "toliko traje optimalna ekstrakcija" }
        ],
        text: "Za štelovanje ti trebaju: **granulacija, doza, dobra distribucija i ravnomeran tamp, i recept**.",
        remember: "Štelovanje po duploj dozi (18–20 g)" },
      { t: "num", q: "Koliko grama kafe ide u duplu dozu?", min: 10, max: 30, step: 1, unit: "g", a: [18, 20], start: 12,
        why: "Dupla doza je 18–20 g i po njoj se šteluje mlin." },
      { t: "num", q: "Dupla doza je 20 g. Koliko je single?", min: 6, max: 20, step: 1, unit: "g", a: [12, 12], start: 8,
        why: "Single je 60% duple: 20 × 0,6 = 12 g." },
      { t: "story", art: "fist", title: "Test šake",
        text: "Espresso granulacija je kao **pustinjski pesak**. Stisni oko 5 g kafe u šaci: deo treba da ostane **slepljen**, a deo da se **raspadne**. Sve slepljeno kao testo znači presitno. Ako se sve rasipa, prekrupno je.",
        remember: "Espresso granulacija = pustinjski pesak" },
      { t: "mc", q: "Stisneš kafu u šaci i sve se slepi kao testo. Granulacija je:",
        opts: ["Presitna", "Prekrupna", "Savršena", "Ne može da se zna"], a: 0,
        why: "Kad je sve slepljeno kao testo ili brašno, kafa je presitna." },
      { t: "story", art: "longer", title: "Duže ne znači jače",
        list: [
          { y: "20 → 40", t: "grama za 28 s · EBR 1:2" },
          { y: "20 → 60", t: "grama za 36 s · EBR 1:3" }
        ],
        text: "Što je ekstrakcija duža, to je **veći prinos**, ali je napitak **slabiji**. Dobar barista izvuče veću razmeru bez kanalisanja.",
        remember: "Duža ekstrakcija = veći prinos, slabiji napitak" },
      { t: "story", title: "Distribucija pre tampa",
        gallery: [{ img: "img/ocd.jpg", cap: "OCD" }, { img: "img/wdt.jpg", cap: "WDT" }],
        text: "Kafa mora ravnomerno da se rasporedi u portafilteru, inače nastaju kanali. **OCD** (Ona Coffee Distributor, Saša Šestić, 2012.) okrećeš na portafilteru. **WDT** su tanke iglice koje razbijaju grudvice. Tek onda ide **tamp**.",
        remember: "Prvo distribucija, pa tamp" },
      { t: "order", q: "Poređaj proceduru puštanja espresa",
        items: ["Tariraj šolje na vagi", "Ubaci portafilter u grupu", "Namesti šoljice ispod portafiltera", "Započni ekstrakciju", "Isprazni i očisti portafilter", "Isperi grupu i portafilter", "Osuši portafilter i vrati ga na grupu"],
        why: "Vaga na nulu, portafilter u grupu, šoljice, ekstrakcija, pa čišćenje, ispiranje i vraćanje." },
      { t: "game", game: "dialin", title: "Uštimaj mlin", text: "Tvoj prvi pravi barista zadatak. Podesi mlin i pusti šot." }
    ],
    pool: [
      { t: "mc", q: "Koliko traje optimalna ekstrakcija espresa?", opts: ["Oko 25 s", "Oko 10 s", "Oko 60 s", "Oko 2 min"], a: 0, why: "Optimalna ekstrakcija traje oko 25 sekundi." },
      { t: "mc", q: "Koja je razmera za lungo?", opts: ["1:3", "1:1", "1:2", "1:16"], a: 0, why: "Ristretto 1:1, espresso 1:2, lungo 1:3." },
      { t: "mc", q: "Ko je osmislio OCD?", opts: ["Saša Šestić", "Alan Adler", "Achille Gaggia", "Petar Šlumbom"], a: 0, why: "Saša Šestić, 2012. (sa svetom ga je podelio 2016.)." },
      { t: "mc", q: "Šta je WDT?", opts: ["Iglice koje razbijaju grudvice pre tampa", "Vrsta tampera", "Test kvaliteta vode", "Programirana doza mlina"], a: 0, why: "Weiss Distribution Technique: tanke iglice za ravnomernu distribuciju." },
      { t: "tf", q: "Mlin se šteluje po single dozi.", a: false, why: "Mlin se uvek šteluje po duploj dozi (18–20 g)." },
      { t: "tf", q: "20 g kafe → 60 ml espresa je razmera 1:3.", a: true, why: "60 / 20 = 3, dakle 1:3." },
      { t: "num", q: "Koliko grama espresa dobijaš iz 18 g kafe po razmeri 1:2?", min: 18, max: 60, step: 1, unit: "g", a: [36, 36], start: 24, why: "18 × 2 = 36 g." },
      { t: "mc", q: "Šta se radi pre tampanja?", opts: ["Distribucija", "Ekstrakcija", "Ispiranje grupe", "Tariranje šolje"], a: 0, why: "Prvo se kafa ravnomerno rasporedi, pa se tek onda tampuje." }
    ],
    swipe: [
      ["Espresso ima razmeru 1:2.", true],
      ["Ristretto ima razmeru 1:3.", false],
      ["Single doza je 60% duple.", true],
      ["Kafa se tampuje pre distribucije.", false],
      ["Duža ekstrakcija daje jači napitak.", false],
      ["Espresso granulacija je kao pustinjski pesak.", true],
      ["Pre ekstrakcije šolje se tariraju na vagi.", true],
      ["Mlin se uvek šteluje po duploj dozi.", true]
    ]
  },

  /* ───────────────────────── NIVO 6 ───────────────────────── */
  {
    id: "m6", n: 6, title: "Ekstrakcija", icon: "drop", color: "#C2511F", min: 7,
    desc: "Zašto je kafa nekad kisela, nekad gorka, i kako izgleda balans.",
    steps: [
      { t: "story", img: "img/ekstrakcija.jpg", title: "Šta je ekstrakcija?",
        text: "Ekstrakcija je izvlačenje korisnih materija iz kafe pomoću rastvarača. Kod nas je **voda rastvarač**, a kafa materija. Iz kafe možemo da rastvorimo najviše **35% njene mase**.",
        remember: "Voda = rastvarač · max 35% mase kafe" },
      { t: "story", art: "diffusion", title: "Erozija ili difuzija",
        text: "Espresso izvlači materije **erozijom** zrna, pod pritiskom. Filter kafa radi **međučestičnom difuzijom**. Brzinu ekstrakcije menjaju: **dodirna površina**, **debljina graničnog sloja** oko čestice i **temperatura**.",
        remember: "Espresso = erozija · filter = difuzija" },
      { t: "mc", q: "Šta NE utiče na brzinu ekstrakcije?",
        opts: ["Boja šoljice", "Temperatura", "Dodirna površina čestica", "Debljina graničnog sloja"], a: 0,
        why: "Brzinu menjaju dodirna površina, granični sloj i temperatura. Boja šoljice ne." },
      { t: "story", img: "img/ekstrakcija-nivoi.jpg", fit: "contain", bg: "#fff", title: "Tri nivoa ekstrakcije",
        list: [
          { y: "< 18%", t: "Nepotpuna: slabo telo, kiselo, slano, prazno" },
          { y: "18–22%", t: "Balansirana: slatko i prijatno" },
          { y: "> 22%", t: "Prezasićena: oporo i izraženo gorko" }
        ],
        text: "Rastvorene materije (TDS) merimo **refraktometrom**.",
        remember: "Ispod 18% kiselo · 18–22% balans · preko 22% gorko" },
      { t: "mc", q: "Šot je istekao za 15 s, ukus je kiseo i prazan. Kakva je ekstrakcija?",
        opts: ["Nepotpuna", "Balansirana", "Prezasićena"], a: 0,
        why: "Prekratko i kiselo je nepotpuna ekstrakcija. Probaj sitniju granulaciju." },
      { t: "mc", q: "Šot je trajao 45 s, gorak je i opor. Šta menjaš?",
        opts: ["Krupnija granulacija (ka COARSE)", "Sitnija granulacija (ka FINE)", "Manje tampa", "Hladnija šolja"], a: 0,
        why: "Presporo i gorko je prezasićena ekstrakcija. Krupnija kafa ubrzava protok." },
      { t: "mc", q: "Šta NIJE uzrok nepotpune ekstrakcije?",
        opts: ["Presitna granulacija", "Prekratka ekstrakcija", "Premala doza", "Preniska temperatura"], a: 0,
        why: "Presitna granulacija usporava vodu i vodi ka prezasićenoj ekstrakciji." },
      { t: "explore", art: "espresso", title: "Slojevi espresa",
        text: "Tokom ekstrakcije pod pritiskom nastaju tri sloja. Tapni svaki.",
        remember: "Krema · telo · srce (odozgo nadole)" },
      { t: "hotspot", art: "espresso", q: "Pronađi sloj",
        ask: [{ part: "srce", q: "Tapni najkoncentrovaniji sloj" }, { part: "krema", q: "Koji sloj čuva najviše arome?" }] },
      { t: "tf", q: "Krema nastaje od mikromehurića ugljen-dioksida.", a: true,
        why: "CO₂ iz kafe se oslobađa tokom ekstrakcije, a ulja stabilizuju mehuriće." }
    ],
    pool: [
      { t: "mc", q: "Čime se meri TDS?", opts: ["Refraktometrom", "Termometrom", "Vagom", "Manometrom"], a: 0, why: "TDS se meri refraktometrom." },
      { t: "mc", q: "Kakav je ukus prezasićene ekstrakcije?", opts: ["Opor i izraženo gorak", "Kiseo i slan", "Sladak i balansiran", "Vodenast"], a: 0, why: "Preko 22%: opor ukus i izražena gorčina." },
      { t: "mc", q: "Koji sloj espresa je najkoncentrovaniji?", opts: ["Srce", "Krema", "Telo", "Svi su isti"], a: 0, why: "Srce je donji, najkoncentrovaniji sloj." },
      { t: "tf", q: "Iz kafe možemo da rastvorimo najviše 35% mase.", a: true, why: "Maksimum je 35% od ukupne mase." },
      { t: "tf", q: "Espresso se ekstrahuje difuzijom, a filter erozijom.", a: false, why: "Obrnuto: espresso erozijom, filter međučestičnom difuzijom." },
      { t: "mc", q: "Koji je raspon balansirane ekstrakcije?", opts: ["18–22%", "10–14%", "25–30%", "35–40%"], a: 0, why: "Balansirana ekstrakcija je 18–22%." },
      { t: "mc", q: "Šta je srednji sloj espresa?", opts: ["Telo", "Krema", "Srce", "Talog"], a: 0, why: "Odozgo nadole: krema, telo, srce." }
    ],
    swipe: [
      ["Balansirana ekstrakcija je između 18% i 22%.", true],
      ["Nepotpuna ekstrakcija je kisela i prazna.", true],
      ["Prezasićena ekstrakcija je slatka i balansirana.", false],
      ["Krema je donji sloj espresa.", false],
      ["Voda je rastvarač u ekstrakciji kafe.", true],
      ["Krupna granulacija može da izazove nepotpunu ekstrakciju.", true],
      ["Temperatura utiče na brzinu ekstrakcije.", true],
      ["Espresso se ekstrahuje erozijom zrna.", true]
    ]
  },

  /* ───────────────────────── NIVO 7 ───────────────────────── */
  {
    id: "m7", n: 7, title: "Filter kafa", icon: "dripper", color: "#2B7BC0", min: 10,
    desc: "Chemex, V60, Aeropress i ostali: recepti, voda i temperatura.",
    steps: [
      { t: "story", img: "img/filter-metode.jpg", title: "Espresso protiv filtera",
        text: "Filter kafa nastaje **međučestičnom difuzijom**, bez pritiska. Zato traje duže, često ima **više kofeina**, **tanje telo** i manje gorčine od espresa.",
        remember: "Filter: duže, više kofeina, tanje telo" },
      { t: "story", art: "filters", title: "Papir, tkanina ili metal",
        list: [
          { y: "Papir", t: "Melitta Bentz, 1908. Zadržava ulja (kafestol): čista, svetla šolja, citrusne note." },
          { y: "Tkanina", t: "Propušta više materija: punije telo, izraženiji ukus." },
          { y: "Metal", t: "Propušta najviše ulja i čestica: tamnije i bogatije, kao French press." }
        ],
        remember: "Papir = čisto i svetlo · metal = puno telo" },
      { t: "match", q: "Spoji filter i rezultat",
        pairs: [["Papir", "Čista i svetla šolja"], ["Tkanina", "Punije telo"], ["Metal", "Najviše ulja i taloga"]] },
      { t: "story", art: "methods", title: "Protočna ili imerziona?",
        list: [
          { y: "Protočna", t: "voda gravitacijom prolazi kroz kafu: Chemex, V60, Kalita. Ključna je tehnika nalivanja." },
          { y: "Imerziona", t: "kafa je potopljena u vodi: French press, Aeropress, Sifon, Cold brew. Mešanje daje ravnomerno natapanje." }
        ],
        remember: "Protočna: Chemex, V60 · imerziona: French press, Aeropress" },
      { t: "sort", q: "Protočna ili imerziona?", left: "Protočna", right: "Imerziona",
        items: [["Chemex", 0], ["V60", 0], ["Kalita", 0], ["French press", 1], ["Aeropress", 1], ["Sifon", 1], ["Cold brew (potapanje)", 1]],
        why: "Protočne: Chemex, V60, Kalita. Imerzione: French press, Aeropress, Sifon, Cold brew." },
      { t: "story", art: "ratio116", title: "Zlatno pravilo: 1:16",
        text: "Standard je **1 g kafe na 16 g vode**. Voda između **80 i 95 °C**: iznad 95 °C kafa postaje gorka, ispod 80 °C kisela i nerazvijena. Koristi **filtriranu vodu**.",
        remember: "Filter: 1:16 · voda 80–95 °C" },
      { t: "num", q: "Koliko vode ide na 16 g kafe po razmeri 1:16?", min: 100, max: 400, step: 2, unit: "g", a: [250, 260], start: 160,
        why: "16 × 16 = 256 g. Recepti zaokružuju na 250–256 g." },
      { t: "clip", clip: "v60", title: "V60 u pet nalivanja",
        text: "16 g kafe, **srednja** granulacija, voda **95 °C**. Pet nalivanja po **50 g**, na svakih 30 s, od sredine ka spolja. Ukupno **3:30–5:00**.",
        remember: "V60: 16 g · 5 × 50 g · 3:30–5:00" },
      { t: "story", img: "img/chemex.jpg", fit: "contain", bg: "#fff", title: "Chemex · 1941.",
        text: "Izumeo ga je hemičar **Petar Šlumbom**, autor preko 300 patenata, inspirisan Bauhausom. Debeo filter daje čistu šolju. Recept: **16 g krupno mlevene kafe**, voda 95 °C, **3 × 85 g**. Ukupno 3:30–5:00.",
        remember: "Chemex: krupna granulacija · 3 × 85 g" },
      { t: "story", img: "img/aeropress.jpg", fit: "contain", bg: "#000", title: "Aeropress · 2005.",
        text: "Izumeo ga je **Alan Adler**. Imerziona metoda: puno telo, slatko i aromatično. **14 g kafe**, prvo 30 g vode i mešanje, pa još 194 g. Potiskivanje traje **1:30–2:00**. Postoji standardna i **invertna** metoda.",
        remember: "Aeropress: 14 g · 1:30–2:00" },
      { t: "story", title: "French press i Sifon",
        gallery: [{ img: "img/french-press.jpg", cap: "French press" }, { img: "img/sifon.jpg", cap: "Sifon" }],
        text: "**French press** (Ugo Paolini, 1923.): krupna kafa i metalni filter. 16 g kafe i 250 g vode na 95 °C, pa čekaš **4–5 min**. **Sifon** (Loeff, 1830.) je **najstariji** metod filter kafe: kafa je potpuno potopljena, a voda se greje plamenom.",
        remember: "French press: 4–5 min · Sifon: najstariji (1830.)" },
      { t: "story", img: "img/cold-brew.jpg", fit: "contain", bg: "#fff", title: "Cold brew",
        text: "Kjoto i holandski trgovci, oko 1600. **Hladna voda** i spora ekstrakcija **6–24 h**, razmera **1:10** (100 g kafe na 1 l), krupna granulacija. Manje kiselosti, više gorčine i kofeina. Slow-drip: 1 kap na 1,5 s.",
        remember: "Cold brew: 1:10 · 6–24 h" },
      { t: "match", q: "Spoji metodu i izumitelja",
        pairs: [["Chemex", "Petar Šlumbom, 1941."], ["Aeropress", "Alan Adler, 2005."], ["French press", "Ugo Paolini, 1923."], ["Sifon", "Loeff, 1830."], ["V60", "Japan, 2004."]] },
      { t: "story", img: "img/voda.jpg", title: "Voda je skoro cela tvoja kafa",
        text: "Voda čini **88–93%** šolje espresa i **98–99%** šolje filter kafe. Idealna voda ima **pH oko 7** i **TDS 75–250 ppm** (1 ppm = 1 mg/L). Minerali kao kalcijum i magnezijum menjaju ukus.",
        remember: "Voda: pH ~7 · TDS 75–250 ppm" },
      { t: "game", game: "recipe", title: "Složi recept", text: "Popuni recept za metode koje si upravo naučio." }
    ],
    pool: [
      { t: "mc", q: "Koja je razmera za cold brew?", opts: ["1:10", "1:16", "1:2", "1:5"], a: 0, why: "100 g kafe na 1 litar vode, 1:10." },
      { t: "mc", q: "Koliko kafe ide u Aeropress po recepturi?", opts: ["14 g", "16 g", "20 g", "30 g"], a: 0, why: "Aeropress: 14 g kafe." },
      { t: "mc", q: "Koja metoda filter kafe je najstarija?", opts: ["Sifon", "Chemex", "French press", "V60"], a: 0, why: "Sifon, Loeff, 1830." },
      { t: "mc", q: "Ko je izumeo papirni filter?", opts: ["Melitta Bentz", "Petar Šlumbom", "Alan Adler", "Ugo Paolini"], a: 0, why: "Melitta Bentz, Nemačka, 1908." },
      { t: "mc", q: "Koliko traje French press?", opts: ["4–5 min", "30 s", "1:30–2:00", "6–24 h"], a: 0, why: "Poklopi i čekaj 4–5 minuta." },
      { t: "mc", q: "Kakva granulacija ide u Chemex?", opts: ["Krupna", "Srednja", "Sitna", "Kao prah"], a: 0, why: "Chemex: krupna granulacija." },
      { t: "mc", q: "Kakva granulacija ide u V60?", opts: ["Srednja", "Krupna", "Sitna kao za espresso", "Kao prah"], a: 0, why: "V60: srednja granulacija i sitniji filter od Chemexa." },
      { t: "tf", q: "Filter kafa često ima više kofeina od espresa.", a: true, why: "Zbog dužeg vremena ekstrakcije." },
      { t: "tf", q: "Voda iznad 95 °C može da učini kafu gorkom.", a: true, why: "Idealan opseg je 80–95 °C." },
      { t: "tf", q: "Idealan pH vode za kafu je oko 4.", a: false, why: "Voda treba da bude neutralna, pH oko 7." },
      { t: "num", q: "Koliko nalivanja ima V60 recept?", min: 1, max: 8, step: 1, unit: "×", a: [5, 5], start: 2, why: "Pet nalivanja po 50 g." },
      { t: "mc", q: "Koliki TDS treba da ima voda za kafu?", opts: ["75–250 ppm", "0–10 ppm", "500–800 ppm", "Preko 1.000 ppm"], a: 0, why: "Voda: TDS 75–250 ppm, pH oko 7." }
    ],
    swipe: [
      ["Chemex je protočna metoda.", true],
      ["French press je protočna metoda.", false],
      ["Standardni odnos za filter kafu je 1:16.", true],
      ["Cold brew traje 6–24 sata.", true],
      ["Papirni filter propušta najviše ulja.", false],
      ["Aeropress je izumeo Alan Adler.", true],
      ["Voda čini 98–99% šolje filter kafe.", true],
      ["Sifon je izumljen 2005.", false],
      ["Voda ispod 80 °C daje kiselu i nerazvijenu kafu.", true]
    ]
  },

  /* ───────────────────────── NIVO 8 ───────────────────────── */
  {
    id: "m8", n: 8, title: "Mleko i latte art", icon: "pitcher", color: "#12807B", min: 10,
    desc: "Stimovanje, mikropena, srce i rozeta. I higijena koja čuva ukus.",
    steps: [
      { t: "story", img: "img/stimovanje.jpg", title: "Kako nastaje mlečna krema",
        text: "Stimer izbacuje paru pod pritiskom od oko **1 bar**. **Proteini** u mleku hvataju vazduh i prave penu, a **masti** daju slatkoću i punoću.",
        remember: "Proteini = pena · masti = slatkoća i punoća" },
      { t: "clip", clip: "milk", title: "Dve faze: vazduh, pa vrtlog",
        text: "**1. Vrh na površini**: ubacuješ vazduh. Više vazduha znači deblju penu. **2. Vrh potopljen** u jedan od četiri sektora latijere: mleko se vrti, pena i mleko se spajaju i greju.",
        remember: "Prvo vazduh (vrh na površini), pa vrtlog (vrh potopljen)" },
      { t: "mc", q: "Vrh stimera je previše iznad površine. Šta dobijaš?",
        opts: ["Velike, grube mehuriće", "Savršenu mikropenu", "Toplo mleko bez pene", "Hladno mleko"], a: 0,
        why: "Kad je vrh previše izložen, uvlači se mnogo vazduha i prave se veliki mehurići." },
      { t: "mc", q: "Vrh stimera je sve vreme duboko u mleku. Šta dobijaš?",
        opts: ["Toplo mleko bez pene", "Previše pene", "Velike mehuriće", "Latte art sam od sebe"], a: 0,
        why: "Bez vazduha nema pene. Para samo zagreva mleko." },
      { t: "game", game: "milk", title: "Stimuj mleko", text: "Pomeraj latijeru i napravi svilenkastu mikropenu." },
      { t: "story", img: "img/labud.jpg", title: "Latte art: freepour i etching",
        text: "**Freepour**: crtaš samim sipanjem. **Etching**: crtaš iglicom po površini. Osnova svega su dobar espresso i dobro spojeno mleko.",
        remember: "Freepour = sipanjem · etching = iglicom" },
      { t: "story", art: "pour3", title: "Tri faktora sipanja",
        list: [
          { y: "Brzina", t: "spor protok ostavlja smelije poteze, veći protok nežne linije" },
          { y: "Blizina", t: "počni par cm iznad šolje, a za crtanje spusti latijeru do površine" },
          { y: "Položaj", t: "vrh latijere određuje vrh dizajna" }
        ],
        text: "Opusti ruke, laktovi dole. Osnovu naliješ do pola šolje, pa tek onda crtaš.",
        remember: "Brzina · blizina · položaj latijere" },
      { t: "clip", clip: "heart", title: "Srce u četiri koraka",
        text: "Počni iznad sredine šolje, sipaj **tačku**, **uspori** dok dolivaš i **preseci** kroz crtež.",
        remember: "Srce: tačka → uspori → preseci" },
      { t: "order", q: "Poređaj korake za srce",
        items: ["Sipaj osnovu do pola šolje", "Spusti latijeru i sipaj tačku", "Uspori protok dok dolivaš", "Preseci kroz crtež"],
        why: "Osnova do pola, tačka blizu površine, usporavanje i presek." },
      { t: "mc", q: "Koji je ovo dizajn?", art: "latte-rosetta",
        opts: ["Rozeta", "Srce", "Tulip", "Labud"], a: 0,
        why: "Rozeta nastaje talasanjem levo-desno i završnim presekom." },
      { t: "story", art: "latte-set", title: "Izvedeni oblici",
        list: [
          { y: "Tulip", t: "više tačaka u slojevima, završni presek ih spaja" },
          { y: "Rozeta", t: "talasanje levo-desno u centru, pa presek" },
          { y: "Labud", t: "baza kao rozeta, krila i vrat linijom mleka, tačka za glavu" }
        ],
        remember: "Tulip = slojevi tačaka · rozeta = talasanje" },
      { t: "game", game: "latte", title: "Sipaj srce", text: "Drži, pusti, preseci. Probaj da nacrtaš srce." },
      { t: "story", title: "Higijena = ukus",
        gallery: [{ img: "img/higijena-krpa.jpg", cap: "Grupa i tuš" }, { img: "img/higijena-cistac.jpg", cap: "Portafilter" }],
        text: "Prljava grupa, tuš ili portafilter daju **opor ukus** i suvoću na zadnjem delu nepca. Tokom smene čisti portafiltere, tuševe i grupe, a aparat, mlin i portafiltere **svaki dan**.",
        remember: "Čista oprema = jasnije note" },
      { t: "tf", q: "Prljav portafilter može da napravi opor ukus.", a: true,
        why: "Zaostala ulja i talog daju opor ukus i suvoću u zadnjem delu nepca." }
    ],
    pool: [
      { t: "mc", q: "Na kom pritisku radi stimer?", opts: ["Oko 1 bar", "Oko 9 bara", "Oko 3 bara", "Oko 15 bara"], a: 0, why: "Stimer izbacuje paru pod pritiskom od oko 1 bar." },
      { t: "mc", q: "Šta u mleku pravi penu?", opts: ["Proteini", "Masti", "Kalcijum", "Voda"], a: 0, why: "Vazduh se ubacuje u proteinsku strukturu mleka." },
      { t: "mc", q: "Šta u mleku daje slatkoću i punoću?", opts: ["Masti", "Proteini", "Kalcijum", "Para"], a: 0, why: "Masti daju slatkoću i punoću napitku." },
      { t: "mc", q: "Dokle se naliva osnova pre crtanja?", opts: ["Do pola šolje", "Do vrha", "Do četvrtine", "Uopšte se ne naliva"], a: 0, why: "Najbolja praksa je nalivati do pola šolje." },
      { t: "mc", q: "Koja tehnika koristi iglicu?", opts: ["Etching", "Freepour", "Tulip", "Rozeta"], a: 0, why: "Etching je crtanje iglicom." },
      { t: "tf", q: "Vrh latijere određuje vrh dizajna.", a: true, why: "Gde je vrh latijere, tu će biti vrh crteža." },
      { t: "tf", q: "Labud se crta na bazi rozete.", a: true, why: "Baza talasanja kao kod rozete, pa krila, vrat i glava." },
      { t: "mc", q: "Koji je ovo dizajn?", art: "latte-tulip", opts: ["Tulip", "Srce", "Rozeta", "Labud"], a: 0, why: "Tulip čine slojevi tačaka spojeni presekom." }
    ],
    swipe: [
      ["Stimer radi na oko 1 bar.", true],
      ["Masti u mleku prave penu.", false],
      ["Etching je crtanje iglicom.", true],
      ["Srce se završava presecanjem.", true],
      ["Rozeta se pravi talasanjem levo-desno.", true],
      ["Grupe aparata se čiste samo jednom nedeljno.", false],
      ["Previše izložen vrh stimera pravi velike mehuriće.", true],
      ["Za crtanje latijera treba da bude visoko iznad šolje.", false]
    ]
  }
];

/* Rečnik pojmova (kartice) */
ZPZ.GLOSSARY = [
  ["m1", "Coffea", "Rod biljaka kojem pripada kafa. Zimzelena biljka iz porodice Rubiaceae."],
  ["m1", "Pojas kafe", "Pojas između 25° severno i 30° južno u kom kafa uspeva."],
  ["m1", "Qahwa", "Jemenski naziv za napitak od kafe. Po njemu je kafa dobila ime."],
  ["m1", "Qahveh khaneh", "Kuće kafe u Jemenu, preci današnjih kafića."],
  ["m2", "Musilaž (sluz)", "Lepljivi sloj trešnje ispod pulpe. Kod prane obrade fermentiše u vodi."],
  ["m2", "Parčment", "Zaštitna ljuska oko zrna, između sluzi i srebrne opne."],
  ["m2", "Srebrna opna", "Najtanja opna koja prijanja uz zeleno zrno."],
  ["m2", "Natural", "Prirodna (suva) obrada: cela trešnja se suši do 12% vlage. Slatko i čokoladno."],
  ["m2", "Washed", "Prana obrada: pulpa se skida, zrno fermentiše u vodi 10–30 h. Kiselo, citrusno, voćno."],
  ["m2", "Arabika", "44 hromozoma, 900–2000 m, 15–25 °C. Složen ukus i manje kofeina."],
  ["m2", "Robusta (Canephora)", "22 hromozoma, 0–900 m, 20–30 °C. Jednostavniji ukus, jača krema, više kofeina."],
  ["m3", "Protočni bojler", "Bojler za espresso: voda 88–95 °C, pritisak 8–9 bara."],
  ["m3", "Akumulacioni bojler", "Bojler za paru i vruću vodu: do 120 °C, stimer oko 1 bar."],
  ["m3", "Predinfuzija", "Početno natapanje kolača pod oko 3 bara. Sprečava kanalisanje."],
  ["m3", "Kanalisanje", "Voda nađe prečicu kroz pukotinu u kolaču i neravnomerno izvlači kafu."],
  ["m3", "FAEMA E61", "Aparat iz 1961.: električna pumpa, automatska predinfuzija i termosifon."],
  ["m4", "Granulacija", "Veličina čestice samlevene kafe. Određuje procenat ekstrakcije."],
  ["m4", "FINE / COARSE", "FINE je sitnije (noževi bliže), COARSE krupnije (noževi dalje)."],
  ["m4", "Doza", "Količina kafe koja se koristi."],
  ["m4", "Distribucija", "Ravnomerno raspoređivanje kafe u portafilteru, pre tampa."],
  ["m4", "Prinos", "Količina rastvorenih materija u šoljici."],
  ["m4", "Dose counter", "Brojač samlevenih doza na displeju mlina."],
  ["m4", "Single shot mlin", "Melje dozu po dozu, najčešće za filter. Na primer EK-43 i Philos."],
  ["m5", "EBR", "Espresso Brew Ratio: odnos samlevene kafe i espresa u šoljici."],
  ["m5", "Ristretto · espresso · lungo", "Razmere 1:1, 1:2 i 1:3."],
  ["m5", "Dupla doza", "18–20 g kafe. Mlin se uvek šteluje po duploj dozi."],
  ["m5", "Tamp", "Sabijanje kafe u portafilteru posle distribucije."],
  ["m5", "OCD", "Ona Coffee Distributor (Saša Šestić, 2012.), alat za distribuciju."],
  ["m5", "WDT", "Weiss Distribution Technique: tanke iglice koje razbijaju grudvice."],
  ["m5", "Tariranje", "Vraćanje vage na nulu kad je šolja već na njoj."],
  ["m6", "Ekstrakcija", "Izvlačenje rastvorljivih materija iz kafe pomoću vode."],
  ["m6", "TDS i refraktometar", "TDS su ukupno rastvorene materije. Mere se refraktometrom."],
  ["m6", "Erozija", "Način ekstrakcije kod espresa, pod pritiskom."],
  ["m6", "Difuzija", "Način ekstrakcije kod filter kafe (međučestična difuzija)."],
  ["m6", "Krema · telo · srce", "Tri sloja espresa, odozgo nadole."],
  ["m7", "Protočna metoda", "Voda gravitacijom prolazi kroz kafu: Chemex, V60, Kalita."],
  ["m7", "Imerziona metoda", "Kafa je potopljena u vodi: French press, Aeropress, Sifon, Cold brew."],
  ["m7", "Kafestol", "Uljana komponenta kafe koju zadržava papirni filter."],
  ["m7", "ppm", "Parts per million. 1 ppm = 1 mg/L."],
  ["m7", "Invertna metoda", "Aeropress se puni naopako, pa se stavi filter i posuda okrene."],
  ["m8", "Stimer", "Cev za paru (oko 1 bar) kojom se pravi mlečna krema."],
  ["m8", "Latijera", "Metalni bokal za mleko."],
  ["m8", "Mikropena", "Kremasta pena sa sitnim mehurićima ugrađenim u mleko."],
  ["m8", "Freepour", "Latte art koji crtaš samim sipanjem."],
  ["m8", "Etching", "Crtanje iglicom po površini napitka."]
];

/* Recepti za igru „Složi recept“ (polja kojih nema u skripti se preskaču) */
ZPZ.RECIPES = [
  { id: "chemex", name: "Chemex", img: "img/chemex.jpg", f: { kafa: "16 g", voda: "3 × 85 g", granulacija: "Krupna", temp: "95 °C", vreme: "3:30–5:00" } },
  { id: "v60", name: "Hario V60", img: "img/v60.jpg", f: { kafa: "16 g", voda: "5 × 50 g", granulacija: "Srednja", temp: "95 °C", vreme: "3:30–5:00" } },
  { id: "aero", name: "Aeropress", img: "img/aeropress.jpg", dark: true, f: { kafa: "14 g", voda: "30 g + 194 g", vreme: "1:30–2:00" } },
  { id: "french", name: "French press", img: "img/french-press.jpg", f: { kafa: "16 g", voda: "250 g odjednom", granulacija: "Krupna", temp: "95 °C", vreme: "4–5 min" } },
  { id: "cold", name: "Cold brew", img: "img/cold-brew.jpg", f: { kafa: "100 g na 1 l", granulacija: "Krupna", temp: "Hladna voda", vreme: "6–24 h" } }
];
ZPZ.RECIPE_FIELDS = [
  { k: "kafa", t: "Kafa", opts: ["14 g", "16 g", "20 g", "100 g na 1 l"] },
  { k: "voda", t: "Voda", opts: ["3 × 85 g", "5 × 50 g", "30 g + 194 g", "250 g odjednom"] },
  { k: "granulacija", t: "Granulacija", opts: ["Sitna", "Srednja", "Krupna"] },
  { k: "temp", t: "Voda (temp.)", opts: ["95 °C", "80 °C", "Hladna voda"] },
  { k: "vreme", t: "Vreme", opts: ["1:30–2:00", "3:30–5:00", "4–5 min", "6–24 h"] }
];
