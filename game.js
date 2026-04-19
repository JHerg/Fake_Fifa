const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BREITE = canvas.width;
const HOEHE = canvas.height;

// --- NEU: RESPONSIVES CANVAS FÜR MOBILE GERÄTE ---
function passeCanvasAn() {
    let fensterBreite = window.innerWidth;
    let fensterHoehe = window.innerHeight;
    
    // Wir lassen Platz für das UI (Scoreboard) oben/unten
    let verfuegbareHoehe = fensterHoehe - 180;
    let seitenVerhaeltnis = BREITE / HOEHE; // 1000 / 600 = 1.666...
    
    let neueBreite = fensterBreite * 0.95; // Maximal 95% vom Bildschirm nutzen
    let neueHoehe = neueBreite / seitenVerhaeltnis;
    
    // Wenn es so zu hoch ist, orientieren wir uns stattdessen an der Höhe
    if (neueHoehe > verfuegbareHoehe) {
        neueHoehe = verfuegbareHoehe;
        neueBreite = neueHoehe * seitenVerhaeltnis;
    }
    
    canvas.style.width = neueBreite + "px";
    canvas.style.height = neueHoehe + "px";
}
window.addEventListener("resize", passeCanvasAn);
passeCanvasAn(); // Einmal direkt beim Start aufrufen

// --- NEU: PUNKTESTAND ---
let toreRot = 0;
let toreBlau = 0;
const scoreRedEl = document.getElementById("scoreRed");
const scoreBlueEl = document.getElementById("scoreBlue");
const timerEl = document.getElementById("timerDisplay");

let spielLaeuft = false;
let spielZeit = 120; // 2 Minuten = 120 Sekunden
let letzterFrame = Date.now();
let spielEndeText = "";
let torTextBis = 0; // Merkt sich, wie lange der "TOOOOR!" Text gezeigt werden soll

// --- UNSERE SPIELFIGUREN ---
let ball = { x: BREITE / 2, y: HOEHE / 2, radius: 10, farbe: "white", dx: 0, dy: 0 };
let spieler1 = { x: 100, y: HOEHE / 2, radius: 20, farbe: "#ff4d4d", geschwindigkeit: 5 };
let spieler2 = { x: BREITE - 100, y: HOEHE / 2, radius: 20, farbe: "#4da6ff", geschwindigkeit: 5 };

// --- NEU: BUNDESLIGA TEAMS & FARBEN ---
const teamFarben = {
    "Bayer Leverkusen": "#e32221", // Schwarz-Rot
    "FC Bayern": "#dc052d",        // Rot
    "VfB Stuttgart": "#e32228",    // Rot-Weiß
    "Dortmund": "#fde100",         // Gelb
    "RB Leipzig": "#dd013f",       // Rot-Weiß
    "Eintracht Frankfurt": "#000000", // Schwarz
    "Hoffenheim": "#0066b2",       // Blau
    "Heidenheim": "#e2001a",       // Rot-Blau
    "Werder Bremen": "#1d9053",    // Grün
    "Freiburg": "#c0001f",         // Rot
    "Augsburg": "#ba3733",         // Rot-Grün-Weiß
    "Wolfsburg": "#65b32e",        // Hellgrün
    "Mainz 05": "#ed1c24",         // Rot
    "Gladbach": "#1f1f1f",         // Dunkles Grau/Schwarz
    "Union Berlin": "#d4011d",     // Rot
    "Bochum": "#005ca9",           // Blau
    "FC St. Pauli": "#533527",     // Braun
    "Holstein Kiel": "#0060af"     // Blau
};

const teamLeftSelect = document.getElementById("teamLeft");
const teamRightSelect = document.getElementById("teamRight");
const aiSelect = document.getElementById("aiSelect");

// --- NEU: KI-VARIABLEN ---
let currentAiMode = "human";
let aiTargetX = BREITE - 100;
let aiTargetY = HOEHE / 2;
let aiUpdateCounter = 0;
let aiLastX = BREITE - 100;
let aiLastY = HOEHE / 2;
let aiStuckFrames = 0;

function setzeSpielModus() {
    currentAiMode = aiSelect.value;
    if (currentAiMode === "ai1") spieler2.geschwindigkeit = 3;
    else if (currentAiMode === "ai2") spieler2.geschwindigkeit = 5;
    else if (currentAiMode === "ai3") spieler2.geschwindigkeit = 8; // KI Stufe 3 leicht erhöht als Ausgleich
    else spieler2.geschwindigkeit = 5; // menschlicher Spieler
}
aiSelect.addEventListener("change", setzeSpielModus);
setzeSpielModus(); // Einmal beim Starten aufrufen

function updateTeamFarben() {
    // Spieler-Farben aktualisieren
    spieler1.farbe = teamFarben[teamLeftSelect.value];
    spieler2.farbe = teamFarben[teamRightSelect.value];
    
    // Bonus: Auch die Anzeigetafel im HTML umfärben!
    scoreRedEl.style.backgroundColor = spieler1.farbe;
    scoreBlueEl.style.backgroundColor = spieler2.farbe;
}

teamLeftSelect.addEventListener("change", updateTeamFarben);
teamRightSelect.addEventListener("change", updateTeamFarben);
updateTeamFarben(); // Einmal am Anfang aufrufen, um die Standardwerte (Bayern vs Dortmund) zu setzen

// --- NEU: DIE STEUERUNG (Welche Taste wird gerade gedrückt?) ---
// Wir erstellen ein "Wörterbuch" (Objekt), das sich merkt, ob eine Taste gedrückt ist.
const tasten = {};
let mouseX = null;
let mouseY = null;
let mouseActive = false;
let ballHistory = [];

// Wenn eine Taste HERUNTERGEDRÜCKT wird, merken wir uns: "Wahr" (true)
window.addEventListener("keydown", function(event) {
    tasten[event.key] = true;
    // Bei WASD-Eingabe sofort die Maussteuerung deaktivieren
    if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) {
        mouseActive = false;
    }
});

// Wenn eine Taste LOSGELASSEN wird, merken wir uns: "Falsch" (false)
window.addEventListener("keyup", function(event) {
    tasten[event.key] = false;
});

// Mausbewegung tracken
canvas.addEventListener("mousemove", function(event) {
    let rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    mouseActive = true; // Aktiviert die Maussteuerung automatisch, wenn die Maus bewegt wird
});

// --- NEU: TOUCH-STEUERUNG FÜR HANDYS & TABLETS ---
function handleTouch(event) {
    event.preventDefault(); // Verhindert, dass der Browser beim Wischen scrollt
    let rect = canvas.getBoundingClientRect();
    let touch = event.touches[0];
    
    // Berechne exakte interne Koordinaten (Skalierung ausgleichen)
    mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    // Leicht versetzt über dem Finger (-40), damit der Daumen die Figur nicht verdeckt!
    mouseY = ((touch.clientY - rect.top) * (canvas.height / rect.height)) - 40;
    mouseActive = true;
}
canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });

// --- NEU: HILFSFUNKTIONEN FÜR TORE UND RESET ---
function resetPositionen() {
    ball.x = BREITE / 2;
    ball.y = HOEHE / 2;
    ball.dx = 0;
    ball.dy = 0;
    spieler1.x = 100;
    spieler1.y = HOEHE / 2;
    spieler2.x = BREITE - 100;
    spieler2.y = HOEHE / 2;
    mouseActive = false; // Zurücksetzen, damit Spieler 1 nicht sofort zum alten Mauspunkt rennt
    ballHistory = []; // KI-Verzögerung zurücksetzen
}

function torGefallen(team) {
    if (team === "rot") {
        toreRot++;
        scoreRedEl.innerText = toreRot;
    } else {
        toreBlau++;
        scoreBlueEl.innerText = toreBlau;
    }
    torTextBis = Date.now() + 2000; // Text für 2 Sekunden (2000 ms) einblenden
    resetPositionen(); // Setzt nun Ball UND Spieler zurück
}

// Verbinden unseres Start-Buttons
document.getElementById("btnStart").addEventListener("click", function() {
    toreRot = 0; toreBlau = 0;
    scoreRedEl.innerText = "0";
    scoreBlueEl.innerText = "0";
    spielZeit = 120; // Zurück auf 2:00
    timerEl.innerText = "2:00";
    spielEndeText = "";
    resetPositionen();
    setzeSpielModus(); // KI-Modus fixieren
    aiLastX = spieler2.x;
    aiLastY = spieler2.y;
    aiStuckFrames = 0;
    letzterFrame = Date.now(); // Stoppuhr frisch starten
    spielLaeuft = true;
});

// --- NEU: TABELLEN-LOGIK FÜR LOCALSTORAGE ---
function spielBeenden() {
    let teamLinks = teamLeftSelect.value;
    let teamRechts = teamRightSelect.value;

    if (toreRot > toreBlau) {
        spielEndeText = teamLinks + " gewinnt!";
        speichereErgebnis(teamLinks, "sieg");
        speichereErgebnis(teamRechts, "niederlage");
    } else if (toreBlau > toreRot) {
        spielEndeText = teamRechts + " gewinnt!";
        speichereErgebnis(teamRechts, "sieg");
        speichereErgebnis(teamLinks, "niederlage");
    } else {
        spielEndeText = "Unentschieden!";
        speichereErgebnis(teamLinks, "unentschieden");
        speichereErgebnis(teamRechts, "unentschieden");
    }
    aktualisiereTabelle();
}

function speichereErgebnis(teamName, ergebnisTyp) {
    // Vorhandene Daten laden oder leeres Objekt erstellen
    let tabelle = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    if (!tabelle[teamName]) {
        tabelle[teamName] = { siege: 0, unentschieden: 0, niederlagen: 0 };
    }
    
    if (ergebnisTyp === "sieg") tabelle[teamName].siege++;
    if (ergebnisTyp === "unentschieden") tabelle[teamName].unentschieden++;
    if (ergebnisTyp === "niederlage") tabelle[teamName].niederlagen++;
    
    // Zurück in den Browser-Speicher schreiben
    localStorage.setItem('fifaTabelle', JSON.stringify(tabelle));
}

function aktualisiereTabelle() {
    let tabelle = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    let body = document.getElementById("leaderboardBody");
    body.innerHTML = "";

    // In eine sortierbare Liste umwandeln (Punkte = Siege*3 + Unentschieden*1)
    let teamsArray = [];
    for (let team in tabelle) {
        let punkte = (tabelle[team].siege * 3) + tabelle[team].unentschieden;
        teamsArray.push({ name: team, stats: tabelle[team], punkte: punkte });
    }
    
    // Nach Punkten absteigend sortieren
    teamsArray.sort((a, b) => b.punkte - a.punkte);

    // Ins HTML schreiben
    for (let i = 0; i < teamsArray.length; i++) {
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${i + 1}. ${teamsArray[i].name}</strong> (${teamsArray[i].punkte} Pkt)</td>
            <td>${teamsArray[i].stats.siege}</td>
            <td>${teamsArray[i].stats.unentschieden}</td>
            <td>${teamsArray[i].stats.niederlagen}</td>
        `;
        body.appendChild(tr);
    }
}
aktualisiereTabelle(); // Tabelle direkt beim Starten der Seite einmal anzeigen

// --- NEU: DIE RECHEN-FUNKTION (Update) ---
// Hier bewegen wir die Spieler, BEVOR wir sie zeichnen
function update() {
    // Wenn das Spiel nicht läuft, bewegen wir nichts!
    if (!spielLaeuft) return;

    // --- Timer berechnen ---
    let jetzt = Date.now();
    let dt = (jetzt - letzterFrame) / 1000; // Vergangene Zeit in Sekunden
    letzterFrame = jetzt;

    spielZeit = spielZeit - dt;
    if (spielZeit <= 0) {
        spielZeit = 0;
        spielLaeuft = false;
        spielBeenden();
    }

    // Timer im HTML aktualisieren (z.B. 1:05)
    let minuten = Math.floor(spielZeit / 60);
    let sekunden = Math.floor(spielZeit % 60);
    timerEl.innerText = minuten + ":" + (sekunden < 10 ? "0" : "") + sekunden;
    
    // --- NEU: BALL-HISTORIE FÜR KI STUFE 3 (0.1s DELAY) ---
    ballHistory.push({ x: ball.x, y: ball.y });
    if (ballHistory.length > 6) { // 6 Frames entsprechen bei 60fps ca. 100ms
        ballHistory.shift();
    }
    let delayedBall = ballHistory[0] || ball;

    // --- NEU: KI-Entscheidungs-Zyklus (nur alle 10 Frames) ---
    if (currentAiMode !== "human") {
        aiUpdateCounter++;
        if (aiUpdateCounter >= 10) {
            aiUpdateCounter = 0;
            
            // 1. Befreiungs-Logik: Hängt die KI fest?
            let distMoved = Math.hypot(spieler2.x - aiLastX, spieler2.y - aiLastY);
            if (distMoved < 5) {
                aiStuckFrames += 10; // 10 Frames sind vergangen
            } else {
                aiStuckFrames = 0;
            }
            aiLastX = spieler2.x;
            aiLastY = spieler2.y;

            if (aiStuckFrames >= 60) { // Nach ~1 Sekunde (60 Frames) befreien
                aiTargetX = BREITE / 2;
                aiTargetY = HOEHE / 2;
                if (aiStuckFrames >= 90) aiStuckFrames = 0; // Nach kurzem Weglaufen wieder normal spielen
            } else {
                // 2. Normale KI-Ziele setzen
                if (currentAiMode === "ai1") {
                    aiTargetX = BREITE - 100;
                    aiTargetY = (ball.x > BREITE / 2) ? ball.y : HOEHE / 2;
                } else if (currentAiMode === "ai2") {
                    if (ball.x > BREITE / 2) {
                        // Ball in der eigenen (rechten) Hälfte -> aktiv angreifen!
                        aiTargetX = ball.x;
                        aiTargetY = ball.y;
                    } else {
                        // Ball in gegnerischer Hälfte -> bis zur Mittellinie aufrücken
                        aiTargetX = (BREITE / 2) + 100;
                        aiTargetY = ball.y;
                    }
                } else if (currentAiMode === "ai3") {
                    // Nutzt die delayedBall-Position für leicht verzögerte Reaktion
                    aiTargetX = delayedBall.x + 20; 
                    aiTargetY = delayedBall.y;
                }

                // 3. Anti-Ecken-Logik: Mindestabstand zur Wand einhalten!
                let minWand = spieler2.radius + 15;
                aiTargetX = Math.max(minWand, Math.min(BREITE - minWand, aiTargetX));
                aiTargetY = Math.max(minWand, Math.min(HOEHE - minWand, aiTargetY));
            }
        }
    }

    // --- NEU: SUB-STEPPING (Profi-Methode gegen das Durchrutschen des Balls) ---
    // Wir unterteilen 1 Frame in 4 extrem schnelle Unter-Schritte.
    const SUBSTEPS = 4;
    
    for (let step = 0; step < SUBSTEPS; step++) {
        
        // Geschwindigkeit für diesen winzigen Teilschritt anpassen
        let speed1 = spieler1.geschwindigkeit / SUBSTEPS;
        let speed2 = spieler2.geschwindigkeit / SUBSTEPS;

        // --- Tor-Reset-Pause (Kickoff Delay) ---
        // Spieler dürfen sich erst bewegen, wenn der "TOOOOR!"-Text verschwunden ist.
        let isKickoffPause = Date.now() < torTextBis;

        // --- Spieler 1 (Rot) mit Maus oder W, A, S, D ---
        if (!isKickoffPause) {
            if (mouseActive && mouseX !== null && mouseY !== null) {
                // Direkte Positionszuweisung, exakt zentriert auf die Spitze des Mauszeigers.
                // Begrenzt auf das Spielfeld, damit er nicht in oder durch Wände teleportiert.
                let zielX = Math.max(spieler1.radius, Math.min(BREITE - spieler1.radius, mouseX));
                let zielY = Math.max(spieler1.radius, Math.min(HOEHE - spieler1.radius, mouseY));
                
                // Aufteilen der Distanz auf die Sub-Steps, um physikalisches "Tunneling" zu verhindern
                let schritteUebrig = SUBSTEPS - step;
                spieler1.x += (zielX - spieler1.x) / schritteUebrig;
                spieler1.y += (zielY - spieler1.y) / schritteUebrig;
            } else {
                if (tasten["w"]) { spieler1.y = spieler1.y - speed1; }
                if (tasten["s"]) { spieler1.y = spieler1.y - speed1; } // Fix für S (sollte addieren):
                if (tasten["s"]) { spieler1.y = spieler1.y + speed1; } // Korrigiert!
                if (tasten["a"]) { spieler1.x = spieler1.x - speed1; }
                if (tasten["d"]) { spieler1.x = spieler1.x + speed1; }
            }
        }

        // Grenzen für Spieler 1 prüfen
        if (spieler1.y - spieler1.radius < 0) { spieler1.y = spieler1.radius; } // Oben
        if (spieler1.x - spieler1.radius < 0) { spieler1.x = spieler1.radius; } // Links
        if (spieler1.y + spieler1.radius > HOEHE) { spieler1.y = HOEHE - spieler1.radius; } // Unten
        if (spieler1.x + spieler1.radius > BREITE) { spieler1.x = BREITE - spieler1.radius; } // Rechts

        // --- Spieler 2 (Blau) mit den Pfeiltasten ODER KI-Logik ---
        if (!isKickoffPause) {
            if (currentAiMode === "human") {
                if (tasten["ArrowUp"]) { spieler2.y = spieler2.y - speed2; }
                if (tasten["ArrowDown"]) { spieler2.y = spieler2.y + speed2; }
                if (tasten["ArrowLeft"]) { spieler2.x = spieler2.x - speed2; }
                if (tasten["ArrowRight"]) { spieler2.x = spieler2.x + speed2; }
            } else {
                // KI-Bewegung hin zum berechneten Target
                let dx = aiTargetX - spieler2.x;
                let dy = aiTargetY - spieler2.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    // Math.min verhindert "Zittern" am Zielpunkt
                    spieler2.x += (dx / dist) * Math.min(speed2, dist);
                    spieler2.y += (dy / dist) * Math.min(speed2, dist);
                }
            }
        }

        // Grenzen für Spieler 2 prüfen
        if (spieler2.y - spieler2.radius < 0) { spieler2.y = spieler2.radius; } // Oben
        if (spieler2.x - spieler2.radius < 0) { spieler2.x = spieler2.radius; } // Links
        if (spieler2.y + spieler2.radius > HOEHE) { spieler2.y = HOEHE - spieler2.radius; } // Unten
        if (spieler2.x + spieler2.radius > BREITE) { spieler2.x = BREITE - spieler2.radius; } // Rechts

        // --- Spieler-Kollision (Gegenseitiges Blockieren) ---
        let pDx = spieler2.x - spieler1.x;
        let pDy = spieler2.y - spieler1.y;
        let pDistanz = Math.sqrt(pDx * pDx + pDy * pDy);
        let pMinDistanz = spieler1.radius + spieler2.radius;

        if (pDistanz < pMinDistanz && pDistanz > 0) {
            let pUeberlappung = pMinDistanz - pDistanz;
            spieler1.x -= (pDx / pDistanz) * (pUeberlappung / 2);
            spieler1.y -= (pDy / pDistanz) * (pUeberlappung / 2);
            spieler2.x += (pDx / pDistanz) * (pUeberlappung / 2);
            spieler2.y += (pDy / pDistanz) * (pUeberlappung / 2);
        }

        // --- BALL-PHYSIK ---
        // Reibung (angepasst an die Sub-Steps, entspricht grob 0.99 pro Frame)
        ball.dx = ball.dx * Math.pow(0.99, 1/SUBSTEPS);
        ball.dy = ball.dy * Math.pow(0.99, 1/SUBSTEPS);

        // Maximale Ball-Geschwindigkeit begrenzen (kleiner als Spieler-Durchmesser)
        let maxBallSpeed = (spieler1.radius * 2) - 2; 
        let currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (currentSpeed > maxBallSpeed) {
            ball.dx = (ball.dx / currentSpeed) * maxBallSpeed;
            ball.dy = (ball.dy / currentSpeed) * maxBallSpeed;
        }

        // Ball bewegen (anteilig für diesen Sub-Step)
        ball.x += ball.dx / SUBSTEPS;
        ball.y += ball.dy / SUBSTEPS;

        // --- Kreis-Kollision mit den Spielern ---
        let alleSpieler = [spieler1, spieler2];
        for (let i = 0; i < alleSpieler.length; i++) {
            let spieler = alleSpieler[i];
            
            let abstandX = ball.x - spieler.x;
            let abstandY = ball.y - spieler.y;
            let distanz = Math.sqrt(abstandX * abstandX + abstandY * abstandY);
            
            let minAbstand = ball.radius + spieler.radius;
            
            if (distanz < minAbstand && distanz > 0) {
                let richtungX = abstandX / distanz;
                let richtungY = abstandY / distanz;
                
                // Verstärkte Positions-Korrektur (Ball zwingend an die Außenkante setzen)
                let ueberlappung = minAbstand - distanz;
                ball.x += richtungX * ueberlappung;
                ball.y += richtungY * ueberlappung;
                
                // Spieler-Push-Back: Ball addiert Geschwindigkeit, um vor dem Spieler herzubewegen
                // Anstatt ihn sofort über die Map zu schießen, pusht der Spieler den Ball beständig.
                let pushKraft = 20; 
                ball.dx += richtungX * (pushKraft / SUBSTEPS);
                ball.dy += richtungY * (pushKraft / SUBSTEPS);
            }
        }

        // --- Abprallen an den Außenrändern (UND TOR-LOGIK) ---
        let torOben = (HOEHE / 2) - 60;
        let torUnten = (HOEHE / 2) + 60;

        // Linke Wand
        if (ball.x - ball.radius < 0) { 
            if (ball.y > torOben && ball.y < torUnten) {
                torGefallen("blau"); 
                return; // WICHTIG: Sub-Stepping sofort abbrechen!
            } else {
                ball.x = ball.radius; ball.dx = Math.abs(ball.dx);
            }
        }
        // Rechte Wand
        if (ball.x + ball.radius > BREITE) { 
            if (ball.y > torOben && ball.y < torUnten) {
                torGefallen("rot"); 
                return; // WICHTIG: Sub-Stepping sofort abbrechen!
            } else {
                ball.x = BREITE - ball.radius; ball.dx = -Math.abs(ball.dx); 
            }
        }
        // Oben und Unten
        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy = Math.abs(ball.dy); }
        if (ball.y + ball.radius > HOEHE) { ball.y = HOEHE - ball.radius; ball.dy = -Math.abs(ball.dy); }
    }
}


// --- DIE ZEICHNEN-FUNKTION (Bleibt fast gleich) ---
function zeichneAlles() {
    // Rasen
    ctx.fillStyle = "#2e8b57";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    
    // Rasen-Streifen (Stadion-Look)
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Ein leichtes Schwarz für die dunkleren Streifen
    for (let i = 0; i < BREITE; i += 100) {
        ctx.fillRect(i, 0, 50, HOEHE); // Malt alle 100 Pixel einen 50 Pixel breiten Streifen
    }

    // Linien
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(BREITE / 2, 0); ctx.lineTo(BREITE / 2, HOEHE);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(BREITE / 2, HOEHE / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Tore
    ctx.fillStyle = "white";
    ctx.fillRect(0, HOEHE / 2 - 60, 10, 120); 
    ctx.fillRect(BREITE - 10, HOEHE / 2 - 60, 10, 120);

    // Schatten (Ball & Spieler)
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; // Halbtransparentes, dunkles Grau
    // Ball Schatten
    ctx.beginPath(); ctx.arc(ball.x + 4, ball.y + 4, ball.radius, 0, Math.PI * 2); ctx.fill();
    // Spieler 1 Schatten
    ctx.beginPath(); ctx.arc(spieler1.x + 4, spieler1.y + 4, spieler1.radius, 0, Math.PI * 2); ctx.fill();
    // Spieler 2 Schatten
    ctx.beginPath(); ctx.arc(spieler2.x + 4, spieler2.y + 4, spieler2.radius, 0, Math.PI * 2); ctx.fill();

    // Ball
    ctx.fillStyle = ball.farbe;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();

    // Spieler 1
    ctx.fillStyle = spieler1.farbe;
    ctx.beginPath(); ctx.arc(spieler1.x, spieler1.y, spieler1.radius, 0, Math.PI * 2); ctx.fill();

    // Spieler 2
    ctx.fillStyle = spieler2.farbe;
    ctx.beginPath(); ctx.arc(spieler2.x, spieler2.y, spieler2.radius, 0, Math.PI * 2); ctx.fill();

    // Tor-Nachricht einblenden
    if (Date.now() < torTextBis) {
        ctx.fillStyle = "gold";
        ctx.font = "bold 80px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TOOOOR!", BREITE / 2, HOEHE / 2);
        
        // Eine schwarze Umrandung um den goldenen Text
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        ctx.strokeText("TOOOOR!", BREITE / 2, HOEHE / 2);
    }

    // Game Over / Startbildschirm
    if (!spielLaeuft) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, BREITE, HOEHE);
        
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (spielEndeText !== "") {
            ctx.fillStyle = "white";
            ctx.font = "bold 60px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("SPIELENDE", BREITE / 2, HOEHE / 2 - 40);
            ctx.fillStyle = "gold";
            ctx.font = "bold 40px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(spielEndeText, BREITE / 2, HOEHE / 2 + 30);
        } else {
            ctx.fillStyle = "white";
            ctx.font = "bold 50px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("Klicke auf 'Spiel starten'", BREITE / 2, HOEHE / 2);
        }
    }
}


// --- DAS DAUMENKINO (Game Loop) ---
function gameLoop() {
    update();        // 1. NEU: Erst rechnen (Bewegung)
    zeichneAlles();  // 2. Dann malen
    requestAnimationFrame(gameLoop); // 3. Wiederholen!
}

gameLoop();