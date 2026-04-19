const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BREITE = canvas.width;
const HOEHE = canvas.height;

// --- NEU: PUNKTESTAND ---
let toreRot = 0;
let toreBlau = 0;
const scoreRedEl = document.getElementById("scoreRed");
const scoreBlueEl = document.getElementById("scoreBlue");
let torTextBis = 0; // Merkt sich, wie lange der "TOOOOR!" Text gezeigt werden soll

// --- UNSERE SPIELFIGUREN ---
let ball = { x: BREITE / 2, y: HOEHE / 2, radius: 10, farbe: "white", dx: 0, dy: 0 };
let spieler1 = { x: 100, y: HOEHE / 2, radius: 20, farbe: "#ff4d4d", geschwindigkeit: 5 };
let spieler2 = { x: BREITE - 100, y: HOEHE / 2, radius: 20, farbe: "#4da6ff", geschwindigkeit: 5 };

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
function resetBall() {
    ball.x = BREITE / 2;
    ball.y = HOEHE / 2;
    ball.dx = 0;
    ball.dy = 0;
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
    resetBall();
}

function resetSpiel() {
    // Spielstand zurücksetzen
    toreRot = 0;
    toreBlau = 0;
    scoreRedEl.innerText = toreRot;
    scoreBlueEl.innerText = toreBlau;
    
    // Figuren zurücksetzen
    resetBall();
    spieler1.x = 100;
    spieler1.y = HOEHE / 2;
    spieler2.x = BREITE - 100;
    spieler2.y = HOEHE / 2;
}

// Verbinden unseres Buttons aus dem HTML mit unserer Reset-Funktion
document.getElementById("btnReset").addEventListener("click", resetSpiel);

// --- NEU: DIE RECHEN-FUNKTION (Update) ---
// Hier bewegen wir die Spieler, BEVOR wir sie zeichnen
function update() {
    
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

    // --- NEU: BALL-PHYSIK ---
    // 1. Reibung (der Ball rollt langsam aus)
    ball.dx = ball.dx * 0.98;
    ball.dy = ball.dy * 0.98;

    // Ball anhand der Geschwindigkeit bewegen
    ball.x = ball.x + ball.dx;
    ball.y = ball.y + ball.dy;

    // 2. Abprallen an den Außenrändern
    // NEU: Tor-Logik prüfen (Ist der Ball in der Höhe des Tores?)
    // Das Tor ist 120 Pixel hoch. Von der Mitte (HOEHE/2) sind das 60 nach oben und 60 nach unten.
    let torOben = (HOEHE / 2) - 60;
    let torUnten = (HOEHE / 2) + 60;

    // Linke Wand
    if (ball.x - ball.radius < 0) { 
        if (ball.y > torOben && ball.y < torUnten) {
            torGefallen("blau"); // Tor auf der linken Seite ist ein Punkt für Blau!
        } else {
            ball.x = ball.radius; ball.dx = -ball.dx; 
        }
    }
    // Rechte Wand
    if (ball.x + ball.radius > BREITE) { 
        if (ball.y > torOben && ball.y < torUnten) {
            torGefallen("rot"); // Tor auf der rechten Seite ist ein Punkt für Rot!
        } else {
            ball.x = BREITE - ball.radius; ball.dx = -ball.dx; 
        }
    }
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy = -ball.dy; } // Oben
    if (ball.y + ball.radius > HOEHE) { ball.y = HOEHE - ball.radius; ball.dy = -ball.dy; } // Unten

    // 3. Kreis-Kollision mit den Spielern
    let alleSpieler = [spieler1, spieler2];
    for (let i = 0; i < alleSpieler.length; i++) {
        let spieler = alleSpieler[i];
        
        // Satz des Pythagoras: a² + b² = c² (um die Distanz zwischen zwei Punkten zu messen)
        let abstandX = ball.x - spieler.x;
        let abstandY = ball.y - spieler.y;
        let distanz = Math.sqrt(abstandX * abstandX + abstandY * abstandY);
        
        let minAbstand = ball.radius + spieler.radius;
        
        if (distanz < minAbstand) {
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
}


// --- DAS DAUMENKINO (Game Loop) ---
function gameLoop() {
    update();        // 1. NEU: Erst rechnen (Bewegung)
    zeichneAlles();  // 2. Dann malen
    requestAnimationFrame(gameLoop); // 3. Wiederholen!
}

gameLoop();