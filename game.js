const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BREITE = canvas.width;
const HOEHE = canvas.height;

// --- RESPONSIVES CANVAS ---
function passeCanvasAn() {
    let fensterBreite = window.innerWidth;
    let fensterHoehe = window.innerHeight;
    let verfuegbareHoehe = fensterHoehe - 220; 
    let seitenVerhaeltnis = BREITE / HOEHE; 
    
    let neueBreite = fensterBreite * 0.95; 
    let neueHoehe = neueBreite / seitenVerhaeltnis;
    
    if (neueHoehe > verfuegbareHoehe) {
        neueHoehe = verfuegbareHoehe;
        neueBreite = neueHoehe * seitenVerhaeltnis;
    }
    
    canvas.style.width = neueBreite + "px";
    canvas.style.height = neueHoehe + "px";
}
window.addEventListener("resize", passeCanvasAn);
passeCanvasAn();

// --- AUDIO SYSTEM ---
let audioCtx = null;
let soundEnabled = true;

document.getElementById("btnSound").addEventListener("click", function() {
    soundEnabled = !soundEnabled;
    this.innerText = soundEnabled ? "🔊" : "🔇";
    initAudio();
});

function initAudio() {
    if (!audioCtx && soundEnabled) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new window.AudioContext();
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    let now = audioCtx.currentTime;

    if (type === 'kick') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gainNode.gain.setValueAtTime(0.5, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'whistle') {
        osc.type = 'square'; osc.frequency.setValueAtTime(2000, now); osc.frequency.setValueAtTime(2200, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0.3, now + 0.3); gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'goal') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.5, now + 0.2); gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);
    }
}

// --- VISUAL JUICE ---
let particles = []; let screenShake = 0; let visualBallTrail = [];

function createExplosion(x, y, farbe) {
    for (let i = 0; i < 30; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1.0, color: farbe, size: Math.random() * 5 + 2 });
    }
}
function createDust(x, y) {
    if (Math.random() > 0.5) {
        particles.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: 0, vy: -1, life: 0.5, color: "rgba(255,255,255,0.4)", size: 3 });
    }
}

// --- SPIEL-VARIABLEN ---
let toreRot = 0; let toreBlau = 0;
const scoreRedEl = document.getElementById("scoreRed");
const scoreBlueEl = document.getElementById("scoreBlue");
const timerEl = document.getElementById("timerDisplay");
let spielLaeuft = false; let spielZeit = 120; let letzterFrame = Date.now(); let spielEndeText = ""; let torTextBis = 0;

// --- UNSERE SPIELFIGUREN ---
let ball = { x: BREITE / 2, y: HOEHE / 2, radius: 10, farbe: "white", dx: 0, dy: 0 };
// NEU: img Object hinzugefügt
let spieler1 = { x: 100, y: HOEHE / 2, radius: 25, farbe: "#ff4d4d", baseSpeed: 5, stamina: 100, isDashing: false, img: new Image() };
let spieler2 = { x: BREITE - 100, y: HOEHE / 2, radius: 25, farbe: "#4da6ff", baseSpeed: 5, stamina: 100, isDashing: false, img: new Image() };

// --- NEU: TEAMS UND SPIELER-KADER ---
const teamFarben = {
    "Bayer Leverkusen": "#e32221", "FC Bayern": "#dc052d", "VfB Stuttgart": "#e32228",
    "Dortmund": "#fde100", "RB Leipzig": "#dd013f", "Eintracht Frankfurt": "#000000",
    "Hoffenheim": "#0066b2", "Heidenheim": "#e2001a", "Werder Bremen": "#1d9053",
    "Freiburg": "#c0001f", "Augsburg": "#ba3733", "Wolfsburg": "#65b32e",
    "Mainz 05": "#ed1c24", "Gladbach": "#1f1f1f", "Union Berlin": "#d4011d",
    "Bochum": "#005ca9", "FC St. Pauli": "#533527", "Holstein Kiel": "#0060af"
};

const teamKader = {
    "Bayer Leverkusen": ["Florian Wirtz", "Granit Xhaka", "Jeremie Frimpong"],
    "FC Bayern": ["Harry Kane", "Jamal Musiala", "Thomas Müller"],
    "VfB Stuttgart": ["Serhou Guirassy", "Deniz Undav", "Chris Führich"],
    "Dortmund": ["Julian Brandt", "Niclas Füllkrug", "Jadon Sancho"],
    "RB Leipzig": ["Xavi Simons", "Lois Openda", "Dani Olmo"]
    // Für alle anderen generieren wir Standard-Namen
};

const teamLeftSelect = document.getElementById("teamLeft");
const teamRightSelect = document.getElementById("teamRight");
const playerLeftSelect = document.getElementById("playerLeft");
const playerRightSelect = document.getElementById("playerRight");
const aiSelect = document.getElementById("aiSelect");

// UI: Lade Spieler ins Dropdown basierend auf Team
function updatePlayerDropdowns() {
    let kaderLinks = teamKader[teamLeftSelect.value] || ["Star 1", "Star 2", "Star 3"];
    let kaderRechts = teamKader[teamRightSelect.value] || ["Star 1", "Star 2", "Star 3"];
    
    playerLeftSelect.innerHTML = "";
    kaderLinks.forEach(player => playerLeftSelect.innerHTML += `<option value="${player}">${player}</option>`);
    
    playerRightSelect.innerHTML = "";
    kaderRechts.forEach(player => playerRightSelect.innerHTML += `<option value="${player}">${player}</option>`);
}

// BILDER UPDATEN
function updateTeamUndBilder() {
    spieler1.farbe = teamFarben[teamLeftSelect.value];
    spieler2.farbe = teamFarben[teamRightSelect.value];
    scoreRedEl.style.backgroundColor = spieler1.farbe;
    scoreBlueEl.style.backgroundColor = spieler2.farbe;

    let p1Name = playerLeftSelect.value;
    let p2Name = playerRightSelect.value;

    // MAGIE: Wir generieren Comic-Köpfe via DiceBear API basierend auf dem Namen!
    // WENN DU EIGENE BILDER HAST, ÄNDERE DEN LINK HIER:
    // z.B. spieler1.img.src = `images/${p1Name.replace(' ', '_')}.png`;
    spieler1.img.src = `https://api.dicebear.com/8.x/notionists/svg?seed=${p1Name}&backgroundColor=transparent`;
    spieler2.img.src = `https://api.dicebear.com/8.x/notionists/svg?seed=${p2Name}&backgroundColor=transparent`;
}

// Event Listeners für Dropdowns
teamLeftSelect.addEventListener("change", () => { updatePlayerDropdowns(); updateTeamUndBilder(); });
teamRightSelect.addEventListener("change", () => { updatePlayerDropdowns(); updateTeamUndBilder(); });
playerLeftSelect.addEventListener("change", updateTeamUndBilder);
playerRightSelect.addEventListener("change", updateTeamUndBilder);

// Initial Setup
updatePlayerDropdowns();
updateTeamUndBilder();

// KI LOGIK
let currentAiMode = "human"; let aiTargetX = BREITE - 100, aiTargetY = HOEHE / 2;
let aiUpdateCounter = 0, aiLastX = BREITE - 100, aiLastY = HOEHE / 2, aiStuckFrames = 0; let aiBallHistory = [];
function setzeSpielModus() {
    currentAiMode = aiSelect.value;
    if (currentAiMode === "ai1") spieler2.baseSpeed = 3; else if (currentAiMode === "ai2") spieler2.baseSpeed = 5; else if (currentAiMode === "ai3") spieler2.baseSpeed = 7; else spieler2.baseSpeed = 5;
}
aiSelect.addEventListener("change", setzeSpielModus); setzeSpielModus();

// --- STEUERUNG ---
const tasten = {}; let mouseX = null; let mouseY = null; let mouseActive = false; let mobileDashActive = false;
window.addEventListener("keydown", function(event) { tasten[event.key] = true; if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) mouseActive = false; initAudio(); });
window.addEventListener("keyup", function(event) { tasten[event.key] = false; });
canvas.addEventListener("mousemove", function(event) {
    let rect = canvas.getBoundingClientRect(); mouseX = (event.clientX - rect.left) * (canvas.width / rect.width); mouseY = (event.clientY - rect.top) * (canvas.height / rect.height); mouseActive = true;
});
function handleTouch(event) {
    event.preventDefault(); let rect = canvas.getBoundingClientRect(); let touch = event.touches[0];
    mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width); mouseY = ((touch.clientY - rect.top) * (canvas.height / rect.height)) - 40; mouseActive = true; initAudio();
}
canvas.addEventListener("touchstart", handleTouch, { passive: false }); canvas.addEventListener("touchmove", handleTouch, { passive: false });

const mobDashBtn = document.getElementById("mobileDashBtn");
mobDashBtn.addEventListener("touchstart", (e) => { e.preventDefault(); mobileDashActive = true; initAudio(); });
mobDashBtn.addEventListener("touchend", (e) => { e.preventDefault(); mobileDashActive = false; });
mobDashBtn.addEventListener("mousedown", () => { mobileDashActive = true; initAudio(); });
mobDashBtn.addEventListener("mouseup", () => { mobileDashActive = false; });

// --- RESET & TOR ---
function resetPositionen() {
    ball.x = BREITE / 2; ball.y = HOEHE / 2; ball.dx = 0; ball.dy = 0;
    spieler1.x = 100; spieler1.y = HOEHE / 2; spieler1.stamina = 100;
    spieler2.x = BREITE - 100; spieler2.y = HOEHE / 2; spieler2.stamina = 100;
    mouseActive = false; aiBallHistory = []; visualBallTrail = [];
}

function torGefallen(team) {
    if (team === "rot") { toreRot++; scoreRedEl.innerText = toreRot; createExplosion(BREITE - 10, HOEHE/2, spieler1.farbe); } 
    else { toreBlau++; scoreBlueEl.innerText = toreBlau; createExplosion(10, HOEHE/2, spieler2.farbe); }
    playSound('goal'); screenShake = 15; torTextBis = Date.now() + 2000; resetPositionen();
}

document.getElementById("btnStart").addEventListener("click", function() {
    initAudio(); playSound('whistle');
    toreRot = 0; toreBlau = 0; scoreRedEl.innerText = "0"; scoreBlueEl.innerText = "0"; spielZeit = 120; timerEl.innerText = "2:00";
    spielEndeText = ""; resetPositionen(); setzeSpielModus();
    aiLastX = spieler2.x; aiLastY = spieler2.y; aiStuckFrames = 0; letzterFrame = Date.now(); spielLaeuft = true;
});

// --- TABELLEN LOGIK ---
function spielBeenden() {
    playSound('whistle'); let teamLinks = teamLeftSelect.value; let teamRechts = teamRightSelect.value;
    if (toreRot > toreBlau) { spielEndeText = teamLinks + " gewinnt!"; speichereErgebnis(teamLinks, "sieg"); speichereErgebnis(teamRechts, "niederlage"); } 
    else if (toreBlau > toreRot) { spielEndeText = teamRechts + " gewinnt!"; speichereErgebnis(teamRechts, "sieg"); speichereErgebnis(teamLinks, "niederlage"); } 
    else { spielEndeText = "Unentschieden!"; speichereErgebnis(teamLinks, "unentschieden"); speichereErgebnis(teamRechts, "unentschieden"); }
    aktualisiereTabelle();
}

function speichereErgebnis(teamName, ergebnisTyp) {
    let tabelle = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    if (!tabelle[teamName]) tabelle[teamName] = { siege: 0, unentschieden: 0, niederlagen: 0 };
    if (ergebnisTyp === "sieg") tabelle[teamName].siege++; if (ergebnisTyp === "unentschieden") tabelle[teamName].unentschieden++; if (ergebnisTyp === "niederlage") tabelle[teamName].niederlagen++;
    localStorage.setItem('fifaTabelle', JSON.stringify(tabelle));
}

function aktualisiereTabelle() {
    let tabelle = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    let body = document.getElementById("leaderboardBody"); body.innerHTML = "";
    let teamsArray = [];
    for (let team in tabelle) teamsArray.push({ name: team, stats: tabelle[team], punkte: (tabelle[team].siege * 3) + tabelle[team].unentschieden });
    teamsArray.sort((a, b) => b.punkte - a.punkte);
    for (let i = 0; i < teamsArray.length; i++) {
        let tr = document.createElement("tr");
        tr.innerHTML = `<td><strong>${i + 1}. ${teamsArray[i].name}</strong> (${teamsArray[i].punkte} Pkt)</td><td>${teamsArray[i].stats.siege}</td><td>${teamsArray[i].stats.unentschieden}</td><td>${teamsArray[i].stats.niederlagen}</td>`;
        body.appendChild(tr);
    }
}
aktualisiereTabelle();

// --- UPDATE LOOP ---
function update() {
    if (!spielLaeuft) return;
    let jetzt = Date.now(); let dt = (jetzt - letzterFrame) / 1000; letzterFrame = jetzt;
    spielZeit -= dt; if (spielZeit <= 0) { spielZeit = 0; spielLaeuft = false; spielBeenden(); }
    let minuten = Math.floor(spielZeit / 60); let sekunden = Math.floor(spielZeit % 60);
    timerEl.innerText = minuten + ":" + (sekunden < 10 ? "0" : "") + sekunden;
    
    let ballSpeed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy);
    if (ballSpeed > 5) visualBallTrail.push({x: ball.x, y: ball.y, alpha: 0.5});
    if (visualBallTrail.length > 10) visualBallTrail.shift();
    for (let t of visualBallTrail) t.alpha -= 0.05;

    aiBallHistory.push({ x: ball.x, y: ball.y }); if (aiBallHistory.length > 6) aiBallHistory.shift();
    let delayedBall = aiBallHistory[0] || ball;

    if (currentAiMode !== "human") {
        aiUpdateCounter++;
        if (aiUpdateCounter >= 10) {
            aiUpdateCounter = 0;
            let distMoved = Math.hypot(spieler2.x - aiLastX, spieler2.y - aiLastY);
            if (distMoved < 5) aiStuckFrames += 10; else aiStuckFrames = 0;
            aiLastX = spieler2.x; aiLastY = spieler2.y;
            if (aiStuckFrames >= 60) {
                aiTargetX = BREITE / 2; aiTargetY = HOEHE / 2; if (aiStuckFrames >= 90) aiStuckFrames = 0;
            } else {
                if (currentAiMode === "ai1") { aiTargetX = BREITE - 100; aiTargetY = (ball.x > BREITE / 2) ? ball.y : HOEHE / 2; } 
                else if (currentAiMode === "ai2") { if (ball.x > BREITE / 2) { aiTargetX = ball.x; aiTargetY = ball.y; } else { aiTargetX = (BREITE / 2) + 100; aiTargetY = ball.y; } } 
                else if (currentAiMode === "ai3") { aiTargetX = delayedBall.x + 20; aiTargetY = delayedBall.y; if (Math.hypot(ball.x - spieler2.x, ball.y - spieler2.y) < 100 && spieler2.stamina > 50) tasten["Shift"] = true; else tasten["Shift"] = false; }
                let minWand = spieler2.radius + 15;
                aiTargetX = Math.max(minWand, Math.min(BREITE - minWand, aiTargetX)); aiTargetY = Math.max(minWand, Math.min(HOEHE - minWand, aiTargetY));
            }
        }
    }

    spieler1.isDashing = (tasten[" "] || mobileDashActive) && spieler1.stamina > 0;
    spieler2.isDashing = (tasten["Shift"] || tasten["Enter"]) && spieler2.stamina > 0;
    let s1AktuelleSpeed = spieler1.isDashing ? spieler1.baseSpeed * 2.5 : spieler1.baseSpeed;
    let s2AktuelleSpeed = spieler2.isDashing ? spieler2.baseSpeed * 2.5 : spieler2.baseSpeed;

    if (spieler1.isDashing) spieler1.stamina -= 2; else if (spieler1.stamina < 100) spieler1.stamina += 0.5;
    if (spieler2.isDashing) spieler2.stamina -= 2; else if (spieler2.stamina < 100) spieler2.stamina += 0.5;
    if (spieler1.isDashing && mouseActive) createDust(spieler1.x, spieler1.y);

    const SUBSTEPS = 4;
    for (let step = 0; step < SUBSTEPS; step++) {
        let speed1 = s1AktuelleSpeed / SUBSTEPS; let speed2 = s2AktuelleSpeed / SUBSTEPS;
        let isKickoffPause = Date.now() < torTextBis;

        if (!isKickoffPause) {
            if (mouseActive && mouseX !== null && mouseY !== null) {
                let zielX = Math.max(spieler1.radius, Math.min(BREITE - spieler1.radius, mouseX));
                let zielY = Math.max(spieler1.radius, Math.min(HOEHE - spieler1.radius, mouseY));
                let folgeSpeed = spieler1.isDashing ? 0.3 : 0.1; 
                spieler1.x += (zielX - spieler1.x) * folgeSpeed; spieler1.y += (zielY - spieler1.y) * folgeSpeed;
            } else {
                if (tasten["w"]) spieler1.y -= speed1; if (tasten["s"]) spieler1.y += speed1;
                if (tasten["a"]) spieler1.x -= speed1; if (tasten["d"]) spieler1.x += speed1;
            }
            if (currentAiMode === "human") {
                if (tasten["ArrowUp"]) spieler2.y -= speed2; if (tasten["ArrowDown"]) spieler2.y += speed2;
                if (tasten["ArrowLeft"]) spieler2.x -= speed2; if (tasten["ArrowRight"]) spieler2.x += speed2;
            } else {
                let dx = aiTargetX - spieler2.x; let dy = aiTargetY - spieler2.y; let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) { spieler2.x += (dx / dist) * Math.min(speed2, dist); spieler2.y += (dy / dist) * Math.min(speed2, dist); }
            }
        }

        spieler1.y = Math.max(spieler1.radius, Math.min(HOEHE - spieler1.radius, spieler1.y)); spieler1.x = Math.max(spieler1.radius, Math.min(BREITE - spieler1.radius, spieler1.x));
        spieler2.y = Math.max(spieler2.radius, Math.min(HOEHE - spieler2.radius, spieler2.y)); spieler2.x = Math.max(spieler2.radius, Math.min(BREITE - spieler2.radius, spieler2.x));

        let pDx = spieler2.x - spieler1.x; let pDy = spieler2.y - spieler1.y; let pDistanz = Math.sqrt(pDx * pDx + pDy * pDy); let pMinDistanz = spieler1.radius + spieler2.radius;
        if (pDistanz < pMinDistanz && pDistanz > 0) {
            let pUeberlappung = pMinDistanz - pDistanz;
            spieler1.x -= (pDx / pDistanz) * (pUeberlappung / 2); spieler1.y -= (pDy / pDistanz) * (pUeberlappung / 2);
            spieler2.x += (pDx / pDistanz) * (pUeberlappung / 2); spieler2.y += (pDy / pDistanz) * (pUeberlappung / 2);
        }

        ball.dx *= Math.pow(0.99, 1/SUBSTEPS); ball.dy *= Math.pow(0.99, 1/SUBSTEPS);
        let maxBallSpeed = (spieler1.radius * 2) + 10; let currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (currentSpeed > maxBallSpeed) { ball.dx = (ball.dx / currentSpeed) * maxBallSpeed; ball.dy = (ball.dy / currentSpeed) * maxBallSpeed; }
        ball.x += ball.dx / SUBSTEPS; ball.y += ball.dy / SUBSTEPS;

        let alleSpieler = [spieler1, spieler2];
        for (let i = 0; i < alleSpieler.length; i++) {
            let sp = alleSpieler[i]; let abstandX = ball.x - sp.x; let abstandY = ball.y - sp.y; let distanz = Math.sqrt(abstandX * abstandX + abstandY * abstandY); let minAbstand = ball.radius + sp.radius;
            if (distanz < minAbstand && distanz > 0) {
                let richtungX = abstandX / distanz; let richtungY = abstandY / distanz; let ueberlappung = minAbstand - distanz;
                ball.x += richtungX * ueberlappung; ball.y += richtungY * ueberlappung;
                let pushKraft = sp.isDashing ? 40 : 15; ball.dx += richtungX * (pushKraft / SUBSTEPS); ball.dy += richtungY * (pushKraft / SUBSTEPS);
                if (pushKraft === 40 && step === 0) playSound('kick');
            }
        }

        let torOben = (HOEHE / 2) - 60; let torUnten = (HOEHE / 2) + 60;
        if (ball.x - ball.radius < 0) { 
            if (ball.y > torOben && ball.y < torUnten) { torGefallen("blau"); return; } 
            else { ball.x = ball.radius; ball.dx = Math.abs(ball.dx); if(Math.abs(ball.dx) > 5) playSound('kick'); }
        }
        if (ball.x + ball.radius > BREITE) { 
            if (ball.y > torOben && ball.y < torUnten) { torGefallen("rot"); return; } 
            else { ball.x = BREITE - ball.radius; ball.dx = -Math.abs(ball.dx); if(Math.abs(ball.dx) > 5) playSound('kick'); }
        }
        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy = Math.abs(ball.dy); }
        if (ball.y + ball.radius > HOEHE) { ball.y = HOEHE - ball.radius; ball.dy = -Math.abs(ball.dy); }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.02; if (p.life <= 0) particles.splice(i, 1);
    }
}

// --- NEU: HILFSFUNKTION FÜR RUNDE AVATARE ---
function zeichneSpielerMitAvatar(spieler) {
    ctx.save();
    
    // 1. Zuerst die Farbe des Teams als Hintergrund malen
    ctx.fillStyle = spieler.farbe;
    ctx.beginPath();
    ctx.arc(spieler.x, spieler.y, spieler.radius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Clipping Maske erstellen (damit das Bild nicht über den Kreis ragt)
    ctx.beginPath();
    ctx.arc(spieler.x, spieler.y, spieler.radius, 0, Math.PI * 2);
    ctx.clip(); // Ab hier wird alles, was über den Kreis hinausgeht, abgeschnitten!

    // 3. Bild in den Kreis zeichnen (falls es geladen ist)
    if (spieler.img.complete && spieler.img.naturalHeight !== 0) {
        // Wir zeichnen das Bild exakt zentriert über die Koordinaten
        let imgSize = spieler.radius * 2;
        ctx.drawImage(spieler.img, spieler.x - spieler.radius, spieler.y - spieler.radius, imgSize, imgSize);
    }

    ctx.restore(); // Maske wieder entfernen

    // 4. Ein cooler Rand um den Spieler, damit er sich vom Rasen abhebt
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(spieler.x, spieler.y, spieler.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Ausdauerbalken über den Kopf malen
    ctx.fillStyle = "black"; ctx.fillRect(spieler.x - 16, spieler.y - 35, 32, 6);
    ctx.fillStyle = spieler.stamina > 20 ? "#00ff00" : "red";
    ctx.fillRect(spieler.x - 15, spieler.y - 34, 30 * (Math.max(0, spieler.stamina)/100), 4);
}

// --- DRAW LOOP ---
function zeichneAlles() {
    ctx.save();
    if (screenShake > 0.5) { ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake); screenShake *= 0.9; }

    ctx.fillStyle = "#2e8b57"; ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; for (let i = 0; i < BREITE; i += 100) ctx.fillRect(i, 0, 50, HOEHE);

    ctx.strokeStyle = "white"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(BREITE / 2, 0); ctx.lineTo(BREITE / 2, HOEHE); ctx.stroke();
    ctx.beginPath(); ctx.arc(BREITE / 2, HOEHE / 2, 60, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = "white"; ctx.fillRect(0, HOEHE / 2 - 60, 10, 120); ctx.fillRect(BREITE - 10, HOEHE / 2 - 60, 10, 120);

    for (let t of visualBallTrail) {
        if(t.alpha > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha})`; ctx.beginPath(); ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI*2); ctx.fill(); }
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath(); ctx.arc(ball.x + 4, ball.y + 4, ball.radius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(spieler1.x + 4, spieler1.y + 4, spieler1.radius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(spieler2.x + 4, spieler2.y + 4, spieler2.radius, 0, Math.PI * 2); ctx.fill();

    for (let p of particles) {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = ball.farbe; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();

    // NEU: Unsere verbesserte Render-Methode für die Avatare aufrufen!
    zeichneSpielerMitAvatar(spieler1);
    zeichneSpielerMitAvatar(spieler2);

    ctx.restore();

    if (Date.now() < torTextBis) {
        ctx.fillStyle = "gold"; ctx.font = "bold 80px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("TOOOOR!", BREITE / 2, HOEHE / 2); ctx.strokeStyle = "black"; ctx.lineWidth = 4; ctx.strokeText("TOOOOR!", BREITE / 2, HOEHE / 2);
    }

    if (!spielLaeuft) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, BREITE, HOEHE); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (spielEndeText !== "") {
            ctx.fillStyle = "white"; ctx.font = "bold 60px 'Segoe UI', Arial, sans-serif"; ctx.fillText("SPIELENDE", BREITE / 2, HOEHE / 2 - 40);
            ctx.fillStyle = "gold"; ctx.font = "bold 40px 'Segoe UI', Arial, sans-serif"; ctx.fillText(spielEndeText, BREITE / 2, HOEHE / 2 + 30);
        } else {
            ctx.fillStyle = "white"; ctx.font = "bold 50px 'Segoe UI', Arial, sans-serif"; ctx.fillText("Klicke auf 'Spiel starten'", BREITE / 2, HOEHE / 2);
        }
    }
}

function gameLoop() { update(); zeichneAlles(); requestAnimationFrame(gameLoop); }
gameLoop();