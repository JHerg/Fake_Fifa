const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const BREITE = canvas.width, HOEHE = canvas.height;

function passeCanvasAn() {
    let fensterBreite = window.innerWidth; let fensterHoehe = window.innerHeight;
    let verfuegbareHoehe = fensterHoehe - 220; let seitenVerhaeltnis = BREITE / HOEHE; 
    let neueBreite = fensterBreite * 0.95; let neueHoehe = neueBreite / seitenVerhaeltnis;
    if (neueHoehe > verfuegbareHoehe) { neueHoehe = verfuegbareHoehe; neueBreite = neueHoehe * seitenVerhaeltnis; }
    canvas.style.width = neueBreite + "px"; canvas.style.height = neueHoehe + "px";
}
window.addEventListener("resize", passeCanvasAn); passeCanvasAn();

const gameSettings = { replay: true, weather: "sun", time: "day", mode: "free", commentary: true, voiceIndex: "default" };

document.getElementById("btnSettings").addEventListener("click", () => document.getElementById("settings-panel").classList.remove("hidden"));
document.getElementById("btnCloseSettings").addEventListener("click", () => {
    gameSettings.replay = document.getElementById("checkReplay").checked;
    gameSettings.weather = document.getElementById("selectWeather").value;
    gameSettings.time = document.getElementById("selectTime").value;
    gameSettings.mode = document.getElementById("selectMode").value;
    gameSettings.commentary = document.getElementById("checkCommentary").checked;
    gameSettings.voiceIndex = document.getElementById("selectVoice").value;
    document.getElementById("settings-panel").classList.add("hidden");
    initWeather();
});

// --- AUDIO & 3D SPATIAL SYSTEM ---
let audioCtx = null, soundEnabled = true, crowdGainNode = null;
const synth = window.speechSynthesis;
let lastTouchPlayer = null;
let hasSpokenHalftime = false, hasSpokenEndgame = false;
let availableVoices = [];

function loadVoices() {
    let voices = synth.getVoices();
    availableVoices = voices.filter(v => v.lang.includes('de'));
    if(availableVoices.length === 0) availableVoices = voices;
    let select = document.getElementById("selectVoice");
    if (availableVoices.length > 0) {
        select.innerHTML = "";
        availableVoices.forEach((voice, index) => {
            let option = document.createElement('option'); option.value = index;
            option.textContent = voice.name.replace('Microsoft ', '').replace('Google ', '') + (voice.localService ? '' : ' ☁️');
            select.appendChild(option);
        });
    }
}
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) { speechSynthesis.onvoiceschanged = loadVoices; }

// --- FUCHS FUSS / EPIC KOMMENTATOR WORTSCHATZ ---
const sprueche = {
    start: [
        "Ein herzliches Willkommen, liebe Fußballfreunde! [TEAM_1] empfängt heute [TEAM_2]. Das wird ein Fußball-Fest!",
        "Hallo aus der Kommentatorenkabine! Fuchs Fuss hier am Mikrofon! Ich freue mich auf die Partie zwischen [TEAM_1] und [TEAM_2].",
        "Guten Abend allerseits! Schnallen Sie sich an, [TEAM_1] trifft auf [TEAM_2]. Das hier wird ein echtes Spektakel.",
        "Der Schiedsrichter gibt die Partie frei! [TEAM_1] gegen [TEAM_2], Fußballherz, was willst du mehr?",
        "Flutlicht an, der Ball rollt! Willkommen im Fußball-Tempel zur Begegnung [TEAM_1] gegen [TEAM_2].",
        "Das ist die absolute Crème de la Crème. Wir erwarten ein packendes Duell zwischen [TEAM_1] und [TEAM_2]!",
        "Haben Sie es sich gemütlich gemacht? Sehr gut! [TEAM_1] gegen [TEAM_2] - ein Fußball-Leckerbissen, den wir uns auf der Zunge zergehen lassen!",
        "Ein herrlicher Fußballabend beginnt. [TEAM_1] fordert [TEAM_2] heraus. Da kribbelt es schon beim Zusehen!",
        "Taktisch wird das heute ein echter Leckerbissen. [TEAM_1] startet von links nach rechts gegen [TEAM_2].",
        "Die Ränge sind bis auf den letzten Platz gefüllt. Ein Fußballfest steht uns bevor, [TEAM_1] gegen [TEAM_2]!",
        "Licht an, Film ab! [TEAM_1] gegen [TEAM_2]. Wer hier nicht zuschaut, hat den Fußball nie geliebt.",
        "Die Gladiatoren betreten das grüne Rechteck. [TEAM_1] gegen [TEAM_2], ein absolutes Festmenü für jeden Fußballfan.",
        "Die Akteure sind heiß wie Frittenfett. Wenn [TEAM_1] und [TEAM_2] aufeinandertreffen, brennt hier der Rasen!",
        "Servus und Hallo! Fuchs Fuss am Apparat. Wir haben heute ein Match, das auf dem Papier absolute Spitzenklasse verspricht.",
        "Machen Sie es sich auf der Couch bequem. Die Jungs da unten auf dem Rasen werden gleich richtig brennen!",
        "Dieses Match hat eine gewaltige Vorgeschichte. Heute wollen es beide Teams endgültig wissen!"
    ],
    liga_start: [
        "Willkommen zum [MATCHDAY]. Spieltag! [TEAM_1] empfängt [TEAM_2]. Die Hausherren gehen als [POS_1] in diese Partie [FORM_1]. Der Gegner steht auf [POS_2] [FORM_2].",
        "Fuchs Fuss begrüßt Sie zum [MATCHDAY]. Spieltag! Ein enorm wichtiges Match in dieser Liga! [TEAM_1], aktuell [POS_1], trifft auf [TEAM_2], die derzeit [POS_2] sind.",
        "Hallo liebe Fußballfreunde am [MATCHDAY]. Spieltag! [TEAM_1] kommt [FORM_1] in diese Begegnung. Ob [TEAM_2] als [POS_2] da heute gegenhalten kann?",
        "Der [MATCHDAY]. Spieltag steht an! Die Liga biegt auf die nächste Gerade ein. [TEAM_1] als [POS_1] gegen [TEAM_2] als [POS_2] - das verspricht Spannung pur!",
        "Ein herzliches Willkommen am [MATCHDAY]. Spieltag! [TEAM_1] hat sich als [POS_1] viel vorgenommen [FORM_1]. [TEAM_2] muss als [POS_2] heute dringend punkten [FORM_2].",
        "Guten Abend allerseits zum [MATCHDAY]. Spieltag! [TEAM_1] ist momentan [POS_1] und geht [FORM_1] ins Spiel. Auf der anderen Seite lauert [TEAM_2] als [POS_2].",
        "Es ist angerichtet am [MATCHDAY]. Spieltag! Dieses Duell hat es in sich! [TEAM_1] [FORM_1] gegen [TEAM_2] [FORM_2]. Freuen wir uns auf packende 90 Minuten!",
        "Spitzenspiel oder Abstiegskampf? Wir werden sehen am [MATCHDAY]. Spieltag! [TEAM_1] rangiert auf [POS_1]. Die Gäste von [TEAM_2] grüßen als [POS_2].",
        "Einen wunderschönen guten Abend zum [MATCHDAY]. Spieltag! [TEAM_1] gegen [TEAM_2]. [POS_1] gegen [POS_2]. Das ist ein absoluter Kracher!",
        "Schnallen Sie sich an, liebe Zuschauer, es ist der [MATCHDAY]. Spieltag! [TEAM_1] empfängt als [POS_1] die Jungs von [TEAM_2], die aktuell als [POS_2] in der Tabelle stehen.",
        "Fuchs Fuss am Mikrofon zum [MATCHDAY]. Spieltag! Wenn [TEAM_1] als [POS_1] auf [TEAM_2] als [POS_2] trifft, dann ist Spektakel vorprogrammiert!",
        "Was für ein herrlicher [MATCHDAY]. Spieltag! [TEAM_1] [FORM_1]. Aber Vorsicht, [TEAM_2] ist als [POS_2] immer für eine Überraschung gut [FORM_2].",
        "Es geht um wichtige Punkte! [TEAM_1] will sich als [POS_1] behaupten. Für [TEAM_2] geht es als [POS_2] darum, heute den Bock umzustoßen."
    ],
    turnier_start: [
        "Willkommen zum K.O.-Spiel! Verlieren verboten, heißt die Devise. [TEAM_1] gegen [TEAM_2].",
        "Es geht um alles oder nichts in diesem Turnier! [TEAM_1] gegen [TEAM_2] - wer hier patzt, fliegt!",
        "Do or Die! Das ist die Magie des Turniermodus. [TEAM_1] und [TEAM_2] machen sich bereit für einen epischen Fight.",
        "Turnierfußball pur! Keine Ausreden, keine zweite Chance. [TEAM_1] trifft auf [TEAM_2]!",
        "Ein K.O.-Duell par excellence! [TEAM_1] gegen [TEAM_2]. Schnallen Sie sich an, es wird dramatisch.",
        "Der Verlierer fährt nach Hause, der Sieger kommt weiter. Das ist der Stoff, aus dem Legenden sind. [TEAM_1] gegen [TEAM_2]!"
    ],
    wetter_sun: [
        "Kaiserwetter im Stadion! Die Sonne lacht, perfekte Bedingungen für ein Fußballfest.",
        "Strahlender Sonnenschein! Bei diesem herrlichen Wetter haben die Jungs gar keine andere Wahl, als Zauberfußball zu bieten.",
        "Die Sonne brennt auf den Platz, optimales Fußballwetter heute.",
        "Ein blauer Himmel über dem Stadion! Besser kann das Wetter für ein Fußballspiel gar nicht sein.",
        "Kein Wölkchen am Himmel! Die Fans genießen die Sonne, hoffen wir auf ein ebenso strahlendes Spiel.",
        "Sonnenschein pur! Wer bei diesem Wetter nicht motiviert ist, ist im falschen Beruf."
    ],
    wetter_night: [
        "Das Flutlicht brennt, die Atmosphäre knistert! Ein perfekter Fußballabend.",
        "Flutlichtspiele haben immer ihre eigene Magie. Die Bedingungen heute Abend sind sensationell.",
        "Ein lauer Abend, helles Flutlicht und zwei Top-Teams. Was will man mehr?",
        "Unter Flutlicht glänzt der Rasen doch am schönsten. Ein Abendspiel, wie es im Buche steht!",
        "Die Scheinwerfer tauchen den Platz in ein magisches Licht. Flutlichtspiele sind einfach die besten!",
        "Es ist angerichtet am heutigen Abend! Das Flutlicht ist an, die Bühne ist frei für unsere Protagonisten."
    ],
    wetter_rain: [
        "Es schüttet wie aus Eimern! Fritz-Walter-Wetter, liebe Zuschauer. Das gibt heute ordentlich Rutschpartien.",
        "Der Rasen ist nass und seifig. Das wird ein Fest für jeden, der gerne mal aus der Distanz abzieht!",
        "Eine wahre Wasserschlacht steht uns bevor. Der Ball wird verdammt schnell auf diesem feuchten Geläuf.",
        "Regen ohne Ende! Das Geläuf ist tief, da ist Kampfgeist gefragt.",
        "Die reinste Rutschpartie heute! Die Bedingungen sind schwierig, aber für beide gleich.",
        "Wer bei diesem Sauwetter gewinnt, hat es sich wirklich verdient. Der Regen peitscht auf den Rasen!"
    ],
    wetter_snow: [
        "Väterchen Frost hat zugeschlagen! Das Spielfeld ist weiß, der Ball rollt schwer. Was für eine Schneeschlacht!",
        "Eisige Temperaturen und Schnee auf dem Rasen. Das wird heute ein Spiel für die echten Kämpfernaturen!",
        "Eine geschlossene Schneedecke! Das wird technisch anspruchsvoll, aber umso rutschiger in den Zweikämpfen.",
        "Willkommen im Winterwunderland! Orangefarbener Ball, dicke Handschuhe - heute wird es frostig.",
        "Der Winter ist eingebrochen! Es schneit ununterbrochen, das ist nichts für Schönwetterfußballer.",
        "Schneegestöber über dem Stadion! Die Jungs müssen sich warm laufen, sonst frieren hier gleich alle fest."
    ],
    besitz: [
        "[PLAYER] streichelt den Ball.",
        "[PLAYER] sucht die Lücke in der Abwehr. Da hat er das Auge für den Raum.",
        "Die Abteilung Attacke bei [TEAM] ist eröffnet, angetrieben von [PLAYER].",
        "Das sieht so elegant aus bei [PLAYER]. Tiki-Taka in Reinkultur.",
        "Ruhiger und kontrollierter Spielaufbau bei [TEAM].",
        "[PLAYER] tänzelt durchs Mittelfeld. Da wird man ja schwindelig vom Zusehen!",
        "[PLAYER] zieht das Tempo an! Jetzt muss es schnell gehen.",
        "Starke Übersicht von [PLAYER] in dieser Situation.",
        "[TEAM] lässt den Ball und den Gegner laufen.",
        "[PLAYER] klebt der Ball am Fuß. Eine fantastische Technik.",
        "Hier wird das Leder mit ganz viel Liebe behandelt.",
        "Das sieht so flüssig aus. [TEAM] hat das Spielgerät momentan voll im Griff.",
        "Ganz feines Füßchen bei [PLAYER]. Die Gegner kommen nur hinterher."
    ],
    schuss: [
        "Was für ein Strahl von [PLAYER]!",
        "Ein Strich von [PLAYER]!",
        "[PLAYER] zieht einfach mal ab! Den packt er richtig satt!",
        "Eine Fackel! Da brennt die Luft im Strafraum!",
        "Klasse Versuch! Da hat nicht viel gefehlt.",
        "Der kommt extrem gefährlich aufs Tor!",
        "Vollspann von [PLAYER]! Da wackelt das Gebälk!",
        "Das muss es doch sein! Riesenchance für [TEAM]!",
        "Satter Schuss von [PLAYER]! Da zuckt der Torwart nicht mal.",
        "Der zieht ab! Meine Güte, da wäre fast das Netz gerissen!",
        "[PLAYER] sucht direkt den Abschluss. Gut gedacht!"
    ],
    tor: [
        "Da brat mir einer nen Storch! Was für ein Tor von [PLAYER]!",
        "Den hat er mit der Lupe ausgemessen! Un-fass-bar!",
        "Ein Tor für die Galerie! [PLAYER] macht das Ding für [TEAM]!",
        "Wahnsinn! Da schnallst du ab! [PLAYER] trifft für [TEAM]!",
        "Ein absolutes Traumtor von [PLAYER]! Ein Tor, so schön wie ein Gemälde.",
        "Da zappelt das Ding im Netz! Klasse gemacht von [PLAYER].",
        "Der ist drin! Und wie! [PLAYER] bringt das Stadion zum Beben!",
        "Eiskalt vollstreckt von [PLAYER]! Neuer Spielstand: [SCORE_1] zu [SCORE_2]!",
        "Wie hat er den denn gemacht?! [PLAYER], du Teufelskerl!",
        "Einfach unwiderstehlich! Das war ein Schuss wie ein Donnerschlag!",
        "TOOOOOR! [TEAM] feiert seinen Torschützen [PLAYER] völlig zu Recht."
    ],
    eigentor: [
        "Ach du meine Güte! Das wird ein Internet-Hit. Eigentor von [PLAYER]!",
        "Kreisklasse! Ein Eigentor der absurdesten Sorte von [PLAYER].",
        "Das darf nicht wahr sein! Den wollte [PLAYER] so auf gar keinen Fall.",
        "Bitter, ganz bitter für [TEAM]... Ein katastrophales Missverständnis.",
        "Da sah [PLAYER] gar nicht gut aus. Der Ball ist im eigenen Kasten!",
        "Sowas sieht man extrem selten. Ein klassischer Blackout!"
    ],
    halbzeit_fuehrung: [
        "Die Hälfte der Zeit ist um. [LEADER] führt absolut verdient gegen [TRAILER].",
        "Wir sind bei der Halbzeit! Der aktuelle Spielstand lautet [SCORE_1] zu [SCORE_2] für [LEADER].",
        "Einwurf in die Statistik: Halbzeit. [LEADER] dominiert, [TRAILER] muss sich was einfallen lassen."
    ],
    halbzeit_unentschieden: [
        "Die Hälfte der Zeit ist rum, es steht [SCORE_1] zu [SCORE_2]. Alles noch komplett offen.",
        "Wir haben Halbzeit! Ein packendes Unentschieden bisher. Wer holt sich hier den Sieg?",
        "Halbzeitfazit: Ein taktisch geprägtes Remis. Niemand will hier ins offene Messer laufen."
    ],
    schlussphase_knapp: [
        "Nur noch 20 Sekunden auf der Uhr! [TRAILER] muss jetzt die Abteilung Brechstange rausholen!",
        "Gleich ist Schluss! Ein knapper Vorsprung für [LEADER]. [TRAILER] wirft jetzt alles nach vorne!",
        "Es tickt die Uhr! Ein dramatisch knappes Ergebnis. Kann [TRAILER] hier noch den Ausgleich erzwingen?"
    ],
    schlussphase_deutlich: [
        "Die Schlussphase bricht an, aber bei einem Stand von [SCORE_1] zu [SCORE_2] für [LEADER] ist die Messe hier gelesen.",
        "Der Drops ist gelutscht! [LEADER] führt hier absolut souverän gegen [TRAILER].",
        "Das lässt sich [LEADER] nicht mehr nehmen. Ein klarer Sieg bahnt sich an."
    ],
    schlussphase_unentschieden: [
        "Letzte Sekunden! Es steht [SCORE_1] zu [SCORE_2]. Wer setzt hier den absoluten Lucky Punch?",
        "Noch 20 Sekunden auf der Uhr! Das riecht nach einem Drama! Wer traut sich noch was?",
        "Herzschlagfinale! Niemand will hier den entscheidenden Fehler machen."
    ],
    verlaengerung_start: [
        "Die reguläre Spielzeit ist abgelaufen! Es steht unentschieden. Wir gehen ins Golden Goal!",
        "Unentschieden nach regulärer Spielzeit! Jetzt gibt es Golden Goal! Wer jetzt trifft, ist sofort der Sieger!",
        "Drama pur, liebe Zuschauer! Wir gehen in die Verlängerung. Golden Goal entscheidet!",
        "Das gibt's doch gar nicht! Keine Entscheidung in der regulären Spielzeit. Golden Goal Modus aktiviert!",
        "Die Spannung ist förmlich greifbar! Golden Goal! Ein einziger Fehler, ein genialer Moment entscheidet jetzt alles!",
        "Nichts für schwache Nerven! Wir starten in die Golden Goal Verlängerung. Der nächste Treffer beendet die Partie!"
    ],
    golden_goal: [
        "GOLDEN GOAL! GOLDEN GOAL! [PLAYER] macht das goldene Tor für [TEAM]! Das Spiel ist aus!",
        "Unfassbar! [PLAYER] erlöst [TEAM] mit dem Golden Goal! Was für ein Finale!",
        "Da ist es! Das Golden Goal! [PLAYER] trifft und beendet dieses epische Match!",
        "Das Spiel ist vorbei! Ein magischer Moment von [PLAYER]! Golden Goal für [TEAM]!",
        "JAAAAAAAA! Das ist die Entscheidung! [PLAYER] schießt [TEAM] mit dem Golden Goal in die nächste Runde!",
        "Wahnsinn! Da bricht der Jubelsturm los! Das Golden Goal durch [PLAYER] entscheidet die Partie!"
    ],
    golden_goal_abschluss: [
        "Ein Golden Goal, das in die Geschichte eingehen wird! [WINNER] feiert den Einzug in die nächste Runde, während für [LOSER] der Traum jäh endet.",
        "Dramatischer kann ein Spiel nicht enden. Das Golden Goal von [WINNER] war der Dolchstoß für [LOSER].",
        "So grausam kann Fußball sein. Ein einziger Moment, ein Golden Goal, und [WINNER] jubelt, [LOSER] trauert."
    ],
    turnier_finale_start: [
        "Meine Damen und Herren, das große Finale! Es geht um den Titel! [TEAM_1] gegen [TEAM_2], wer holt sich den Pokal?",
        "Willkommen zum Endspiel! Die Luft knistert, die Spannung ist greifbar. [TEAM_1] fordert [TEAM_2] zum ultimativen Duell!",
        "Das ist es also, das Finale! Nur noch ein Sieg trennt diese beiden Teams vom Ruhm. [TEAM_1] oder [TEAM_2] - eine Mannschaft wird heute Geschichte schreiben!"
    ],
    turnier_weiter: [
        "Was für eine Leistung! [TEAM] zieht in die nächste Runde ein!",
        "Der Traum lebt weiter! [TEAM] steht in der nächsten Runde dieses Turniers.",
        "Ein hartes Stück Arbeit, aber [TEAM] hat es geschafft und ist eine Runde weiter."
    ],
    turnier_aus: [
        "Das war's! Ein bitteres Ende für [TEAM]. Sie müssen die Koffer packen.",
        "Kopf hoch, [TEAM]! Sie haben alles gegeben, aber heute hat es nicht gereicht.",
        "Aus und vorbei. Das Turnier-Abenteuer ist für [TEAM] beendet."
    ],
    turnier_sieg: [
        "SIE HABEN ES GESCHAFFT! [TEAM] ist der Champion! Herzlichen Glückwunsch zum Turniersieg!",
        "Der Pokal geht an [TEAM]! Eine unglaubliche Reise endet mit dem ultimativen Triumph!",
        "Konfetti regnet nieder! [TEAM] stemmt den Pokal in die Höhe! Was für ein Moment, was für ein Turnier!"
    ],
    ende_sieg: [
        "Abpfiff! Das war's für heute. Ein spektakuläres Spiel mit [LEADER] als verdientem Sieger!",
        "Das Spiel ist aus. Ein wirklich toller Auftritt und ein Sieg für [LEADER].",
        "Der Schiri beendet die Partie. [LEADER] gewinnt das Duell. Ein denkwürdiges Spiel!"
    ],
    ende_unentschieden: [
        "Abpfiff! Am Ende reicht es für keinen der beiden. Ein leistungsgerechtes Unentschieden.",
        "Das Spiel ist aus. Keiner konnte hier den finalen Stich setzen. Es bleibt beim Remis.",
        "Der Schiedsrichter pfeift ab. Eine harte Schlacht endet ohne echten Sieger."
    ]
};

function spreche(kategorie, playerObj, context = null) {
    if (!gameSettings.commentary || !soundEnabled) return;
    
    if (synth.speaking) {
        // Nur bei extrem wichtigen Ereignissen darf der laufende Kommentar abgebrochen werden
        if (["tor", "eigentor", "ende_sieg", "ende_unentschieden", "golden_goal", "verlaengerung_start", "turnier_sieg", "turnier_aus"].includes(kategorie)) {
            synth.cancel();
        } else {
            return; // Ansonsten wird der neue Satz einfach nicht gesprochen, bis wieder Stille ist
        }
    }

    let list = sprueche[kategorie]; if (!list) return;
    let spruch = list[Math.floor(Math.random() * list.length)];
    
    if (["start", "liga_start", "turnier_start"].includes(kategorie)) {
        if (Math.random() > 0.2) { // Zu 80% Wetter/Tageszeit anhängen
            let wKey = gameSettings.weather === "sun" && gameSettings.time === "night" ? "wetter_night" : "wetter_" + gameSettings.weather;
            let wList = sprueche[wKey];
            if (wList) spruch += " " + wList[Math.floor(Math.random() * wList.length)];
        }
    }

    let leader = score.r > score.b ? spieler1.team : (score.b > score.r ? spieler2.team : "niemand");
    let trailer = score.r < score.b ? spieler1.team : (score.b < score.r ? spieler2.team : "niemand");

    if (playerObj) { spruch = spruch.replace(/\[PLAYER\]/g, playerObj.name).replace(/\[TEAM\]/g, playerObj.team); }
    spruch = spruch.replace(/\[TEAM_1\]/g, spieler1.team).replace(/\[TEAM_2\]/g, spieler2.team).replace(/\[SCORE_1\]/g, score.r).replace(/\[SCORE_2\]/g, score.b).replace(/\[LEADER\]/g, leader).replace(/\[TRAILER\]/g, trailer);
    
    if (context) {
        if (context.winner) spruch = spruch.replace(/\[WINNER\]/g, context.winner);
        if (context.loser) spruch = spruch.replace(/\[LOSER\]/g, context.loser);
    }
    
    if (kategorie === "liga_start") {
        let pos1 = getLeaguePosPhrase(spieler1.team);
        let pos2 = getLeaguePosPhrase(spieler2.team);
        let form1 = getLeagueFormPhrase(spieler1.team);
        let form2 = getLeagueFormPhrase(spieler2.team);
        let context = getLeagueContextPhrase(spieler1.team, spieler2.team);
        let md = leagueState ? leagueState.matchday + 1 : 1;
        spruch = spruch.replace(/\[POS_1\]/g, pos1).replace(/\[POS_2\]/g, pos2).replace(/\[FORM_1\]/g, form1).replace(/\[FORM_2\]/g, form2).replace(/\[MATCHDAY\]/g, md);
        spruch = spruch.replace(/  +/g, ' ').replace(/ \./g, '.'); 
        if (context) spruch += " " + context;
    }
    
    let utterThis = new SpeechSynthesisUtterance(spruch);
    utterThis.lang = 'de-DE'; utterThis.rate = 1.15;
    if (gameSettings.voiceIndex !== "default" && availableVoices[gameSettings.voiceIndex]) {
        utterThis.voice = availableVoices[gameSettings.voiceIndex];
    }
    synth.speak(utterThis);
}

document.getElementById("btnSound").addEventListener("click", function() {
    soundEnabled = !soundEnabled; this.innerText = soundEnabled ? "🔊" : "🔇"; initAudio();
});

function initAudio() { 
    if (!audioCtx && soundEnabled) { 
        window.AudioContext = window.AudioContext || window.webkitAudioContext; 
        audioCtx = new window.AudioContext(); 
        let bufferSize = audioCtx.sampleRate * 2; let noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); let output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        let noiseSource = audioCtx.createBufferSource(); noiseSource.buffer = noiseBuffer; noiseSource.loop = true;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
        crowdGainNode = audioCtx.createGain(); crowdGainNode.gain.value = 0;
        noiseSource.connect(filter); filter.connect(crowdGainNode); crowdGainNode.connect(audioCtx.destination);
        noiseSource.start(0);
    } 
}

function playSound(type, xPos = BREITE/2) {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator(); 
    const gainNode = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, (xPos - BREITE/2) / (BREITE/2))); 
    
    osc.connect(gainNode); gainNode.connect(panner); panner.connect(audioCtx.destination);
    
    let now = audioCtx.currentTime;
    if (type === 'kick') { osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1); gainNode.gain.setValueAtTime(0.5, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'whistle') { osc.type = 'square'; osc.frequency.setValueAtTime(2000, now); osc.frequency.setValueAtTime(2200, now + 0.1); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
    else if (type === 'goal') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.5); gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.5, now + 0.2); gainNode.gain.linearRampToValueAtTime(0, now + 1.5); osc.start(now); osc.stop(now + 1.5); }
}

// --- VISUALS & ANALYTICS ---
let particles = []; let screenShake = 0; let visualBallTrail = [];
let matchStats = { p1Shots: 0, p2Shots: 0, p1Dist: 0, p2Dist: 0, p1Poss: 0, p2Poss: 0 };
let heatmapData = []; let frameCounter = 0;

function createExplosion(x, y, farbe) { for (let i = 0; i < 30; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1.0, color: farbe, size: Math.random() * 5 + 2 }); }
function createDust(x, y) { if (Math.random() > 0.5) particles.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: 0, vy: -1, life: 0.5, color: "rgba(255,255,255,0.4)", size: 3 }); }

// --- SPIELFIGUREN (Ohne Ausdauer/Dash, dafür etwas schneller) ---
let ball = { x: 500, y: 300, radius: 10, farbe: "white", dx: 0, dy: 0 };
let spieler1 = { x: 100, y: 300, radius: 25, img: new Image(), name: "", team: "", baseSpeed: 7 };
let spieler2 = { x: 900, y: 300, radius: 25, img: new Image(), name: "", team: "", baseSpeed: 7 };
spieler1.img.crossOrigin = "anonymous"; spieler2.img.crossOrigin = "anonymous";

let score = { r: 0, b: 0 }; let spielLaeuft = false; let ballBeruehrt = false; let spielZeit = 120; let isReplay = false; let replayBuffer = []; let isGoldenGoal = false;

// --- KADER (PES TRICK) ---
const teamFarben = { "Rheinland Leverkusen": "#e32221", "FC Bavaria München": "#dc052d", "SC Schwaben Stuttgart": "#e32228", "SC Westfalen Dortmund": "#fde100", "Rasenclub Leipzig": "#dd013f", "SG Frankfurt": "#000000", "1899 Kraichgau": "#0066b2", "FC Ostalb Heidenheim": "#e2001a", "SV Weser Bremen": "#1d9053", "FC Breisgau": "#c0001f", "Schwaben Augsburg": "#ba3733", "Wölfe Niedersachsen": "#65b32e", "FSV Rheinhessen": "#ed1c24", "Borussia Niederrhein": "#1f1f1f", "SC Eisern Berlin": "#d4011d", "Kiezclub Hamburg": "#533527", "Hanseaten Hamburg": "#005ca9", "Domstadt Köln": "#ed1c24" };
const teamKader = { "Rheinland Leverkusen": ["F. Wurz", "G. Chaka", "J. Frempong"], "FC Bavaria München": ["H. Caine", "J. Musiolo", "L. Zané"], "SC Schwaben Stuttgart": ["A. Nöbel", "A. Steller", "E. Milot"], "SC Westfalen Dortmund": ["J. Brondt", "N. Schlotter", "S. Girassi"], "Rasenclub Leipzig": ["X. Symons", "L. Oponda", "B. Sisko"], "SG Frankfurt": ["O. Marmosh", "H. Ekitoko", "M. Götzer"], "1899 Kraichgau": ["A. Kramarik", "O. Bumann", "A. Stoch"], "FC Ostalb Heidenheim": ["P. Wonnar", "M. Piringer", "K. Möller"], "SV Weser Bremen": ["M. Waiser", "R. Schmidt", "M. Dacksch"], "FC Breisgau": ["V. Grifa", "R. Doon", "C. Ginter"], "Schwaben Augsburg": ["P. Titz", "F. Darmen", "A. Mair"], "Wölfe Niedersachsen": ["M. Arnoldt", "J. Wint", "L. Majar"], "FSV Rheinhessen": ["J. Burkard", "N. Amari", "R. Zentnar"], "Borussia Niederrhein": ["T. Kleindinst", "A. Plia", "F. Honorot"], "SC Eisern Berlin": ["K. Vollandt", "C. Trommel", "F. Rönna"], "Kiezclub Hamburg": ["J. Irvin", "J. Eggestin", "N. Vasil"], "Hanseaten Hamburg": ["R. Glatzl", "L. Rais", "J. Maffert"], "Domstadt Köln": ["F. Keinz", "E. Martl", "T. Hobers"] };
const teamKuerzel = { "Rheinland Leverkusen": "LEV", "FC Bavaria München": "FCB", "SC Schwaben Stuttgart": "SCS", "SC Westfalen Dortmund": "SCW", "Rasenclub Leipzig": "RCL", "SG Frankfurt": "SGF", "1899 Kraichgau": "1899", "FC Ostalb Heidenheim": "FCH", "SV Weser Bremen": "SVW", "FC Breisgau": "FRE", "Schwaben Augsburg": "AUG", "Wölfe Niedersachsen": "WÖL", "FSV Rheinhessen": "FSV", "Borussia Niederrhein": "NIE", "SC Eisern Berlin": "SCE", "Kiezclub Hamburg": "KIE", "Hanseaten Hamburg": "HAN", "Domstadt Köln": "KÖL" };

function getTeamLogoUrl(team) {
    let txt = teamKuerzel[team] || team.substring(0,3).toUpperCase();
    let svgContent = '';
    
    switch(team) {
        case "FC Bavaria München": // Konzentrische Kreise (Bayern-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#dc052d"/><circle cx="50" cy="50" r="32" fill="#fff"/><circle cx="50" cy="50" r="22" fill="#0066b2"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "SC Westfalen Dortmund": // Gelber Kreis, schwarzer Rand (BVB-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#fde100" stroke="#000" stroke-width="6"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#000" text-anchor="middle">${txt}</text>`;
            break;
        case "SV Weser Bremen": // Grüne Raute (Werder-Style)
            svgContent = `<polygon points="50,5 95,50 50,95 5,50" fill="#1d9053"/><polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#fff" stroke-width="4"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "Hanseaten Hamburg": // Blaue Flagge in Raute (HSV-Style)
            svgContent = `<polygon points="50,5 95,50 50,95 5,50" fill="#005ca9"/><polygon points="50,15 85,50 50,85 15,50" fill="#fff"/><polygon points="50,22 78,50 50,78 22,50" fill="#000"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "Borussia Niederrhein": // Schwarz-Weiße Raute (Gladbach-Style)
            svgContent = `<polygon points="50,5 95,50 50,95 5,50" fill="#fff" stroke="#000" stroke-width="4"/><polygon points="50,20 80,50 50,80 20,50" fill="#1f1f1f"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "Kiezclub Hamburg": // Braunes Rechteck (St. Pauli-Style)
            svgContent = `<rect x="10" y="10" width="80" height="80" rx="10" fill="#533527" stroke="#fff" stroke-width="4"/><circle cx="50" cy="50" r="25" fill="#fff"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#533527" text-anchor="middle">${txt}</text>`;
            break;
        case "Rheinland Leverkusen": // Roter Kreis, innerer Rand (Leverkusen-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#e32221" stroke="#000" stroke-width="6"/><circle cx="50" cy="50" r="33" fill="none" stroke="#fff" stroke-width="3"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "1899 Kraichgau": // Schild mit diagonaler Linie (Hoffenheim-Style)
            svgContent = `<path d="M15,15 L85,15 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="#0066b2" stroke="#fff" stroke-width="4"/><line x1="20" y1="20" x2="80" y2="80" stroke="#fff" stroke-width="8"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#fff" stroke="#0066b2" stroke-width="1.5" text-anchor="middle">${txt}</text>`;
            break;
        case "Wölfe Niedersachsen": // Grüner Kreis mit stilisiertem W (Wolfsburg-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#65b32e" stroke="#fff" stroke-width="6"/><path d="M25,35 L40,70 L50,50 L60,70 L75,35" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><text x="50%" y="82%" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "SG Frankfurt": // Schwarzer Kreis, roter Rand (Frankfurt-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#000" stroke="#e32221" stroke-width="6"/><path d="M50,15 L75,50 L50,85 L25,50 Z" fill="#fff"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#000" text-anchor="middle">${txt}</text>`;
            break;
        case "Domstadt Köln": // Geteilter Kreis Oben/Unten (Köln-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#fff" stroke="#ed1c24" stroke-width="6"/><path d="M5,50 A45,45 0 0,0 95,50 Z" fill="#ed1c24"/><text x="50%" y="32%" dy="0.35em" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ed1c24" text-anchor="middle">1.FC</text><text x="50%" y="72%" dy="0.35em" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "FC Breisgau": // Schild halb Schwarz/Rot, halb Weiß (Freiburg-Style)
            svgContent = `<path d="M15,10 L85,10 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="#c0001f" stroke="#fff" stroke-width="4"/><path d="M15,10 L85,10 L15,75 Z" fill="#fff"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#000" stroke="#fff" stroke-width="1" text-anchor="middle">${txt}</text>`;
            break;
        case "SC Schwaben Stuttgart": // Schild mit Brustring (Stuttgart-Style)
            svgContent = `<path d="M15,15 L85,15 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="#fff" stroke="#e32228" stroke-width="5"/><rect x="15" y="40" width="70" height="20" fill="#e32228"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "Rasenclub Leipzig": // Schild mit abstrakten "Bullen" (Leipzig-Style)
            svgContent = `<path d="M15,10 L85,10 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="#fff" stroke="#dd013f" stroke-width="5"/><polygon points="20,40 45,60 20,80" fill="#dd013f"/><polygon points="80,40 55,60 80,80" fill="#002147"/><text x="50%" y="25%" dy="0.35em" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#000" text-anchor="middle">${txt}</text>`;
            break;
        case "Schwaben Augsburg": // Schild mit 3 vertikalen Streifen (Augsburg-Style)
            svgContent = `<defs><clipPath id="aug"><path d="M15,10 L85,10 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z"/></clipPath></defs><g clip-path="url(#aug)"><rect x="0" y="0" width="100" height="100" fill="#fff"/><rect x="15" y="10" width="24" height="90" fill="#ba3733"/><rect x="39" y="10" width="22" height="90" fill="#1d9053"/></g><path d="M15,10 L85,10 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="none" stroke="#ba3733" stroke-width="6"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#fff" stroke="#000" stroke-width="1.5" text-anchor="middle">${txt}</text>`;
            break;
        case "FC Ostalb Heidenheim": // Vertikal geteiltes Schild (Heidenheim-Style)
            svgContent = `<path d="M15,10 L85,10 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="#e2001a" stroke="#fff" stroke-width="4"/><path d="M50,10 L85,10 L85,55 C85,85 50,95 50,95 Z" fill="#002d5a"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        case "SC Eisern Berlin": // Rot-Gelber Kreis (Union Berlin-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#d4011d" stroke="#fff" stroke-width="4"/><circle cx="50" cy="50" r="32" fill="#ffd700" stroke="#000" stroke-width="2"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#d4011d" text-anchor="middle">${txt}</text>`;
            break;
        case "FSV Rheinhessen": // Roter Kreis mit großer weißer "M"-Zacke (Mainz-Style)
            svgContent = `<circle cx="50" cy="50" r="45" fill="#ed1c24" stroke="#fff" stroke-width="5"/><path d="M25,30 L40,70 L50,50 L60,70 L75,30" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><text x="50%" y="82%" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">${txt}</text>`;
            break;
        default: // Fallback Schild
            let bg = teamFarben[team] || "#000";
            svgContent = `<path d="M15,10 L85,10 L85,55 C85,85 50,95 50,95 C50,95 15,85 15,55 Z" fill="${bg}" stroke="#ffffff" stroke-width="4"/><text x="50%" y="50%" dy="0.35em" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${txt}</text>`;
    }
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svgContent}</svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function updatePlayerUI() {
    let tL = document.getElementById("teamLeft").value; let tR = document.getElementById("teamRight").value;
    spieler1.team = tL; spieler2.team = tR; spieler1.farbe = teamFarben[tL]; spieler2.farbe = teamFarben[tR];
    let pL = document.getElementById("playerLeft"); let pR = document.getElementById("playerRight");
    pL.innerHTML = teamKader[tL].map(n => `<option value="${n}">${n}</option>`).join("");
    pR.innerHTML = teamKader[tR].map(n => `<option value="${n}">${n}</option>`).join("");
    spieler1.name = pL.value; spieler2.name = pR.value;
    spieler1.img.src = `https://api.dicebear.com/8.x/notionists/png?seed=${spieler1.name}&backgroundColor=transparent`;
    spieler2.img.src = `https://api.dicebear.com/8.x/notionists/png?seed=${spieler2.name}&backgroundColor=transparent`;
    document.getElementById("scoreRed").style.borderBottomColor = spieler1.farbe; document.getElementById("scoreBlue").style.borderBottomColor = spieler2.farbe;
    document.getElementById("logoLeft").src = getTeamLogoUrl(tL); document.getElementById("logoRight").src = getTeamLogoUrl(tR);
}
document.getElementById("teamLeft").onchange = updatePlayerUI; document.getElementById("teamRight").onchange = updatePlayerUI;
document.getElementById("playerLeft").onchange = () => { spieler1.name = document.getElementById("playerLeft").value; spieler1.img.src = `https://api.dicebear.com/8.x/notionists/png?seed=${spieler1.name}&backgroundColor=transparent`; };
document.getElementById("playerRight").onchange = () => { spieler2.name = document.getElementById("playerRight").value; spieler2.img.src = `https://api.dicebear.com/8.x/notionists/png?seed=${spieler2.name}&backgroundColor=transparent`; };
updatePlayerUI();

let currentAiMode = "human"; let aiTargetX = BREITE-100, aiTargetY = HOEHE/2, aiUpdateCounter = 0, aiLastX = BREITE-100, aiLastY = HOEHE/2, aiStuckFrames = 0, aiBallHistory = [];
document.getElementById("aiSelect").addEventListener("change", () => { currentAiMode = document.getElementById("aiSelect").value; spieler2.baseSpeed = currentAiMode==="ai1"?5:currentAiMode==="ai2"?7:currentAiMode==="ai3"?9:7; });

function speichereErgebnis(tName, typ) {
    let t = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    if (!t[tName]) t[tName] = { siege: 0, unentschieden: 0, niederlagen: 0 };
    if (typ === "s") t[tName].siege++; if (typ === "u") t[tName].unentschieden++; if (typ === "n") t[tName].niederlagen++;
    localStorage.setItem('fifaTabelle', JSON.stringify(t));
}
function aktualisiereTabelle() {
    let t = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    let b = document.getElementById("leaderboardBody"); b.innerHTML = "";
    let arr = []; for (let n in t) { arr.push({name: n, stats: t[n], pts: (t[n].siege * 3) + t[n].unentschieden}); }
    arr.sort((x, y) => y.pts - x.pts);
    arr.forEach((m, i) => { let logo = `<img src="${getTeamLogoUrl(m.name)}" style="width:20px; height:20px; vertical-align:middle; margin-right:8px;">`; let r = document.createElement("tr"); r.innerHTML = `<td>${logo}<strong>${i+1}. ${m.name}</strong></td><td>${m.stats.siege}</td><td>${m.stats.unentschieden}</td><td>${m.stats.niederlagen}</td>`; b.appendChild(r); });
}
aktualisiereTabelle();

// --- CONTROLS ---
const tasten = {}; let mouseX = null, mouseY = null, mouseActive = false;
window.addEventListener("keydown", e => { tasten[e.key] = true; if (["w","a","s","d","W","A","S","D"].includes(e.key)) mouseActive = false; initAudio(); });
window.addEventListener("keyup", e => tasten[e.key] = false);
canvas.addEventListener("mousemove", e => { let r = canvas.getBoundingClientRect(); mouseX = (e.clientX - r.left) * (BREITE / r.width); mouseY = (e.clientY - r.top) * (HOEHE / r.height); mouseActive = true; });
canvas.addEventListener("touchstart", e => { e.preventDefault(); let r = canvas.getBoundingClientRect(); let t = e.touches[0]; mouseX = (t.clientX - r.left) * (BREITE / r.width); mouseY = (t.clientY - r.top) * (HOEHE / r.height) - 40; mouseActive = true; initAudio(); }, {passive: false});
canvas.addEventListener("touchmove", e => { e.preventDefault(); let r = canvas.getBoundingClientRect(); let t = e.touches[0]; mouseX = (t.clientX - r.left) * (BREITE / r.width); mouseY = (t.clientY - r.top) * (HOEHE / r.height) - 40; }, {passive: false});

let p1Gp = { x: 0, y: 0 }; let p2Gp = { x: 0, y: 0 };
function updateGps() {
    p1Gp = {x: 0, y: 0}; p2Gp = {x: 0, y: 0};
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let v = []; for(let i = 0; i < gps.length; i++) { if(gps[i] && gps[i].connected) v.push(gps[i]); }
    if (v[0]) { p1Gp.x = Math.abs(v[0].axes[0]) > 0.2 ? v[0].axes[0] : 0; p1Gp.y = Math.abs(v[0].axes[1]) > 0.2 ? v[0].axes[1] : 0; }
    if (v[1]) { if (currentAiMode !== "human") { document.getElementById("aiSelect").value = "human"; document.getElementById("aiSelect").dispatchEvent(new Event('change')); } p2Gp.x = Math.abs(v[1].axes[0]) > 0.2 ? v[1].axes[0] : 0; p2Gp.y = Math.abs(v[1].axes[1]) > 0.2 ? v[1].axes[1] : 0; }
}

// --- WETTER & TURNIER ---
let weatherType = "sun"; let groundPatches = []; let tournamentMatches = []; let currentMatchIndex = 0; let letzterFrame = Date.now(); let torTextBis = 0;
function initWeather() {
    groundPatches = []; weatherType = gameSettings.weather;
    if (weatherType === "rain") { for (let i = 0; i < 4; i++) groundPatches.push({x: Math.random() * BREITE, y: Math.random() * HOEHE, r: 40 + Math.random() * 50, type: "mud"}); } 
    else if (weatherType === "snow") { for (let i = 0; i < 6; i++) groundPatches.push({x: Math.random() * BREITE, y: Math.random() * HOEHE, r: 30 + Math.random() * 40, type: "snowpile"}); }
}
function initTournament() {
    let tL = document.getElementById("teamLeft").value;
    let g = Object.keys(teamFarben).filter(t => t !== tL); g.sort(() => 0.5 - Math.random());
    tournamentMatches = [ {t1: tL, t2: g[0], stage: "Viertelfinale"}, {t1: "Sieger VF", t2: g[1], stage: "Halbfinale"}, {t1: "Sieger HF", t2: g[2], stage: "Finale"} ];
    currentMatchIndex = 0; zeigeTurnierBaum();
}
function zeigeTurnierBaum() {
    let c = document.getElementById("bracket-container"); c.innerHTML = "";
    tournamentMatches.forEach((m, i) => { 
        let logo1 = m.t1.includes("Sieger") ? "" : `<img src="${getTeamLogoUrl(m.t1)}" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;">`;
        let logo2 = m.t2.includes("Sieger") ? "" : `<img src="${getTeamLogoUrl(m.t2)}" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;">`;
        let d = document.createElement("div"); d.className = "bracket-match" + (i === currentMatchIndex ? " match-active" : ""); d.innerHTML = `<small>${m.stage}</small><br>${logo1}<strong>${m.t1}</strong><br>vs<br>${logo2}<strong>${m.t2}</strong>`; c.appendChild(d); 
    });
    document.getElementById("tournament-overlay").classList.remove("hidden");
}
document.getElementById("btnNextMatch").addEventListener("click", () => {
    document.getElementById("tournament-overlay").classList.add("hidden");
    let match = tournamentMatches[currentMatchIndex];
    document.getElementById("teamLeft").value = match.t1; document.getElementById("teamRight").value = match.t2;
    updatePlayerUI(); startMatch();
});

// --- LIGA MODUS ---
let leagueState = null;
function updateTeamNamesUI() {
    if (!leagueState) return;
    document.querySelectorAll(".team-select").forEach(sel => {
        if (sel.id === "teamLeft" || sel.id === "teamRight") {
            Array.from(sel.options).forEach(opt => {
                let suffix = "";
                if (opt.value === leagueState.champion) suffix += " 🏆";
                if (leagueState.promoted && leagueState.promoted.includes(opt.value)) suffix += " (N)";
                if (leagueState.relegated && leagueState.relegated.includes(opt.value)) suffix += " (A)";
                if (opt.value === leagueState.redLantern) suffix += " 🏮";
                opt.textContent = opt.value + suffix;
            });
        }
    });
}
function loadLeagueState() { let saved = localStorage.getItem('fifaLeague'); if (saved) { leagueState = JSON.parse(saved); if(!leagueState.results) leagueState.results = {1:{}, 2:{}, 3:{}}; updateTeamNamesUI(); } }
loadLeagueState();

function initLeague() {
    if (!leagueState) {
        let teams = Object.keys(teamFarben);
        leagueState = {
            season: 1, redLantern: null, champion: null, promoted: [], relegated: [],
            leagues: { 1: teams.slice(0, 6), 2: teams.slice(6, 12), 3: teams.slice(12, 18) },
            stats: {}, fixtures: { 1: [], 2: [], 3: [] }, matchday: 0, results: { 1: {}, 2: {}, 3: {} }
        };
        startNewSeason();
    }
    leagueState.userTeam = document.getElementById("teamLeft").value;
    zeigeLiga();
}

function startNewSeason() {
    leagueState.stats = {};
    leagueState.results = { 1: {}, 2: {}, 3: {} };
    [1, 2, 3].forEach(l => {
        leagueState.leagues[l].forEach(t => { leagueState.stats[t] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
        leagueState.fixtures[l] = generateFixtures(leagueState.leagues[l]);
    });
    leagueState.matchday = 0;
    localStorage.setItem('fifaLeague', JSON.stringify(leagueState));
}

function generateFixtures(teams) {
    const matchups = [ [[0,5], [1,4], [2,3]], [[5,3], [4,2], [0,1]], [[1,5], [2,0], [3,4]], [[5,4], [0,3], [1,2]], [[2,5], [3,1], [4,0]] ];
    let fixtures = [];
    matchups.forEach(round => fixtures.push(round.map(m => ({ home: teams[m[0]], away: teams[m[1]] })))); // Hinrunde
    matchups.forEach(round => fixtures.push(round.map(m => ({ home: teams[m[1]], away: teams[m[0]] })))); // Rückrunde
    return fixtures;
}

function zeigeLiga() {
    let uTeam = leagueState.userTeam;
    let myLeague = leagueState.leagues[1].includes(uTeam) ? 1 : leagueState.leagues[2].includes(uTeam) ? 2 : 3;
    document.getElementById("leagueTitle").innerText = `🏆 Saison ${leagueState.season} - Liga ${myLeague}`;
    
    let standings = leagueState.leagues[myLeague].map(t => ({ name: t, ...leagueState.stats[t] }));
    standings.sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; return (b.gf - b.ga) - (a.gf - a.ga); });
    
    let html = `<table style="width:100%; color:white; border-collapse: collapse; text-align: left;">
        <tr style="border-bottom: 1px solid #555; background:rgba(255,255,255,0.1);">
        <th style="padding:5px;">Pl.</th><th>Team</th><th>Sp</th><th>Tore</th><th>Pkt</th></tr>`;
    standings.forEach((s, i) => {
        let suffix = "";
        if (s.name === leagueState.champion) suffix += " 🏆";
        if (leagueState.promoted && leagueState.promoted.includes(s.name)) suffix += " (N)";
        if (leagueState.relegated && leagueState.relegated.includes(s.name)) suffix += " (A)";
        if (s.name === leagueState.redLantern) suffix += " 🏮";
        let logo = `<img src="${getTeamLogoUrl(s.name)}" style="width:20px; height:20px; vertical-align:middle; margin-right:8px;">`;
        let isUser = s.name === uTeam ? 'style="font-weight:bold; color:#fde100; background:rgba(255,255,255,0.05);"' : '';
        html += `<tr ${isUser}><td style="padding:5px;">${i+1}.</td><td>${logo}${s.name}${suffix}</td><td>${s.p}</td><td>${s.gf}:${s.ga}</td><td>${s.pts}</td></tr>`;
    });
    html += `</table>`;
    document.getElementById("league-standings").innerHTML = html;
    
    let resultsHtml = `<h3 style="margin-top:0; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px;">Letzter Spieltag</h3>`;
    if (leagueState.matchday > 0 && leagueState.results[myLeague] && leagueState.results[myLeague][leagueState.matchday - 1]) {
        let lastMatches = leagueState.results[myLeague][leagueState.matchday - 1];
        lastMatches.forEach(m => {
            let isUser = (m.home === uTeam || m.away === uTeam) ? 'color:#fde100; font-weight:bold;' : 'color:#ccc;';
            resultsHtml += `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.1); font-size:14px; ${isUser}">
                <span style="flex:1; text-align:right; padding-right:10px;">${teamKuerzel[m.home] || m.home.substring(0,3).toUpperCase()}</span>
                <span style="background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:4px;">${m.gh} : ${m.ga}</span>
                <span style="flex:1; text-align:left; padding-left:10px;">${teamKuerzel[m.away] || m.away.substring(0,3).toUpperCase()}</span>
            </div>`;
        });
    } else {
        resultsHtml += `<p style="font-size:12px; color:#aaa; margin-top:15px;">Noch keine Spiele gespielt.</p>`;
    }
    document.getElementById("league-last-results").innerHTML = resultsHtml;

    let mdFixtures = leagueState.fixtures[myLeague][leagueState.matchday];
    let myMatch = mdFixtures.find(m => m.home === uTeam || m.away === uTeam);
    let myLogo1 = `<img src="${getTeamLogoUrl(myMatch.home)}" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;">`;
    let myLogo2 = `<img src="${getTeamLogoUrl(myMatch.away)}" style="width:16px; height:16px; vertical-align:middle; margin-left:4px; margin-right:4px;">`;
    document.getElementById("leagueNextMatchText").innerHTML = `Spieltag ${leagueState.matchday + 1}:<br>${myLogo1}${myMatch.home} vs ${myLogo2}${myMatch.away}`;
    document.getElementById("league-overlay").classList.remove("hidden");
}

document.getElementById("btnNextLeagueMatch").addEventListener("click", () => {
    document.getElementById("league-overlay").classList.add("hidden");
    let uTeam = leagueState.userTeam;
    let myLeague = leagueState.leagues[1].includes(uTeam) ? 1 : leagueState.leagues[2].includes(uTeam) ? 2 : 3;
    let myMatch = leagueState.fixtures[myLeague][leagueState.matchday].find(m => m.home === uTeam || m.away === uTeam);
    
    document.getElementById("teamLeft").value = uTeam;
    document.getElementById("teamRight").value = myMatch.home === uTeam ? myMatch.away : myMatch.home;
    updatePlayerUI(); startMatch();
});

document.getElementById("btnCloseLeague").addEventListener("click", () => {
    document.getElementById("league-overlay").classList.add("hidden");
    document.getElementById("tabelle-container").style.display = "block";
});

function updateLeagueMatch(t1, g1, t2, g2, leagueIdx = null, matchdayIdx = null) {
    let s1 = leagueState.stats[t1], s2 = leagueState.stats[t2];
    s1.p++; s2.p++; s1.gf += g1; s1.ga += g2; s2.gf += g2; s2.ga += g1;
    if (g1 > g2) { s1.w++; s1.pts += 3; s2.l++; s1.lastRes = 'w'; s2.lastRes = 'l'; } 
    else if (g1 < g2) { s2.w++; s2.pts += 3; s1.l++; s1.lastRes = 'l'; s2.lastRes = 'w'; } 
    else { s1.d++; s2.d++; s1.pts += 1; s2.pts += 1; s1.lastRes = 'd'; s2.lastRes = 'd'; }

    if (leagueIdx !== null && matchdayIdx !== null) {
        if (!leagueState.results[leagueIdx]) leagueState.results[leagueIdx] = {};
        if (!leagueState.results[leagueIdx][matchdayIdx]) leagueState.results[leagueIdx][matchdayIdx] = [];
        leagueState.results[leagueIdx][matchdayIdx].push({ home: t1, away: t2, gh: g1, ga: g2 });
    }
}

function getLeaguePosPhrase(teamName) {
    if (!leagueState) return "Tabellenmittelfeld";
    let myLeague = leagueState.leagues[1].includes(teamName) ? 1 : leagueState.leagues[2].includes(teamName) ? 2 : 3;
    let standings = leagueState.leagues[myLeague].map(t => ({ name: t, ...leagueState.stats[t] }));
    standings.sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; return (b.gf - b.ga) - (a.gf - a.ga); });
    let pos = standings.findIndex(s => s.name === teamName) + 1;
    if (pos === 1) return "Spitzenreiter";
    if (pos === 2) return "Tabellenzweiter";
    if (pos === standings.length) return "Schlusslicht";
    return `Tabellen-${pos}.`;
}

function getLeagueFormPhrase(teamName) {
    if (!leagueState || leagueState.matchday === 0 || !leagueState.stats[teamName].lastRes) return "";
    let res = leagueState.stats[teamName].lastRes;
    if (res === 'w') { let w = ["mit viel Selbstvertrauen nach dem letzten Sieg", "mit breiter Brust durch den jüngsten Erfolg", "nach dem starken Dreier am letzten Spieltag", "und reitet aktuell auf einer echten Erfolgswelle"]; return w[Math.floor(Math.random() * w.length)]; }
    if (res === 'l') { let l = ["mit ordentlich Wut im Bauch nach der Pleite zuletzt", "nach der jüngsten Niederlage auf Wiedergutmachung aus", "und muss heute nach dem Patzer zuletzt eine Reaktion zeigen", "und steht nach der letzten Nullnummer ordentlich unter Druck"]; return l[Math.floor(Math.random() * l.length)]; }
    if (res === 'd') { let d = ["nach der Punkteteilung im letzten Spiel", "und will nach dem Unentschieden heute mehr", "nach dem Remis vom letzten Spieltag", "und hofft nach der letzten Punkteteilung auf einen Dreier heute"]; return d[Math.floor(Math.random() * d.length)]; }
    return "";
}

function getLeagueContextPhrase(t1, t2) {
    if (!leagueState) return "";
    let myLeague = leagueState.leagues[1].includes(t1) ? 1 : leagueState.leagues[2].includes(t1) ? 2 : 3;
    let standings = leagueState.leagues[myLeague].map(t => ({ name: t, ...leagueState.stats[t] }));
    standings.sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; return (b.gf - b.ga) - (a.gf - a.ga); });
    
    let md = leagueState.matchday; let remainingGames = 9 - md; let remainingPts = remainingGames * 3;
    let phrases = [];
    
    if (md >= 6) {
        if (myLeague === 1) {
            let first = standings[0]; let second = standings[1];
            if (first.name === t1 && first.pts > second.pts + remainingPts) phrases.push("Sie sind bereits rechnerisch Meister! Ein echtes Schaulaufen für die Fans heute.");
            else if (first.name === t1 && first.pts + 3 > second.pts + remainingPts && first.pts <= second.pts + remainingPts) phrases.push("Die Spannung ist greifbar! Mit einem Dreier heute machen sie die Meisterschaft rechnerisch klar.");
        }
        let last = standings[standings.length - 1]; let safePos = standings[standings.length - 2];
        if (last.name === t1 && last.pts + remainingPts < safePos.pts) phrases.push("Traurige Gewissheit für die Hausherren: Der Abstieg steht bereits rechnerisch fest.");
    }
    
    if (md >= 5 && leagueState.results && leagueState.results[myLeague] && leagueState.results[myLeague][md - 5]) {
        let hMatch = leagueState.results[myLeague][md - 5].find(m => (m.home === t1 && m.away === t2) || (m.home === t2 && m.away === t1));
        if (hMatch) { let tore1 = hMatch.home === t1 ? hMatch.gh : hMatch.ga; let tore2 = hMatch.away === t2 ? hMatch.ga : hMatch.gh; phrases.push(`Wir befinden uns bereits in der Rückrunde! Das Hinspiel endete ${tore1} zu ${tore2}.`); }
    }
    return phrases.length > 0 ? phrases.join(" ") : "";
}

function handleEndOfSeason() {
    let text = `Saison ${leagueState.season} beendet!\n\n`;
    let sorted = {};
    [1, 2, 3].forEach(l => {
        sorted[l] = leagueState.leagues[l].slice().sort((a, b) => {
            let sA = leagueState.stats[a], sB = leagueState.stats[b];
            if (sB.pts !== sA.pts) return sB.pts - sA.pts; return (sB.gf - sB.ga) - (sA.gf - sA.ga);
        });
    });
    
    leagueState.champion = sorted[1][0];
    leagueState.relegated = [sorted[1][5], sorted[2][5]];
    leagueState.promoted = [sorted[2][0], sorted[3][0]];
    leagueState.redLantern = sorted[3][5];

    text += `Meister: ${sorted[1][0]} 🏆\nAbsteiger Liga 1: ${sorted[1][5]}\n\nAufsteiger in Liga 1: ${sorted[2][0]}\nAbsteiger Liga 2: ${sorted[2][5]}\n\nAufsteiger in Liga 2: ${sorted[3][0]}\n`;
    let newL1 = sorted[1].slice(0, 5); newL1.push(sorted[2][0]);
    let newL2 = sorted[2].slice(1, 5); newL2.push(sorted[1][5]); newL2.push(sorted[3][0]);
    let newL3 = sorted[3].slice(1, 6); newL3.push(sorted[2][5]);
    
    text += `Rote Laterne: ${leagueState.redLantern} 🏮\n`;
    alert(text);
    
    leagueState.leagues[1] = newL1; leagueState.leagues[2] = newL2; leagueState.leagues[3] = newL3;
    leagueState.season++; updateTeamNamesUI();
    startNewSeason(); zeigeLiga();
}

// --- SPIEL ABLAUF ---
function resetPositionen() { 
    ball.x = BREITE / 2; 
    ball.y = HOEHE / 2; 
    ball.dx = 0; 
    ball.dy = 0; 
    
    spieler1.x = 100; 
    spieler1.y = HOEHE / 2; 
    spieler2.x = BREITE - 100; 
    spieler2.y = HOEHE / 2; 
    
    mouseActive = false; 
    visualBallTrail = []; 
    replayBuffer = []; 
    lastTouchPlayer = null; 
}

function torGefallen(scoringTeam) {
    let isEigentor = false; let scorer = scoringTeam === "rot" ? spieler1 : spieler2; let loser = scoringTeam === "rot" ? spieler2 : spieler1;
    if (lastTouchPlayer === loser) { isEigentor = true; scorer = loser; }

    if (scoringTeam === "rot") { score.r++; document.getElementById("scoreRed").innerText = score.r; createExplosion(BREITE - 10, HOEHE / 2, spieler1.farbe); } 
    else { score.b++; document.getElementById("scoreBlue").innerText = score.b; createExplosion(10, HOEHE / 2, spieler2.farbe); }
    
    playSound('goal', ball.x); screenShake = 15; 
    if (isEigentor) { spreche("eigentor", scorer); } else { spreche("tor", scorer); }
    if (crowdGainNode && gameSettings.commentary) crowdGainNode.gain.value = 0.8;

    if (gameSettings.replay && replayBuffer.length > 30) { isReplay = true; replayFrame = 0; torTextBis = Date.now() + 5000; } 
    else { torTextBis = Date.now() + 2000; resetPositionen(); }
}

document.getElementById("btnStart").addEventListener("click", () => { initAudio(); document.getElementById("tabelle-container").style.display = "none"; if (gameSettings.mode === "tournament") initTournament(); else if (gameSettings.mode === "league") initLeague(); else startMatch(); });

function startMatch() { 
    playSound('whistle', BREITE/2); score.r = 0; score.b = 0; document.getElementById("scoreRed").innerText = "0"; document.getElementById("scoreBlue").innerText = "0"; 
    spielZeit = 120; document.getElementById("timerDisplay").innerText = "2:00"; 
    hasSpokenHalftime = false; hasSpokenEndgame = false; isReplay = false;
    
    matchStats = { p1Shots: 0, p2Shots: 0, p1Dist: 0, p2Dist: 0, p1Poss: 0, p2Poss: 0 };
    heatmapData = []; frameCounter = 0;
    
    initWeather(); resetPositionen(); aiLastX = spieler2.x; aiLastY = spieler2.y; aiStuckFrames = 0; letzterFrame = Date.now(); spielLaeuft = true; ballBeruehrt = false;
    if (gameSettings.mode === "league" && leagueState) spreche("liga_start", spieler1);
    else if (gameSettings.mode === "tournament") {
        if (currentMatchIndex === 2) { // Finale
            spreche("turnier_finale_start", spieler1);
        } else {
            spreche("turnier_start", spieler1);
        }
    } else spreche("start", spieler1);
}

function zeigeAnalytics() {
    let totalPoss = matchStats.p1Poss + matchStats.p2Poss;
    let p1Perc = totalPoss > 0 ? Math.round((matchStats.p1Poss / totalPoss) * 100) : 50;
    let p2Perc = 100 - p1Perc;
    
    document.getElementById("statPoss1").innerText = p1Perc + "%";
    document.getElementById("statPoss2").innerText = p2Perc + "%";
    document.getElementById("statShots1").innerText = matchStats.p1Shots;
    document.getElementById("statShots2").innerText = matchStats.p2Shots;
    document.getElementById("statDist1").innerText = Math.round(matchStats.p1Dist / 100) + "m";
    document.getElementById("statDist2").innerText = Math.round(matchStats.p2Dist / 100) + "m";

    const hc = document.getElementById("heatmapCanvas");
    const hctx = hc.getContext("2d");
    hctx.clearRect(0,0, hc.width, hc.height);
    hctx.fillStyle = "#2e8b57"; hctx.fillRect(0,0, hc.width, hc.height);
    hctx.strokeStyle = "rgba(255,255,255,0.5)"; hctx.strokeRect(0,0, hc.width, hc.height);
    hctx.beginPath(); hctx.moveTo(hc.width/2,0); hctx.lineTo(hc.width/2, hc.height); hctx.stroke();
    hctx.beginPath(); hctx.arc(hc.width/2, hc.height/2, 30, 0, Math.PI*2); hctx.stroke();

    hctx.globalCompositeOperation = "screen";
    heatmapData.forEach(pt => {
        let px = (pt.x / BREITE) * hc.width;
        let py = (pt.y / HOEHE) * hc.height;
        let grad = hctx.createRadialGradient(px, py, 0, px, py, 20);
        grad.addColorStop(0, "rgba(180, 0, 85, 0.15)");
        grad.addColorStop(1, "rgba(180, 0, 85, 0)");
        hctx.fillStyle = grad;
        hctx.beginPath(); hctx.arc(px, py, 20, 0, Math.PI*2); hctx.fill();
    });
    hctx.globalCompositeOperation = "source-over";

    document.getElementById("analytics-overlay").classList.remove("hidden");
}

document.getElementById("btnCloseAnalytics").addEventListener("click", () => {
    document.getElementById("analytics-overlay").classList.add("hidden");
    
    let isDraw = score.r === score.b;
    let tl = spieler1.team; let tr = spieler2.team;
    
    if (isDraw) { speichereErgebnis(tl, "u"); speichereErgebnis(tr, "u"); } 
    else { let winP1 = score.r > score.b; if (winP1) { speichereErgebnis(tl, "s"); speichereErgebnis(tr, "n"); } else { speichereErgebnis(tr, "s"); speichereErgebnis(tl, "n"); } }
    aktualisiereTabelle();

    if (gameSettings.mode === "tournament") {
        const winP1 = score.r > score.b;
        const winner = winP1 ? tl : tr;
        const loser = winP1 ? tr : tl;

        if (winP1) { // Spieler 1 (Benutzer) gewinnt
            currentMatchIndex++;
            if (currentMatchIndex < 3) { // Sieg vor dem Finale
                tournamentMatches[currentMatchIndex].t1 = tl;
                if (isGoldenGoal) {
                    spreche("golden_goal_abschluss", null, { winner: winner, loser: loser });
                } else {
                    spreche("turnier_weiter", { team: winner });
                }
                setTimeout(zeigeTurnierBaum, 4000);
            } else { // Turniersieg
                spreche("turnier_sieg", { team: winner });
                setTimeout(() => { alert("🏆 TURNIER GEWONNEN! 🏆"); document.getElementById("selectMode").value = "free"; gameSettings.mode = "free"; document.getElementById("tabelle-container").style.display = "block"; }, 6000);
            }
        } else { // Spieler 1 verliert
            if (isGoldenGoal) {
                spreche("golden_goal_abschluss", null, { winner: winner, loser: loser });
            } else {
                spreche("turnier_aus", { team: loser });
            }
            setTimeout(() => { alert("❌ AUSGESCHIEDEN!"); document.getElementById("selectMode").value = "free"; gameSettings.mode = "free"; document.getElementById("tabelle-container").style.display = "block"; }, 6000);
        }
    } else if (gameSettings.mode === "league") {
        let uTeam = document.getElementById("teamLeft").value;
        let oppTeam = document.getElementById("teamRight").value;
        let myLeague = leagueState.leagues[1].includes(uTeam) ? 1 : leagueState.leagues[2].includes(uTeam) ? 2 : 3;
        updateLeagueMatch(uTeam, score.r, oppTeam, score.b, myLeague, leagueState.matchday);
        
        [1, 2, 3].forEach(l => {
            let mdFixtures = leagueState.fixtures[l][leagueState.matchday];
            mdFixtures.forEach(m => {
                let isCurrentMatch = (m.home === uTeam && m.away === oppTeam) || (m.home === oppTeam && m.away === uTeam);
                if (!isCurrentMatch) {
                    let gh = Math.floor(Math.random() * 4);
                    let ga = Math.floor(Math.random() * 4);
                    updateLeagueMatch(m.home, gh, m.away, ga, l, leagueState.matchday);
                }
            });
        });
        
        leagueState.matchday++;
        if (leagueState.matchday >= 10) { handleEndOfSeason(); } 
        else { localStorage.setItem('fifaLeague', JSON.stringify(leagueState)); zeigeLiga(); }
    } else {
        document.getElementById("tabelle-container").style.display = "block";
    }
});

function spielBeenden() {
    spielLaeuft = false; playSound('whistle', BREITE/2); 
    let isDraw = score.r === score.b;
    if (!isGoldenGoal) {
        if (isDraw) { spreche("ende_unentschieden", null); } else { spreche("ende_sieg", score.r > score.b ? spieler1 : spieler2); }
    }
    setTimeout(zeigeAnalytics, 3000); 
}

// --- UPDATE ---
function update() {
    if (!spielLaeuft) { if (crowdGainNode) crowdGainNode.gain.value *= 0.95; return; }
    let j = Date.now(); let dt = (j - letzterFrame) / 1000; letzterFrame = j;
    updateGps();
    
    if (crowdGainNode && gameSettings.commentary && !isReplay) {
        let tv = 0.05; let distTor = Math.min(Math.abs(ball.x - 0), Math.abs(ball.x - BREITE));
        if (distTor < 300) tv += (300 - distTor) / 1000;
        tv += Math.min(Math.hypot(ball.dx, ball.dy) / 50, 0.3);
        crowdGainNode.gain.value += (tv - crowdGainNode.gain.value) * 0.05;
    }

    if (isReplay) { 
        if (crowdGainNode) crowdGainNode.gain.value *= 0.95;
        replayFrame += 0.5; 
        if (replayFrame >= replayBuffer.length) { 
            isReplay = false; 
            if (isGoldenGoal && score.r !== score.b) {
                spielBeenden();
            } else {
                resetPositionen(); 
            }
        } 
        else { let s = replayBuffer[Math.floor(replayFrame)]; ball.x = s.bx; ball.y = s.by; spieler1.x = s.p1x; spieler1.y = s.p1y; spieler2.x = s.p2x; spieler2.y = s.p2y; } 
        return; 
    } else if (isGoldenGoal && score.r !== score.b && Date.now() > torTextBis) {
        spielBeenden();
        return;
    }
    
    if (lastTouchPlayer !== null) ballBeruehrt = true;
    if (ballBeruehrt && !isGoldenGoal) spielZeit -= dt; 
    if (spielZeit <= 0 && !isGoldenGoal) { 
        spielZeit = 0; 
        if (gameSettings.mode === "tournament" && score.r === score.b) {
            isGoldenGoal = true;
            spreche("verlaengerung_start", null);
            playSound('whistle', BREITE/2);
            let tD = document.getElementById("timerDisplay");
            tD.innerText = "Golden Goal"; tD.style.color = "gold"; tD.style.fontSize = "16px";
        } else {
            spielBeenden(); 
        }
    }
    if (!isGoldenGoal) {
        document.getElementById("timerDisplay").innerText = Math.floor(spielZeit / 60) + ":" + (Math.floor(spielZeit % 60) < 10 ? "0" : "") + Math.floor(spielZeit % 60);
    }
    
    frameCounter++;
    if (frameCounter % 10 === 0) heatmapData.push({x: ball.x, y: ball.y});
    if (lastTouchPlayer === spieler1) matchStats.p1Poss++; else if (lastTouchPlayer === spieler2) matchStats.p2Poss++;
    
    if (spielZeit <= 60 && !hasSpokenHalftime && Date.now() > torTextBis) { hasSpokenHalftime = true; if (score.r === score.b) spreche("halbzeit_unentschieden", null); else spreche("halbzeit_fuehrung", null); }
    if (spielZeit <= 20 && !hasSpokenEndgame && Date.now() > torTextBis) { hasSpokenEndgame = true; let diff = Math.abs(score.r - score.b); if (diff === 0) spreche("schlussphase_unentschieden", null); else if (diff <= 1) spreche("schlussphase_knapp", null); else spreche("schlussphase_deutlich", null); }

    replayBuffer.push({ bx: ball.x, by: ball.y, p1x: spieler1.x, p1y: spieler1.y, p2x: spieler2.x, p2y: spieler2.y }); 
    if (replayBuffer.length > 180) replayBuffer.shift();

    let ballSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (ballSpeed > 5) visualBallTrail.push({x: ball.x, y: ball.y, alpha: 0.5});
    if (visualBallTrail.length > 10) visualBallTrail.shift();
    for (let t of visualBallTrail) t.alpha -= 0.05;

    aiBallHistory.push({ x: ball.x, y: ball.y }); if (aiBallHistory.length > 6) aiBallHistory.shift();
    let delayedBall = aiBallHistory[0] || ball;

    if (currentAiMode !== "human") {
        aiUpdateCounter++; 
        if (aiUpdateCounter >= 10) { 
            aiUpdateCounter = 0; let distMoved = Math.hypot(spieler2.x - aiLastX, spieler2.y - aiLastY); 
            if (distMoved < 5) aiStuckFrames += 10; else aiStuckFrames = 0; 
            aiLastX = spieler2.x; aiLastY = spieler2.y; 
            if (aiStuckFrames >= 60) { aiTargetX = BREITE / 2; aiTargetY = HOEHE / 2; if (aiStuckFrames >= 90) aiStuckFrames = 0; } 
            else { 
                if (currentAiMode === "ai1") { aiTargetX = BREITE - 100; aiTargetY = ball.x > BREITE / 2 ? ball.y : HOEHE / 2; } 
                else if (currentAiMode === "ai2") { aiTargetX = ball.x > BREITE / 2 ? ball.x : BREITE / 2 + 100; aiTargetY = ball.y; } 
                else { aiTargetX = delayedBall.x + 20; aiTargetY = delayedBall.y; } 
                aiTargetX = Math.max(40, Math.min(BREITE - 40, aiTargetX)); aiTargetY = Math.max(40, Math.min(HOEHE - 40, aiTargetY)); 
            } 
        }
    }

    let s1Mod = 1, s2Mod = 1;
    for (let p of groundPatches) { 
        if (Math.hypot(spieler1.x - p.x, spieler1.y - p.y) < p.r) s1Mod = p.type === "mud" ? 0.5 : 0.3; 
        if (Math.hypot(spieler2.x - p.x, spieler2.y - p.y) < p.r) s2Mod = p.type === "mud" ? 0.5 : 0.3; 
    }
    
    // Konstanter, leicht angehobener Speed (kein Dashing mehr)
    let s1Spd = spieler1.baseSpeed * s1Mod; 
    let s2Spd = spieler2.baseSpeed * s2Mod;

    const SS = 4;
    for (let s = 0; s < SS; s++) {
        if (Date.now() > torTextBis) {
            let dx1 = 0, dy1 = 0; 
            if (tasten["w"]) dy1--; if (tasten["s"]) dy1++; if (tasten["a"]) dx1--; if (tasten["d"]) dx1++;
            if (p1Gp.x || p1Gp.y) { dx1 = p1Gp.x; dy1 = p1Gp.y; } else if (dx1 || dy1) { let l = Math.hypot(dx1, dy1); dx1 /= l; dy1 /= l; }
            
            let dist1 = Math.hypot(dx1 * (s1Spd / SS), dy1 * (s1Spd / SS));
            if (mouseActive && mouseX !== null && mouseY !== null && dx1 === 0 && dy1 === 0) { 
                let zielX = Math.max(spieler1.radius, Math.min(BREITE - spieler1.radius, mouseX));
                let zielY = Math.max(spieler1.radius, Math.min(HOEHE - spieler1.radius, mouseY));
                let folgeSpeed = 0.2;
                let moveX = (zielX - spieler1.x) * folgeSpeed; let moveY = (zielY - spieler1.y) * folgeSpeed;
                spieler1.x += moveX; spieler1.y += moveY; 
                matchStats.p1Dist += Math.hypot(moveX, moveY);
            } else { 
                spieler1.x += dx1 * (s1Spd / SS); spieler1.y += dy1 * (s1Spd / SS); 
                matchStats.p1Dist += dist1;
            }

            if (currentAiMode === "human") {
                let dx2 = 0, dy2 = 0; 
                if (tasten["ArrowUp"]) dy2--; if (tasten["ArrowDown"]) dy2++; if (tasten["ArrowLeft"]) dx2--; if (tasten["ArrowRight"]) dx2++;
                if (p2Gp.x || p2Gp.y) { dx2 = p2Gp.x; dy2 = p2Gp.y; } else if (dx2 || dy2) { let l = Math.hypot(dx2, dy2); dx2 /= l; dy2 /= l; }
                spieler2.x += dx2 * (s2Spd / SS); spieler2.y += dy2 * (s2Spd / SS);
                matchStats.p2Dist += Math.hypot(dx2 * (s2Spd / SS), dy2 * (s2Spd / SS));
            } else { 
                let dx = aiTargetX - spieler2.x, dy = aiTargetY - spieler2.y, d = Math.hypot(dx, dy); 
                if (d > 0) { 
                    let moveX = dx / d * Math.min(s2Spd / SS, d); let moveY = dy / d * Math.min(s2Spd / SS, d);
                    spieler2.x += moveX; spieler2.y += moveY; 
                    matchStats.p2Dist += Math.hypot(moveX, moveY);
                } 
            }
        }
        
        spieler1.x = Math.max(25, Math.min(BREITE - 25, spieler1.x)); spieler1.y = Math.max(25, Math.min(HOEHE - 25, spieler1.y));
        spieler2.x = Math.max(25, Math.min(BREITE - 25, spieler2.x)); spieler2.y = Math.max(25, Math.min(HOEHE - 25, spieler2.y));
        let pdx = spieler2.x - spieler1.x, pdy = spieler2.y - spieler1.y, pd = Math.hypot(pdx, pdy); 
        if (pd < 50 && pd > 0) { spieler1.x -= pdx / pd * (50 - pd) / 2; spieler1.y -= pdy / pd * (50 - pd) / 2; spieler2.x += pdx / pd * (50 - pd) / 2; spieler2.y += pdy / pd * (50 - pd) / 2; }
        
        let f = weatherType === "rain" ? 0.998 : weatherType === "snow" ? 0.97 : 0.99;
        ball.dx *= Math.pow(f, 1 / SS); ball.dy *= Math.pow(f, 1 / SS);
        ball.x += ball.dx / SS; ball.y += ball.dy / SS;
        
        [spieler1, spieler2].forEach(p => {
            let adx = ball.x - p.x, ady = ball.y - p.y, ad = Math.hypot(adx, ady);
            if (ad < 35 && ad > 0) { 
                ball.x = p.x + adx / ad * 35; ball.y = p.y + ady / ad * 35; 
                let pk = 30; // Konstante starke Schusskraft
                ball.dx += adx / ad * pk / SS; ball.dy += ady / ad * pk / SS; 
                
                if (lastTouchPlayer !== p) { 
                    lastTouchPlayer = p; 
                    if (Math.random() > 0.6) spreche("besitz", p); 
                }
                if (s === 0 && !isReplay) { 
                    playSound('kick', ball.x); 
                    if (p === spieler1) matchStats.p1Shots++; else matchStats.p2Shots++; 
                    if (Math.random() > 0.4) spreche("schuss", p); 
                }
            }
        });
        
        if (ball.y < 10) { ball.y = 10; ball.dy = Math.abs(ball.dy); playSound('kick', ball.x); } 
        if (ball.y > HOEHE - 10) { ball.y = HOEHE - 10; ball.dy = -Math.abs(ball.dy); playSound('kick', ball.x); }
        
        if (ball.x < 10) { 
            if (ball.y > 240 && ball.y < 360) { torGefallen("blau"); return; } 
            else { ball.x = 10; ball.dx = Math.abs(ball.dx); playSound('kick', 0); } 
        }
        if (ball.x > BREITE - 10) { 
            if (ball.y > 240 && ball.y < 360) { torGefallen("rot"); return; } 
            else { ball.x = BREITE - 10; ball.dx = -Math.abs(ball.dx); playSound('kick', BREITE); } 
        }
    }
    
    for (let i = particles.length - 1; i >= 0; i--) { particles[i].x += particles[i].vx; particles[i].y += particles[i].vy; particles[i].life -= 0.02; if (particles[i].life <= 0) particles.splice(i, 1); }
}

// --- ZEICHNEN ---
function zeichneAlles() {
    ctx.save();
    let camX = (ball.x - BREITE/2) * -0.05; let camY = (ball.y - HOEHE/2) * -0.05; ctx.translate(camX, camY);

    if (screenShake > 0.5 && !isReplay) { ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake); screenShake *= 0.9; }

    ctx.fillStyle = weatherType === "rain" ? "#246b43" : weatherType === "snow" ? "#d1e8e2" : "#2e8b57";
    ctx.fillRect(-100, -100, BREITE+200, HOEHE+200);

    if (weatherType !== "snow") { 
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; 
        for (let i = -100; i < BREITE+100; i += 100) ctx.fillRect(i, -100, 50, HOEHE+200); 
    }
    
    groundPatches.forEach(p => { 
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); 
        ctx.fillStyle = p.type === "mud" ? "rgba(60, 40, 20, 0.6)" : "rgba(255, 255, 255, 0.8)"; ctx.fill(); 
    });

    ctx.strokeStyle = "white"; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, BREITE - 4, HOEHE - 4);
    ctx.beginPath(); ctx.moveTo(BREITE / 2, 0); ctx.lineTo(BREITE / 2, HOEHE); ctx.stroke();
    ctx.beginPath(); ctx.arc(BREITE / 2, HOEHE / 2, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "white"; ctx.fillRect(0, 240, 10, 120); ctx.fillRect(BREITE - 10, 240, 10, 120);

    const isNight = gameSettings.time === "night";
    const lights = [{x: 0, y: 0}, {x: BREITE, y: 0}, {x: 0, y: HOEHE}, {x: BREITE, y: HOEHE}];
    
    const drawShadow = (obj) => {
        if (isNight) {
            lights.forEach(l => {
                let dx = obj.x - l.x, dy = obj.y - l.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
                let shadowLen = Math.min(dist * 0.12, 60);
                ctx.save(); ctx.translate(obj.x, obj.y); ctx.rotate(ang);
                ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                ctx.beginPath(); ctx.ellipse(shadowLen / 2 + obj.radius * 0.3, 0, shadowLen, obj.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
        } else { ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; ctx.beginPath(); ctx.arc(obj.x + 4, obj.y + 4, obj.radius, 0, Math.PI * 2); ctx.fill(); }
    };
    [ball, spieler1, spieler2].forEach(drawShadow);

    particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1.0;
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();

    [spieler1, spieler2].forEach(p => {
        ctx.save(); ctx.fillStyle = p.farbe; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.clip();
        if (p.img.complete) { ctx.drawImage(p.img, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2); } ctx.restore();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.stroke();
    });

    if (weatherType === "rain") { ctx.strokeStyle = "rgba(200, 200, 255, 0.2)"; for (let i = 0; i < 30; i++) { let rx = Math.random() * BREITE, ry = Math.random() * HOEHE; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 5, ry + 15); ctx.stroke(); } } 
    else if (weatherType === "snow") { ctx.fillStyle = "white"; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(Math.random() * BREITE, Math.random() * HOEHE, 2, 0, Math.PI * 2); ctx.fill(); } }

    if (isNight && !isReplay) {
        ctx.fillStyle = "rgba(10, 15, 30, 0.4)"; ctx.fillRect(-100, -100, BREITE+200, HOEHE+200);
        ctx.globalCompositeOperation = "screen"; 
        lights.forEach(l => {
            let g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 500);
            g.addColorStop(0, "rgba(255, 255, 230, 0.4)"); g.addColorStop(1, "rgba(255, 255, 255, 0)");   
            ctx.fillStyle = g; ctx.fillRect(-100, -100, BREITE+200, HOEHE+200);
        });
        ctx.globalCompositeOperation = "source-over"; 
        let v = ctx.createRadialGradient(BREITE / 2, HOEHE / 2, 100, BREITE / 2, HOEHE / 2, 600);
        v.addColorStop(0, "rgba(0, 0, 0, 0)"); v.addColorStop(1, "rgba(0, 0, 0, 0.6)");
        ctx.fillStyle = v; ctx.fillRect(-100, -100, BREITE+200, HOEHE+200);
    }
    ctx.restore(); // Parallax Reset

    if (isReplay) { ctx.fillStyle = "gold"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.fillText("🎥 REPLAY", BREITE / 2, 50); }
    if (Date.now() < torTextBis && !isReplay) { 
        let t = isGoldenGoal ? "GOLDEN GOAL!" : "TOOOOR!"; ctx.fillStyle = "gold"; ctx.font = "bold 80px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(t, BREITE / 2, HOEHE / 2); ctx.strokeStyle = "black"; ctx.lineWidth = 4; ctx.strokeText(t, BREITE / 2, HOEHE / 2); 
    }
}

function loop() { update(); zeichneAlles(); requestAnimationFrame(loop); }
loop();