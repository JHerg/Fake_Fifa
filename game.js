const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BREITE = canvas.width;
const HOEHE = canvas.height;

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

// Wenn eine Taste HERUNTERGEDRÜCKT wird, merken wir uns: "Wahr" (true)
window.addEventListener("keydown", function(event) {
    tasten[event.key] = true;
});

// Wenn eine Taste LOSGELASSEN wird, merken wir uns: "Falsch" (false)
window.addEventListener("keyup", function(event) {
    tasten[event.key] = false;
});

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
    
    // --- Spieler 1 (Rot) mit W, A, S, D ---
    // WICHTIG FÜR DEINEN SOHN: Beim Programmieren ist Y = 0 ganz OBEN am Bildschirm!
    // Wenn wir nach oben wollen, müssen wir also Minus rechnen.
    if (tasten["w"]) { spieler1.y = spieler1.y - spieler1.geschwindigkeit; }
    if (tasten["s"]) { spieler1.y = spieler1.y + spieler1.geschwindigkeit; }
    if (tasten["a"]) { spieler1.x = spieler1.x - spieler1.geschwindigkeit; }
    if (tasten["d"]) { spieler1.x = spieler1.x + spieler1.geschwindigkeit; }

    // --- Grenzen für Spieler 1 prüfen ---
    // Wenn die Position minus Radius kleiner als 0 ist, stoßen wir oben/links an.
    if (spieler1.y - spieler1.radius < 0) { spieler1.y = spieler1.radius; } // Oben
    if (spieler1.x - spieler1.radius < 0) { spieler1.x = spieler1.radius; } // Links
    // Wenn die Position plus Radius größer als das Feld ist, stoßen wir unten/rechts an.
    if (spieler1.y + spieler1.radius > HOEHE) { spieler1.y = HOEHE - spieler1.radius; } // Unten
    if (spieler1.x + spieler1.radius > BREITE) { spieler1.x = BREITE - spieler1.radius; } // Rechts

    // --- Spieler 2 (Blau) mit den Pfeiltasten ---
    if (tasten["ArrowUp"]) { spieler2.y = spieler2.y - spieler2.geschwindigkeit; }
    if (tasten["ArrowDown"]) { spieler2.y = spieler2.y + spieler2.geschwindigkeit; }
    if (tasten["ArrowLeft"]) { spieler2.x = spieler2.x - spieler2.geschwindigkeit; }
    if (tasten["ArrowRight"]) { spieler2.x = spieler2.x + spieler2.geschwindigkeit; }

    // --- Grenzen für Spieler 2 prüfen ---
    if (spieler2.y - spieler2.radius < 0) { spieler2.y = spieler2.radius; } // Oben
    if (spieler2.x - spieler2.radius < 0) { spieler2.x = spieler2.radius; } // Links
    if (spieler2.y + spieler2.radius > HOEHE) { spieler2.y = HOEHE - spieler2.radius; } // Unten
    if (spieler2.x + spieler2.radius > BREITE) { spieler2.x = BREITE - spieler2.radius; } // Rechts

    // --- NEU: Spieler-Kollision (Gegenseitiges Blockieren) ---
    // Wir berechnen den Abstand zwischen beiden Spielern
    let pDx = spieler2.x - spieler1.x;
    let pDy = spieler2.y - spieler1.y;
    let pDistanz = Math.sqrt(pDx * pDx + pDy * pDy);
    let pMinDistanz = spieler1.radius + spieler2.radius;

    // Wenn sie sich überlappen, schieben wir beide gleichmäßig auseinander
    if (pDistanz < pMinDistanz && pDistanz > 0) {
        let pUeberlappung = pMinDistanz - pDistanz;
        spieler1.x -= (pDx / pDistanz) * (pUeberlappung / 2);
        spieler1.y -= (pDy / pDistanz) * (pUeberlappung / 2);
        spieler2.x += (pDx / pDistanz) * (pUeberlappung / 2);
        spieler2.y += (pDy / pDistanz) * (pUeberlappung / 2);
    }

    // --- NEU: BALL-PHYSIK ---
    // 1. Reibung (Ball rollt jetzt durch den Wert 0.99 deutlich länger und realistischer)
    ball.dx = ball.dx * 0.99;
    ball.dy = ball.dy * 0.99;

    // Ball anhand der Geschwindigkeit bewegen
    ball.x = ball.x + ball.dx;
    ball.y = ball.y + ball.dy;

    // --- 2. Kreis-Kollision mit den Spielern (JETZT VOR DEN WÄNDEN) ---
    // Dadurch wird der Ball nicht durch Wände gedrückt, wenn ein Spieler ihn einklemmt!
    let alleSpieler = [spieler1, spieler2];
    for (let i = 0; i < alleSpieler.length; i++) {
        let spieler = alleSpieler[i];
        
        // Satz des Pythagoras: a² + b² = c² (um die Distanz zwischen zwei Punkten zu messen)
        let abstandX = ball.x - spieler.x;
        let abstandY = ball.y - spieler.y;
        let distanz = Math.sqrt(abstandX * abstandX + abstandY * abstandY);
        
        let minAbstand = ball.radius + spieler.radius;
        
        if (distanz < minAbstand && distanz > 0) {
            // Spieler berührt den Ball! Richtung vom Spieler zum Ball berechnen
            let richtungX = abstandX / distanz;
            let richtungY = abstandY / distanz;
            
            // Ball aus dem Spieler herausschieben, damit er nicht "stecken bleibt"
            let ueberlappung = minAbstand - distanz;
            ball.x = ball.x + (richtungX * ueberlappung);
            ball.y = ball.y + (richtungY * ueberlappung);
            
            // Impuls übertragen (Ball wegstoßen)
            let schusskraft = 8;
            ball.dx = richtungX * schusskraft;
            ball.dy = richtungY * schusskraft;
        }
    }

    // --- 3. Abprallen an den Außenrändern (UND TOR-LOGIK) ---
    // Das Tor ist 120 Pixel hoch. Von der Mitte (HOEHE/2) sind das 60 nach oben und 60 nach unten.
    let torOben = (HOEHE / 2) - 60;
    let torUnten = (HOEHE / 2) + 60;

    // Linke Wand
    if (ball.x - ball.radius < 0) { 
        if (ball.y > torOben && ball.y < torUnten) {
            torGefallen("blau"); // Tor auf der linken Seite ist ein Punkt für Blau!
            return; // WICHTIG: Update sofort abbrechen, damit der Tor-Reset intakt bleibt
        } else {
            ball.x = ball.radius; ball.dx = Math.abs(ball.dx); // Math.abs verhindert "Klebenbleiben" an der Wand
        }
    }
    // Rechte Wand
    if (ball.x + ball.radius > BREITE) { 
        if (ball.y > torOben && ball.y < torUnten) {
            torGefallen("rot"); // Tor auf der rechten Seite ist ein Punkt für Rot!
            return; // WICHTIG: Update sofort abbrechen!
        } else {
            ball.x = BREITE - ball.radius; ball.dx = -Math.abs(ball.dx); 
        }
    }
    // Oben und Unten
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy = Math.abs(ball.dy); }
    if (ball.y + ball.radius > HOEHE) { ball.y = HOEHE - ball.radius; ball.dy = -Math.abs(ball.dy); }
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