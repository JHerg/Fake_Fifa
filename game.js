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

// --- NEU: AUDIO SYSTEM (Synthesizer) ---
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'whistle') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.setValueAtTime(2200, now + 0.1); // Triller-Effekt
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.3);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'goal') {
        // Simpler, aufsteigender Jubel-Akkord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.2);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
    }
}

// --- NEU: VISUAL JUICE (Partikel & Shake) ---
let particles = [];
let screenShake = 0;
let visualBallTrail = [];

function createExplosion(x, y, farbe) {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1.0, color: farbe, size: Math.random() * 5 + 2
        });
    }
}

function createDust(x, y) {
    if (Math.random() > 0.5) {
        particles.push({
            x: x + (Math.random() - 0.5) * 10, 
            y: y + (Math.random() - 0.5) * 10,
            vx: 0, vy: -1,
            life: 0.5, color: "rgba(255,255,255,0.4)", size: 3
        });
    }
}

// --- SPIEL-VARIABLEN ---
let toreRot = 0; let toreBlau = 0;
const scoreRedEl = document.getElementById("scoreRed");
const scoreBlueEl = document.getElementById("scoreBlue");
const timerEl = document.getElementById("timerDisplay");

let spielLaeuft = false;
let spielZeit = 120;
let letzterFrame = Date.now();
let spielEndeText = "";
let torTextBis = 0;

// --- UNSERE SPIELFIGUREN (Jetzt mit Stamina/Ausdauer) ---
let ball = { x: BREITE / 2, y: HOEHE / 2, radius: 10, farbe: "white", dx: 0, dy: 0 };

let spieler1 = { 
    x: 100, y: HOEHE / 2, radius: 20, farbe: "#ff4d4d", 
    baseSpeed: 5, stamina: 100, isDashing: false 
};
let spieler2 = { 
    x: BREITE - 100, y: HOEHE / 2, radius: 20, farbe: "#4da6ff", 
    baseSpeed: 5, stamina: 100, isDashing: false 
};

// Bundesliga Teams & Farben
const teamFarben = {
    "Bayer Leverkusen": "#e32221", "FC Bayern": "#dc052d", "VfB Stuttgart": "#e32228",
    "Dortmund": "#fde100", "RB Leipzig": "#dd013f", "Eintracht Frankfurt": "#000000",
    "Hoffenheim": "#0066b2", "Heidenheim": "#e2001a", "Werder Bremen": "#1d9053",
    "Freiburg": "#c0001f", "Augsburg": "#ba3733", "Wolfsburg": "#65b32e",
    "Mainz 05": "#ed1c24", "Gladbach": "#1f1f1f", "Union Berlin": "#d4011d",
    "Bochum": "#005ca9", "FC St. Pauli": "#533527", "Holstein Kiel": "#0060af"
};

const teamLeftSelect = document.getElementById("teamLeft");
const teamRightSelect = document.getElementById("teamRight");
const aiSelect = document.getElementById("aiSelect");

let currentAiMode = "human";
let aiTargetX = BREITE - 100, aiTargetY = HOEHE / 2;
let aiUpdateCounter = 0, aiLastX = BREITE - 100, aiLastY = HOEHE / 2, aiStuckFrames = 0;
let aiBallHistory = []; // Für KI Delay

function setzeSpielModus() {
    currentAiMode = aiSelect.value;
    if (currentAiMode === "ai1") spieler2.baseSpeed = 3;
    else if (currentAiMode === "ai2") spieler2.baseSpeed = 5;
    else if (currentAiMode === "ai3") spieler2.baseSpeed = 7;
    else spieler2.baseSpeed = 5;
}
aiSelect.addEventListener("change", setzeSpielModus);
setzeSpielModus();

function updateTeamFarben() {
    spieler1.farbe = teamFarben[teamLeftSelect.value];
    spieler2.farbe = teamFarben[teamRightSelect.value];
    scoreRedEl.style.backgroundColor = spieler1.farbe;
    scoreBlueEl.style.backgroundColor = spieler2.farbe;
}
teamLeftSelect.addEventListener("change", updateTeamFarben);
teamRightSelect.addEventListener("change", updateTeamFarben);
updateTeamFarben();

// --- STEUERUNG ---
const tasten = {};
let mouseX = null;
let mouseY = null;
let mouseActive = false;
let mobileDashActive = false;

window.addEventListener("keydown", function(event) {
    tasten[event.key] = true;
    if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) { mouseActive = false; }
    initAudio(); // Audio aufwecken
});
window.addEventListener("keyup", function(event) { tasten[event.key] = false; });

canvas.addEventListener("mousemove", function(event) {
    let rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
    mouseActive = true;
});

function handleTouch(event) {
    event.preventDefault();
    let rect = canvas.getBoundingClientRect();
    let touch = event.touches[0];
    mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = ((touch.clientY - rect.top) * (canvas.height / rect.height)) - 40;
    mouseActive = true;
    initAudio(); // Audio aufwecken auf Mobile
}
canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });

// Mobile Dash Button Logic
const mobDashBtn = document.getElementById("mobileDashBtn");
mobDashBtn.addEventListener("touchstart", (e) => { e.preventDefault(); mobileDashActive = true; initAudio(); });
mobDashBtn.addEventListener("touchend", (e) => { e.preventDefault(); mobileDashActive = false; });
mobDashBtn.addEventListener("mousedown", () => { mobileDashActive = true; initAudio(); });
mobDashBtn.addEventListener("mouseup", () => { mobileDashActive = false; });


// --- RESET & TOR LOGIK ---
function resetPositionen() {
    ball.x = BREITE / 2; ball.y = HOEHE / 2; ball.dx = 0; ball.dy = 0;
    spieler1.x = 100; spieler1.y = HOEHE / 2; spieler1.stamina = 100;
    spieler2.x = BREITE - 100; spieler2.y = HOEHE / 2; spieler2.stamina = 100;
    mouseActive = false;
    aiBallHistory = [];
    visualBallTrail = [];
}

function torGefallen(team) {
    if (team === "rot") {
        toreRot++; scoreRedEl.innerText = toreRot;
        createExplosion(BREITE - 10, HOEHE/2, spieler1.farbe); // Konfetti im Tor!
    } else {
        toreBlau++; scoreBlueEl.innerText = toreBlau;
        createExplosion(10, HOEHE/2, spieler2.farbe);
    }
    
    playSound('goal');
    screenShake = 15; // Wuchtiger Screen-Shake
    torTextBis = Date.now() + 2000;
    resetPositionen();
}

document.getElementById("btnStart").addEventListener("click", function() {
    initAudio();
    playSound('whistle');
    toreRot = 0; toreBlau = 0;
    scoreRedEl.innerText = "0"; scoreBlueEl.innerText = "0";
    spielZeit = 120; timerEl.innerText = "2:00";
    spielEndeText = "";
    resetPositionen(); setzeSpielModus();
    aiLastX = spieler2.x; aiLastY = spieler2.y; aiStuckFrames = 0;
    letzterFrame = Date.now();
    spielLaeuft = true;
});

// --- TABELLEN LOGIK ---
function spielBeenden() {
    playSound('whistle');
    let teamLinks = teamLeftSelect.value;
    let teamRechts = teamRightSelect.value;

    if (toreRot > toreBlau) {
        spielEndeText = teamLinks + " gewinnt!";
        speichereErgebnis(teamLinks, "sieg"); speichereErgebnis(teamRechts, "niederlage");
    } else if (toreBlau > toreRot) {
        spielEndeText = teamRechts + " gewinnt!";
        speichereErgebnis(teamRechts, "sieg"); speichereErgebnis(teamLinks, "niederlage");
    } else {
        spielEndeText = "Unentschieden!";
        speichereErgebnis(teamLinks, "unentschieden"); speichereErgebnis(teamRechts, "unentschieden");
    }
    aktualisiereTabelle();
}

function speichereErgebnis(teamName, ergebnisTyp) {
    let tabelle = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    if (!tabelle[teamName]) tabelle[teamName] = { siege: 0, unentschieden: 0, niederlagen: 0 };
    if (ergebnisTyp === "sieg") tabelle[teamName].siege++;
    if (ergebnisTyp === "unentschieden") tabelle[teamName].unentschieden++;
    if (ergebnisTyp === "niederlage") tabelle[teamName].niederlagen++;
    localStorage.setItem('fifaTabelle', JSON.stringify(tabelle));
}

function aktualisiereTabelle() {
    let tabelle = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    let body = document.getElementById("leaderboardBody");
    body.innerHTML = "";

    let teamsArray = [];
    for (let team in tabelle) {
        let punkte = (tabelle[team].siege * 3) + tabelle[team].unentschieden;
        teamsArray.push({ name: team, stats: tabelle[team], punkte: punkte });
    }
    teamsArray.sort((a, b) => b.punkte - a.punkte);

    for (let i = 0; i < teamsArray.length; i++) {
        let tr = document.createElement("tr");
        tr.innerHTML = `<td><strong>${i + 1}. ${teamsArray[i].name}</strong> (${teamsArray[i].punkte} Pkt)</td>
                        <td>${teamsArray[i].stats.siege}</td><td>${teamsArray[i].stats.unentschieden}</td><td>${teamsArray[i].stats.niederlagen}</td>`;
        body.appendChild(tr);
    }
}
aktualisiereTabelle();

// --- UPDATE LOOP ---
function update() {
    if (!spielLaeuft) return;

    let jetzt = Date.now();
    let dt = (jetzt - letzterFrame) / 1000;
    letzterFrame = jetzt;

    spielZeit = spielZeit - dt;
    if (spielZeit <= 0) { spielZeit = 0; spielLaeuft = false; spielBeenden(); }
    let minuten = Math.floor(spielZeit / 60);
    let sekunden = Math.floor(spielZeit % 60);
    timerEl.innerText = minuten + ":" + (sekunden < 10 ? "0" : "") + sekunden;
    
    // Ball Trail Update (Für Visuals)
    let ballSpeed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy);
    if (ballSpeed > 5) {
        visualBallTrail.push({x: ball.x, y: ball.y, alpha: 0.5});
    }
    if (visualBallTrail.length > 10) visualBallTrail.shift();
    for (let t of visualBallTrail) t.alpha -= 0.05;

    // AI History
    aiBallHistory.push({ x: ball.x, y: ball.y });
    if (aiBallHistory.length > 6) aiBallHistory.shift();
    let delayedBall = aiBallHistory[0] || ball;

    // AI Logik
    if (currentAiMode !== "human") {
        aiUpdateCounter++;
        if (aiUpdateCounter >= 10) {
            aiUpdateCounter = 0;
            let distMoved = Math.hypot(spieler2.x - aiLastX, spieler2.y - aiLastY);
            if (distMoved < 5) aiStuckFrames += 10; else aiStuckFrames = 0;
            
            aiLastX = spieler2.x; aiLastY = spieler2.y;

            if (aiStuckFrames >= 60) {
                aiTargetX = BREITE / 2; aiTargetY = HOEHE / 2;
                if (aiStuckFrames >= 90) aiStuckFrames = 0;
            } else {
                if (currentAiMode === "ai1") {
                    aiTargetX = BREITE - 100; aiTargetY = (ball.x > BREITE / 2) ? ball.y : HOEHE / 2;
                } else if (currentAiMode === "ai2") {
                    if (ball.x > BREITE / 2) { aiTargetX = ball.x; aiTargetY = ball.y; }
                    else { aiTargetX = (BREITE / 2) + 100; aiTargetY = ball.y; }
                } else if (currentAiMode === "ai3") {
                    aiTargetX = delayedBall.x + 20; aiTargetY = delayedBall.y;
                    // KI nutzt gelegentlich Dash, wenn Ball nah ist!
                    if (Math.hypot(ball.x - spieler2.x, ball.y - spieler2.y) < 100 && spieler2.stamina > 50) {
                        tasten["Shift"] = true; // Simuliere Dash
                    } else {
                        tasten["Shift"] = false;
                    }
                }
                let minWand = spieler2.radius + 15;
                aiTargetX = Math.max(minWand, Math.min(BREITE - minWand, aiTargetX));
                aiTargetY = Math.max(minWand, Math.min(HOEHE - minWand, aiTargetY));
            }
        }
    }

    // --- AUSDAUER & DASH LOGIK ---
    spieler1.isDashing = (tasten[" "] || mobileDashActive) && spieler1.stamina > 0;
    spieler2.isDashing = (tasten["Shift"] || tasten["Enter"]) && spieler2.stamina > 0;

    let s1AktuelleSpeed = spieler1.isDashing ? spieler1.baseSpeed * 2.5 : spieler1.baseSpeed;
    let s2AktuelleSpeed = spieler2.isDashing ? spieler2.baseSpeed * 2.5 : spieler2.baseSpeed;

    // Stamina verbrauchen oder aufladen
    if (spieler1.isDashing) spieler1.stamina -= 2; else if (spieler1.stamina < 100) spieler1.stamina += 0.5;
    if (spieler2.isDashing) spieler2.stamina -= 2; else if (spieler2.stamina < 100) spieler2.stamina += 0.5;

    // Staub-Partikel beim Sprinten
    if (spieler1.isDashing && mouseActive) createDust(spieler1.x, spieler1.y);

    // --- SUB-STEPPING (Physik) ---
    const SUBSTEPS = 4;
    for (let step = 0; step < SUBSTEPS; step++) {
        let speed1 = s1AktuelleSpeed / SUBSTEPS;
        let speed2 = s2AktuelleSpeed / SUBSTEPS;
        let isKickoffPause = Date.now() < torTextBis;

        if (!isKickoffPause) {
            // Spieler 1
            if (mouseActive && mouseX !== null && mouseY !== null) {
                let zielX = Math.max(spieler1.radius, Math.min(BREITE - spieler1.radius, mouseX));
                let zielY = Math.max(spieler1.radius, Math.min(HOEHE - spieler1.radius, mouseY));
                let schritteUebrig = SUBSTEPS - step;
                // Wenn Dash aktiv, darf er schneller zur Maus folgen
                let folgeSpeed = spieler1.isDashing ? 0.3 : 0.1; 
                spieler1.x += (zielX - spieler1.x) * folgeSpeed;
                spieler1.y += (zielY - spieler1.y) * folgeSpeed;
            } else {
                if (tasten["w"]) spieler1.y -= speed1;
                if (tasten["s"]) spieler1.y += speed1;
                if (tasten["a"]) spieler1.x -= speed1;
                if (tasten["d"]) spieler1.x += speed1;
            }
            
            // Spieler 2
            if (currentAiMode === "human") {
                if (tasten["ArrowUp"]) spieler2.y -= speed2;
                if (tasten["ArrowDown"]) spieler2.y += speed2;
                if (tasten["ArrowLeft"]) spieler2.x -= speed2;
                if (tasten["ArrowRight"]) spieler2.x += speed2;
            } else {
                let dx = aiTargetX - spieler2.x;
                let dy = aiTargetY - spieler2.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    spieler2.x += (dx / dist) * Math.min(speed2, dist);
                    spieler2.y += (dy / dist) * Math.min(speed2, dist);
                }
            }
        }

        // Spielfeld-Grenzen Spieler
        spieler1.y = Math.max(spieler1.radius, Math.min(HOEHE - spieler1.radius, spieler1.y));
        spieler1.x = Math.max(spieler1.radius, Math.min(BREITE - spieler1.radius, spieler1.x));
        spieler2.y = Math.max(spieler2.radius, Math.min(HOEHE - spieler2.radius, spieler2.y));
        spieler2.x = Math.max(spieler2.radius, Math.min(BREITE - spieler2.radius, spieler2.x));

        // Spieler vs Spieler Kollision
        let pDx = spieler2.x - spieler1.x; let pDy = spieler2.y - spieler1.y;
        let pDistanz = Math.sqrt(pDx * pDx + pDy * pDy);
        let pMinDistanz = spieler1.radius + spieler2.radius;
        if (pDistanz < pMinDistanz && pDistanz > 0) {
            let pUeberlappung = pMinDistanz - pDistanz;
            spieler1.x -= (pDx / pDistanz) * (pUeberlappung / 2); spieler1.y -= (pDy / pDistanz) * (pUeberlappung / 2);
            spieler2.x += (pDx / pDistanz) * (pUeberlappung / 2); spieler2.y += (pDy / pDistanz) * (pUeberlappung / 2);
        }

        // Ball Physik
        ball.dx *= Math.pow(0.99, 1/SUBSTEPS);
        ball.dy *= Math.pow(0.99, 1/SUBSTEPS);

        let maxBallSpeed = (spieler1.radius * 2) + 10; // Erhöht für wuchtigere Schüsse
        let currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (currentSpeed > maxBallSpeed) {
            ball.dx = (ball.dx / currentSpeed) * maxBallSpeed;
            ball.dy = (ball.dy / currentSpeed) * maxBallSpeed;
        }

        ball.x += ball.dx / SUBSTEPS;
        ball.y += ball.dy / SUBSTEPS;

        // Spieler vs Ball Kollision (Der Kick!)
        let alleSpieler = [spieler1, spieler2];
        for (let i = 0; i < alleSpieler.length; i++) {
            let sp = alleSpieler[i];
            let abstandX = ball.x - sp.x; let abstandY = ball.y - sp.y;
            let distanz = Math.sqrt(abstandX * abstandX + abstandY * abstandY);
            let minAbstand = ball.radius + sp.radius;
            
            if (distanz < minAbstand && distanz > 0) {
                let richtungX = abstandX / distanz;
                let richtungY = abstandY / distanz;
                
                let ueberlappung = minAbstand - distanz;
                ball.x += richtungX * ueberlappung;
                ball.y += richtungY * ueberlappung;
                
                // Dash = Härterer Schuss!
                let pushKraft = sp.isDashing ? 40 : 15; 
                ball.dx += richtungX * (pushKraft / SUBSTEPS);
                ball.dy += richtungY * (pushKraft / SUBSTEPS);

                // Audio bei hartem Kick
                if (pushKraft === 40 && step === 0) playSound('kick');
            }
        }

        // Wand-Kollision & Tore
        let torOben = (HOEHE / 2) - 60; let torUnten = (HOEHE / 2) + 60;

        if (ball.x - ball.radius < 0) { 
            if (ball.y > torOben && ball.y < torUnten) { torGefallen("blau"); return; } 
            else { 
                ball.x = ball.radius; ball.dx = Math.abs(ball.dx); 
                if(Math.abs(ball.dx) > 5) playSound('kick'); // Wand-Sound
            }
        }
        if (ball.x + ball.radius > BREITE) { 
            if (ball.y > torOben && ball.y < torUnten) { torGefallen("rot"); return; } 
            else { 
                ball.x = BREITE - ball.radius; ball.dx = -Math.abs(ball.dx);
                if(Math.abs(ball.dx) > 5) playSound('kick');
            }
        }
        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy = Math.abs(ball.dy); }
        if (ball.y + ball.radius > HOEHE) { ball.y = HOEHE - ball.radius; ball.dy = -Math.abs(ball.dy); }
    }

    // Partikel-Update
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// --- DRAW LOOP ---
function zeichneAlles() {
    ctx.save(); // Zustand vor dem Wackeln speichern

    // Screen Shake anwenden
    if (screenShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.9; // Shake flacht ab
    }

    // Rasen
    ctx.fillStyle = "#2e8b57";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    for (let i = 0; i < BREITE; i += 100) ctx.fillRect(i, 0, 50, HOEHE);

    // Linien
    ctx.strokeStyle = "white"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(BREITE / 2, 0); ctx.lineTo(BREITE / 2, HOEHE); ctx.stroke();
    ctx.beginPath(); ctx.arc(BREITE / 2, HOEHE / 2, 60, 0, Math.PI * 2); ctx.stroke();

    // Tore
    ctx.fillStyle = "white";
    ctx.fillRect(0, HOEHE / 2 - 60, 10, 120); 
    ctx.fillRect(BREITE - 10, HOEHE / 2 - 60, 10, 120);

    // Ball-Trail
    for (let t of visualBallTrail) {
        if(t.alpha > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha})`;
            ctx.beginPath(); ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI*2); ctx.fill();
        }
    }

    // Schatten
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath(); ctx.arc(ball.x + 4, ball.y + 4, ball.radius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(spieler1.x + 4, spieler1.y + 4, spieler1.radius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(spieler2.x + 4, spieler2.y + 4, spieler2.radius, 0, Math.PI * 2); ctx.fill();

    // Partikel zeichnen
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Ball
    ctx.fillStyle = ball.farbe;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill();

    // Spieler 1
    ctx.fillStyle = spieler1.farbe;
    ctx.beginPath(); ctx.arc(spieler1.x, spieler1.y, spieler1.radius, 0, Math.PI * 2); ctx.fill();
    // Ausdauerbalken Rot
    ctx.fillStyle = "black"; ctx.fillRect(spieler1.x - 16, spieler1.y - 30, 32, 6);
    ctx.fillStyle = spieler1.stamina > 20 ? "#00ff00" : "red";
    ctx.fillRect(spieler1.x - 15, spieler1.y - 29, 30 * (Math.max(0, spieler1.stamina)/100), 4);

    // Spieler 2
    ctx.fillStyle = spieler2.farbe;
    ctx.beginPath(); ctx.arc(spieler2.x, spieler2.y, spieler2.radius, 0, Math.PI * 2); ctx.fill();
    // Ausdauerbalken Blau
    ctx.fillStyle = "black"; ctx.fillRect(spieler2.x - 16, spieler2.y - 30, 32, 6);
    ctx.fillStyle = spieler2.stamina > 20 ? "#00ff00" : "red";
    ctx.fillRect(spieler2.x - 15, spieler2.y - 29, 30 * (Math.max(0, spieler2.stamina)/100), 4);

    ctx.restore(); // Wackeln beenden (damit UI nicht wackelt)

    // Tor-Nachricht
    if (Date.now() < torTextBis) {
        ctx.fillStyle = "gold"; ctx.font = "bold 80px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("TOOOOR!", BREITE / 2, HOEHE / 2);
        ctx.strokeStyle = "black"; ctx.lineWidth = 4;
        ctx.strokeText("TOOOOR!", BREITE / 2, HOEHE / 2);
    }

    // Game Over UI
    if (!spielLaeuft) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, BREITE, HOEHE);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (spielEndeText !== "") {
            ctx.fillStyle = "white"; ctx.font = "bold 60px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("SPIELENDE", BREITE / 2, HOEHE / 2 - 40);
            ctx.fillStyle = "gold"; ctx.font = "bold 40px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(spielEndeText, BREITE / 2, HOEHE / 2 + 30);
        } else {
            ctx.fillStyle = "white"; ctx.font = "bold 50px 'Segoe UI', Arial, sans-serif";
            ctx.fillText("Klicke auf 'Spiel starten'", BREITE / 2, HOEHE / 2);
        }
    }
}

function gameLoop() {
    update();
    zeichneAlles();
    requestAnimationFrame(gameLoop);
}
gameLoop();