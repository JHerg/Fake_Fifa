const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BREITE = canvas.width;
const HOEHE = canvas.height;

function passeCanvasAn() {
    let fensterBreite = window.innerWidth;
    let fensterHoehe = window.innerHeight;
    let verfuegbareHoehe = fensterHoehe - 220; 
    let seitenVerhaeltnis = BREITE / HOEHE; 
    let neueBreite = fensterBreite * 0.95; 
    let neueHoehe = neueBreite / seitenVerhaeltnis;
    if (neueHoehe > verfuegbareHoehe) { neueHoehe = verfuegbareHoehe; neueBreite = neueHoehe * seitenVerhaeltnis; }
    canvas.style.width = neueBreite + "px";
    canvas.style.height = neueHoehe + "px";
}
window.addEventListener("resize", passeCanvasAn);
passeCanvasAn();

// --- STATE & SETTINGS ---
const gameSettings = { replay: true, weather: "sun", time: "day", tournament: false };

document.getElementById("btnSettings").addEventListener("click", () => {
    document.getElementById("settings-panel").classList.remove("hidden");
});
document.getElementById("btnCloseSettings").addEventListener("click", () => {
    gameSettings.replay = document.getElementById("checkReplay").checked;
    gameSettings.weather = document.getElementById("selectWeather").value;
    gameSettings.time = document.getElementById("selectTime").value;
    gameSettings.tournament = document.getElementById("checkTournament").checked;
    document.getElementById("settings-panel").classList.add("hidden");
    initWeather();
});

// --- AUDIO ---
let audioCtx = null;
let soundEnabled = true;
document.getElementById("btnSound").addEventListener("click", function() {
    soundEnabled = !soundEnabled;
    this.innerText = soundEnabled ? "🔊" : "🔇";
    initAudio();
});
function initAudio() { if (!audioCtx && soundEnabled) { window.AudioContext = window.AudioContext || window.webkitAudioContext; audioCtx = new window.AudioContext(); } }
function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    let now = audioCtx.currentTime;
    if (type === 'kick') { osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1); gainNode.gain.setValueAtTime(0.5, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'whistle') { osc.type = 'square'; osc.frequency.setValueAtTime(2000, now); osc.frequency.setValueAtTime(2200, now + 0.1); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
    else if (type === 'goal') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.5); gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.5, now + 0.2); gainNode.gain.linearRampToValueAtTime(0, now + 1.5); osc.start(now); osc.stop(now + 1.5); }
}

// --- VISUALS ---
let particles = []; let screenShake = 0; let visualBallTrail = [];
function createExplosion(x, y, farbe) { for (let i = 0; i < 30; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1.0, color: farbe, size: Math.random() * 5 + 2 }); }
function createDust(x, y) { if (Math.random() > 0.5) particles.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: 0, vy: -1, life: 0.5, color: "rgba(255,255,255,0.4)", size: 3 }); }

// --- SPIELFIGUREN ---
let ball = { x: BREITE / 2, y: HOEHE / 2, radius: 10, farbe: "white", dx: 0, dy: 0 };
let spieler1 = { x: 100, y: HOEHE / 2, radius: 25, farbe: "#ff4d4d", baseSpeed: 5, stamina: 100, isDashing: false, img: new Image() };
let spieler2 = { x: BREITE - 100, y: HOEHE / 2, radius: 25, farbe: "#4da6ff", baseSpeed: 5, stamina: 100, isDashing: false, img: new Image() };
spieler1.img.crossOrigin = "anonymous"; spieler2.img.crossOrigin = "anonymous";

const teamFarben = { "Bayer Leverkusen": "#e32221", "FC Bayern": "#dc052d", "VfB Stuttgart": "#e32228", "Borussia Dortmund": "#fde100", "RB Leipzig": "#dd013f", "Eintracht Frankfurt": "#000000", "TSG Hoffenheim": "#0066b2", "1. FC Heidenheim": "#e2001a", "Werder Bremen": "#1d9053", "SC Freiburg": "#c0001f", "FC Augsburg": "#ba3733", "VfL Wolfsburg": "#65b32e", "Mainz 05": "#ed1c24", "Gladbach": "#1f1f1f", "Union Berlin": "#d4011d", "FC St. Pauli": "#533527", "Hamburger SV": "#005ca9", "1. FC Köln": "#ed1c24" };
const teamKader = { "Bayer Leverkusen": ["Florian Wirtz", "Granit Xhaka", "Jeremie Frimpong"], "FC Bayern": ["Harry Kane", "Jamal Musiala", "Leroy Sané"], "VfB Stuttgart": ["Alexander Nübel", "Angelo Stiller", "Enzo Millot"], "Borussia Dortmund": ["Julian Brandt", "Nico Schlotterbeck", "Serhou Guirassy"], "RB Leipzig": ["Xavi Simons", "Lois Openda", "Benjamin Sesko"], "Eintracht Frankfurt": ["Omar Marmoush", "Hugo Ekitiké", "Mario Götze"], "TSG Hoffenheim": ["Andrej Kramaric", "Oliver Baumann", "Anton Stach"], "1. FC Heidenheim": ["Paul Wanner", "Marvin Pieringer", "Kevin Müller"], "Werder Bremen": ["Mitchell Weiser", "Romano Schmid", "Marvin Ducksch"], "SC Freiburg": ["Vincenzo Grifo", "Ritsu Doan", "Christian Günter"], "FC Augsburg": ["Phillip Tietz", "Finn Dahmen", "Arne Maier"], "VfL Wolfsburg": ["Maximilian Arnold", "Jonas Wind", "Lovro Majer"], "Mainz 05": ["Jonathan Burkardt", "Nadiem Amiri", "Robin Zentner"], "Gladbach": ["Tim Kleindienst", "Alassane Plea", "Franck Honorat"], "Union Berlin": ["Kevin Volland", "Christopher Trimmel", "Frederik Rönnow"], "FC St. Pauli": ["Jackson Irvine", "Johannes Eggestein", "Nikola Vasilj"], "Hamburger SV": ["Robert Glatzel", "Ludovit Reis", "Jonas Meffert"], "1. FC Köln": ["Florian Kainz", "Eric Martel", "Timo Hübers"] };

const teamLeftSelect = document.getElementById("teamLeft"), teamRightSelect = document.getElementById("teamRight"), playerLeftSelect = document.getElementById("playerLeft"), playerRightSelect = document.getElementById("playerRight"), aiSelect = document.getElementById("aiSelect");

function updatePlayerDropdowns() {
    let kl = teamKader[teamLeftSelect.value], kr = teamKader[teamRightSelect.value];
    playerLeftSelect.innerHTML = ""; kl.forEach(p => playerLeftSelect.innerHTML += `<option value="${p}">${p}</option>`);
    playerRightSelect.innerHTML = ""; kr.forEach(p => playerRightSelect.innerHTML += `<option value="${p}">${p}</option>`);
}
function updateTeamUndBilder() {
    spieler1.farbe = teamFarben[teamLeftSelect.value]; spieler2.farbe = teamFarben[teamRightSelect.value];
    document.getElementById("scoreRed").style.backgroundColor = spieler1.farbe; document.getElementById("scoreBlue").style.backgroundColor = spieler2.farbe;
    spieler1.img.src = `https://api.dicebear.com/8.x/notionists/png?seed=${playerLeftSelect.value}&backgroundColor=transparent`;
    spieler2.img.src = `https://api.dicebear.com/8.x/notionists/png?seed=${playerRightSelect.value}&backgroundColor=transparent`;
}
teamLeftSelect.addEventListener("change", () => { updatePlayerDropdowns(); updateTeamUndBilder(); });
teamRightSelect.addEventListener("change", () => { updatePlayerDropdowns(); updateTeamUndBilder(); });
playerLeftSelect.addEventListener("change", updateTeamUndBilder); playerRightSelect.addEventListener("change", updateTeamUndBilder);
updatePlayerDropdowns(); updateTeamUndBilder();

// --- CONTROLS ---
const tasten = {}; let mouseX = null, mouseY = null, mouseActive = false;
window.addEventListener("keydown", e => { tasten[e.key] = true; if (["w","a","s","d","W","A","S","D"].includes(e.key)) mouseActive = false; initAudio(); });
window.addEventListener("keyup", e => tasten[e.key] = false);
canvas.addEventListener("mousemove", e => { let r = canvas.getBoundingClientRect(); mouseX = (e.clientX - r.left) * (BREITE/r.width); mouseY = (e.clientY - r.top) * (HOEHE/r.height); mouseActive = true; });
canvas.addEventListener("touchstart", e => { e.preventDefault(); let r = canvas.getBoundingClientRect(); let t = e.touches[0]; mouseX = (t.clientX - r.left) * (BREITE/r.width); mouseY = (t.clientY - r.top) * (HOEHE/r.height) - 40; mouseActive = true; initAudio(); }, {passive: false});
canvas.addEventListener("touchmove", e => { e.preventDefault(); let r = canvas.getBoundingClientRect(); let t = e.touches[0]; mouseX = (t.clientX - r.left) * (BREITE/r.width); mouseY = (t.clientY - r.top) * (HOEHE/r.height) - 40; }, {passive: false});

// --- GAMEPAD ---
let p1Gp = { x: 0, y: 0, d: false }, p2Gp = { x: 0, y: 0, d: false };
function updateGps() {
    p1Gp = {x:0, y:0, d:false}; p2Gp = {x:0, y:0, d:false};
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let v = []; for(let i=0; i<gps.length; i++) if(gps[i] && gps[i].connected) v.push(gps[i]);
    if(v[0]) { p1Gp.x = Math.abs(v[0].axes[0]) > 0.2 ? v[0].axes[0] : 0; p1Gp.y = Math.abs(v[0].axes[1]) > 0.2 ? v[0].axes[1] : 0; p1Gp.d = v[0].buttons[0].pressed || v[0].buttons[7].pressed; }
    if(v[1]) { if(aiSelect.value !== "human") { aiSelect.value = "human"; setzeSpielModus(); } p2Gp.x = Math.abs(v[1].axes[0]) > 0.2 ? v[1].axes[0] : 0; p2Gp.y = Math.abs(v[1].axes[1]) > 0.2 ? v[1].axes[1] : 0; p2Gp.d = v[1].buttons[0].pressed || v[1].buttons[7].pressed; }
}

// --- LOGIC ---
let toreRot = 0, toreBlau = 0, spielLaeuft = false, spielZeit = 120, letzterFrame = Date.now(), spielEndeText = "", torTextBis = 0;
let weatherType = "sun", groundPatches = [], isReplay = false, replayFrame = 0, replayBuffer = [], tournamentMatches = [], currentMatchIndex = 0;
let aiTargetX = BREITE-100, aiTargetY = HOEHE/2, aiUpdateCounter = 0, aiLastX = BREITE-100, aiLastY = HOEHE/2, aiStuckFrames = 0, aiBallHistory = [];
let currentAiMode = "human";
function setzeSpielModus() { currentAiMode = aiSelect.value; if(currentAiMode === "ai1") spieler2.baseSpeed = 3; else if(currentAiMode === "ai2") spieler2.baseSpeed = 5; else if(currentAiMode === "ai3") spieler2.baseSpeed = 7; else spieler2.baseSpeed = 5; }
aiSelect.addEventListener("change", setzeSpielModus); setzeSpielModus();

function initWeather() {
    groundPatches = []; weatherType = gameSettings.weather;
    if(weatherType === "rain") for(let i=0; i<4; i++) groundPatches.push({x:Math.random()*BREITE, y:Math.random()*HOEHE, r:40+Math.random()*50, type:"mud"});
    else if(weatherType === "snow") for(let i=0; i<6; i++) groundPatches.push({x:Math.random()*BREITE, y:Math.random()*HOEHE, r:30+Math.random()*40, type:"snowpile"});
}

function initTournament() {
    let g = Object.keys(teamFarben).filter(t => t !== teamLeftSelect.value); g.sort(() => 0.5 - Math.random());
    tournamentMatches = [{t1: teamLeftSelect.value, t2: g[0], stage:"Viertelfinale"}, {t1:"Sieger VF", t2:g[1], stage:"Halbfinale"}, {t1:"Sieger HF", t2:g[2], stage:"Finale"}];
    currentMatchIndex = 0; zeigeTurnierBaum();
}
function zeigeTurnierBaum() {
    let c = document.getElementById("bracket-container"); c.innerHTML = "";
    tournamentMatches.forEach((m, i) => { let d = document.createElement("div"); d.className = "bracket-match" + (i === currentMatchIndex ? " match-active" : ""); d.innerHTML = `<small>${m.stage}</small><br><strong>${m.t1}</strong><br>vs<br><strong>${m.t2}</strong>`; c.appendChild(d); });
    document.getElementById("tournament-overlay").classList.remove("hidden");
}
document.getElementById("btnNextMatch").addEventListener("click", () => { document.getElementById("tournament-overlay").classList.add("hidden"); let m = tournamentMatches[currentMatchIndex]; teamLeftSelect.value = m.t1; teamRightSelect.value = m.t2; updatePlayerDropdowns(); updateTeamUndBilder(); startMatch(); });
function resetPositionen() { ball.x = BREITE/2; ball.y = HOEHE/2; ball.dx = 0; ball.dy = 0; spieler1.x = 100; spieler1.y = HOEHE/2; spieler1.stamina = 100; spieler2.x = BREITE-100; spieler2.y = HOEHE/2; spieler2.stamina = 100; mouseActive = false; aiBallHistory = []; visualBallTrail = []; replayBuffer = []; }
function torGefallen(team) {
    if(team === "rot") { toreRot++; document.getElementById("scoreRed").innerText = toreRot; createExplosion(BREITE-10, HOEHE/2, spieler1.farbe); } 
    else { toreBlau++; document.getElementById("scoreBlue").innerText = toreBlau; createExplosion(10, HOEHE/2, spieler2.farbe); }
    playSound('goal'); screenShake = 15; if(gameSettings.replay && replayBuffer.length > 30) { isReplay = true; replayFrame = 0; torTextBis = Date.now()+5000; } else { torTextBis = Date.now()+2000; resetPositionen(); }
}
document.getElementById("btnStart").addEventListener("click", () => { initAudio(); if(gameSettings.tournament) initTournament(); else startMatch(); });
function startMatch() { playSound('whistle'); toreRot = 0; toreBlau = 0; document.getElementById("scoreRed").innerText = "0"; document.getElementById("scoreBlue").innerText = "0"; spielZeit = 120; document.getElementById("timerDisplay").innerText = "2:00"; spielEndeText = ""; isReplay = false; initWeather(); resetPositionen(); setzeSpielModus(); aiLastX = spieler2.x; aiLastY = spieler2.y; aiStuckFrames = 0; letzterFrame = Date.now(); spielLaeuft = true; }

function spielBeenden() {
    playSound('whistle'); let tl = teamLeftSelect.value, tr = teamRightSelect.value, win = toreRot > toreBlau;
    if(toreRot === toreBlau) win = Math.random() > 0.5;
    spielEndeText = win ? tl + " gewinnt!" : tr + " gewinnt!";
    aktualisiereTabelle();
    if(gameSettings.tournament) { if(win) { currentMatchIndex++; if(currentMatchIndex < 3) { tournamentMatches[currentMatchIndex].t1 = tl; setTimeout(zeigeTurnierBaum, 3000); } else alert("TURNIERSIEG!"); } else alert("AUSGESCHIEDEN!"); }
}

function aktualisiereTabelle() {
    let t = JSON.parse(localStorage.getItem('fifaTabelle')) || {};
    let b = document.getElementById("leaderboardBody"); b.innerHTML = "";
    let arr = []; for(let n in t) arr.push({name:n, stats:t[n], pts:(t[n].siege*3)+t[n].unentschieden});
    arr.sort((x,y)=>y.pts-x.pts);
    arr.forEach((m,i)=>{ let r=document.createElement("tr"); r.innerHTML=`<td><strong>${i+1}. ${m.name}</strong> (${m.pts} Pkt)</td><td>${m.stats.siege}</td><td>${m.stats.unentschieden}</td><td>${m.stats.niederlagen}</td>`; b.appendChild(r); });
}
aktualisiereTabelle();

// --- UPDATE ---
function update() {
    if(!spielLaeuft) return;
    let j = Date.now(), dt = (j - letzterFrame)/1000; letzterFrame = j;
    updateGps();
    if(isReplay) { replayFrame += 0.5; if(replayFrame >= replayBuffer.length) { isReplay = false; resetPositionen(); } else { let s = replayBuffer[Math.floor(replayFrame)]; ball.x = s.bx; ball.y = s.by; spieler1.x = s.p1x; spieler1.y = s.p1y; spieler2.x = s.p2x; spieler2.y = s.p2y; } return; }
    spielZeit -= dt; if(spielZeit <= 0) { spielZeit = 0; spielLaeuft = false; spielBeenden(); }
    document.getElementById("timerDisplay").innerText = Math.floor(spielZeit/60) + ":" + (Math.floor(spielZeit%60)<10 ? "0":"") + Math.floor(spielZeit%60);
    replayBuffer.push({bx:ball.x, by:ball.y, p1x:spieler1.x, p1y:spieler1.y, p2x:spieler2.x, p2y:spieler2.y}); if(replayBuffer.length > 180) replayBuffer.shift();

    if(currentAiMode !== "human") {
        aiUpdateCounter++; if(aiUpdateCounter >= 10) { aiUpdateCounter = 0; aiBallHistory.push({x:ball.x, y:ball.y}); if(aiBallHistory.length > 6) aiBallHistory.shift(); let db = aiBallHistory[0]||ball; if(Math.hypot(spieler2.x-aiLastX, spieler2.y-aiLastY)<5) aiStuckFrames+=10; else aiStuckFrames=0; aiLastX=spieler2.x; aiLastY=spieler2.y; if(aiStuckFrames>=60) { aiTargetX = BREITE/2; aiTargetY = HOEHE/2; if(aiStuckFrames>=90) aiStuckFrames=0; } else { if(currentAiMode === "ai1") { aiTargetX = BREITE - 100; aiTargetY = ball.x > BREITE/2 ? ball.y : HOEHE/2; } else if(currentAiMode === "ai2") { aiTargetX = ball.x > BREITE/2 ? ball.x : BREITE/2 + 100; aiTargetY = ball.y; } else { aiTargetX = db.x + 20; aiTargetY = db.y; } aiTargetX = Math.max(40, Math.min(BREITE-40, aiTargetX)); aiTargetY = Math.max(40, Math.min(HOEHE-40, aiTargetY)); } }
    }

    spieler1.isDashing = (tasten[" "] || p1Gp.d) && spieler1.stamina > 0;
    spieler2.isDashing = (tasten["Shift"] || tasten["Enter"] || p2Gp.d) && spieler2.stamina > 0;
    let s1Mod = 1, s2Mod = 1;
    for(let p of groundPatches) { if(Math.hypot(spieler1.x-p.x, spieler1.y-p.y)<p.r) s1Mod = p.type==="mud"?0.5:0.3; if(Math.hypot(spieler2.x-p.x, spieler2.y-p.y)<p.r) s2Mod = p.type==="mud"?0.5:0.3; }
    let s1Spd = (spieler1.isDashing ? 12.5 : 5) * s1Mod, s2Spd = (spieler2.isDashing ? 12.5 : 5) * s2Mod;
    if(spieler1.isDashing) spieler1.stamina-=2; else if(spieler1.stamina<100) spieler1.stamina+=0.5;
    if(spieler2.isDashing) spieler2.stamina-=2; else if(spieler2.stamina<100) spieler2.stamina+=0.5;

    const SS = 4;
    for(let s=0; s<SS; s++) {
        if(Date.now() > torTextBis) {
            let dx1=0, dy1=0; if(tasten["w"])dy1--; if(tasten["s"])dy1++; if(tasten["a"])dx1--; if(tasten["d"])dx1++;
            if(p1Gp.x||p1Gp.y) { dx1=p1Gp.x; dy1=p1Gp.y; } else if(dx1||dy1) { let l=Math.hypot(dx1,dy1); dx1/=l; dy1/=l; }
            if(mouseActive && dx1===0 && dy1===0) { spieler1.x += (mouseX-spieler1.x)*(spieler1.isDashing?0.3:0.1); spieler1.y += (mouseY-spieler1.y)*(spieler1.isDashing?0.3:0.1); }
            else { spieler1.x += dx1*(s1Spd/SS); spieler1.y += dy1*(s1Spd/SS); }

            if(currentAiMode === "human") {
                let dx2=0, dy2=0; if(tasten["ArrowUp"])dy2--; if(tasten["ArrowDown"])dy2++; if(tasten["ArrowLeft"])dx2--; if(tasten["ArrowRight"])dx2++;
                if(p2Gp.x||p2Gp.y) { dx2=p2Gp.x; dy2=p2Gp.y; } else if(dx2||dy2) { let l=Math.hypot(dx2,dy2); dx2/=l; dy2/=l; }
                spieler2.x += dx2*(s2Spd/SS); spieler2.y += dy2*(s2Spd/SS);
            } else { let dx=aiTargetX-spieler2.x, dy=aiTargetY-spieler2.y, d=Math.hypot(dx,dy); if(d>0) { spieler2.x+=dx/d*Math.min(s2Spd/SS, d); spieler2.y+=dy/d*Math.min(s2Spd/SS, d); } }
        }
        spieler1.x=Math.max(25,Math.min(BREITE-25,spieler1.x)); spieler1.y=Math.max(25,Math.min(HOEHE-25,spieler1.y));
        spieler2.x=Math.max(25,Math.min(BREITE-25,spieler2.x)); spieler2.y=Math.max(25,Math.min(HOEHE-25,spieler2.y));
        let pdx=spieler2.x-spieler1.x, pdy=spieler2.y-spieler1.y, pd=Math.hypot(pdx,pdy); if(pd<50 && pd>0) { spieler1.x-=pdx/pd*(50-pd)/2; spieler1.y-=pdy/pd*(50-pd)/2; spieler2.x+=pdx/pd*(50-pd)/2; spieler2.y+=pdy/pd*(50-pd)/2; }
        let f = weatherType==="rain"?0.998 : weatherType==="snow"?0.97:0.99;
        ball.dx*=Math.pow(f,1/SS); ball.dy*=Math.pow(f,1/SS);
        ball.x+=ball.dx/SS; ball.y+=ball.dy/SS;
        [spieler1, spieler2].forEach(p => {
            let adx=ball.x-p.x, ady=ball.y-p.y, ad=Math.hypot(adx,ady);
            if(ad<35 && ad>0) { ball.x=p.x+adx/ad*35; ball.y=p.y+ady/ad*35; let pk=p.isDashing?40:15; ball.dx+=adx/ad*pk/SS; ball.dy+=ady/ad*pk/SS; if(pk===40 && s===0 && !isReplay) playSound('kick'); }
        });
        if(ball.y<10){ball.y=10;ball.dy=Math.abs(ball.dy);} if(ball.y>HOEHE-10){ball.y=HOEHE-10;ball.dy=-Math.abs(ball.dy);}
        if(ball.x<10){ if(ball.y>240 && ball.y<360) {torGefallen("blau"); return;} else {ball.x=10;ball.dx=Math.abs(ball.dx);} }
        if(ball.x>BREITE-10){ if(ball.y>240 && ball.y<360) {torGefallen("rot"); return;} else {ball.x=BREITE-10;ball.dx=-Math.abs(ball.dx);} }
    }
    for(let i=particles.length-1; i>=0; i--) { particles[i].x+=particles[i].vx; particles[i].y+=particles[i].vy; particles[i].life-=0.02; if(particles[i].life<=0) particles.splice(i,1); }
}

// --- ZEICHNEN ---
function zeichneAlles() {
    ctx.save();
    if(screenShake>0.5 && !isReplay) { ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake); screenShake*=0.9; }

    // 1. BASIS RASEN
    ctx.fillStyle = weatherType==="rain"?"#246b43":weatherType==="snow"?"#d1e8e2":"#2e8b57";
    ctx.fillRect(0,0,BREITE,HOEHE);

    // 2. STADION STRUKTUR (Streifen & Bodenpatches)
    if(weatherType!=="snow") { ctx.fillStyle="rgba(0,0,0,0.1)"; for(let i=0; i<BREITE; i+=100) ctx.fillRect(i,0,50,HOEHE); }
    groundPatches.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.type==="mud"?"rgba(60,40,20,0.6)":"rgba(255,255,255,0.8)"; ctx.fill(); });

    // 3. LINIEN & TORE
    ctx.strokeStyle="white"; ctx.lineWidth=4;
    ctx.strokeRect(2,2,BREITE-4,HOEHE-4);
    ctx.beginPath(); ctx.moveTo(BREITE/2,0); ctx.lineTo(BREITE/2,HOEHE); ctx.stroke();
    ctx.beginPath(); ctx.arc(BREITE/2,HOEHE/2,60,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="white"; ctx.fillRect(0,240,10,120); ctx.fillRect(BREITE-10,240,10,120);

    // 4. DYNAMISCHE SCHATTEN (Abhängig von Ecken-Lichtern)
    const isNight = gameSettings.time === "night";
    const lights = [{x:0,y:0},{x:BREITE,y:0},{x:0,y:HOEHE},{x:BREITE,y:HOEHE}];
    
    const drawShadow = (obj) => {
        if(isNight) {
            lights.forEach(l => {
                let dx=obj.x-l.x, dy=obj.y-l.y, dist=Math.hypot(dx,dy), ang=Math.atan2(dy,dx);
                let shadowLen = Math.min(dist * 0.12, 60);
                ctx.save(); ctx.translate(obj.x, obj.y); ctx.rotate(ang);
                ctx.fillStyle="rgba(0,0,0,0.3)";
                ctx.beginPath(); ctx.ellipse(shadowLen/2 + obj.radius*0.3, 0, shadowLen, obj.radius*0.6, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });
        } else { ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.arc(obj.x+4, obj.y+4, obj.radius, 0, Math.PI*2); ctx.fill(); }
    };
    [ball, spieler1, spieler2].forEach(drawShadow);

    // 5. OBJEKTE (Ball, Partikel, Spieler)
    particles.forEach(p => { ctx.globalAlpha=p.life; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1.0;
    ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius,0,Math.PI*2); ctx.fill();

    [spieler1, spieler2].forEach(p => {
        ctx.save(); ctx.fillStyle=p.farbe; ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.clip();
        if(p.img.complete) ctx.drawImage(p.img, p.x-p.radius, p.y-p.radius, p.radius*2, p.radius*2); ctx.restore();
        ctx.strokeStyle="white"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle="black"; ctx.fillRect(p.x-16,p.y-35,32,6); ctx.fillStyle=p.stamina>20?"#00ff00":"red"; ctx.fillRect(p.x-15,p.y-34,30*(p.stamina/100),4);
    });

    // 6. WETTER (Schnee/Regen)
    if(weatherType==="rain") { ctx.strokeStyle="rgba(200,200,255,0.2)"; for(let i=0; i<30; i++) { let rx=Math.random()*BREITE, ry=Math.random()*HOEHE; ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-5,ry+15); ctx.stroke(); } }
    else if(weatherType==="snow") { ctx.fillStyle="white"; for(let i=0; i<40; i++) { ctx.beginPath(); ctx.arc(Math.random()*BREITE, Math.random()*HOEHE, 2, 0, Math.PI*2); ctx.fill(); } }

    // 7. NACHT-BELEUCHTUNG (Echte Flutlichter in den Ecken)
    if(isNight && !isReplay) {
        // Zuerst eine allgemeine Grund-Abdunkelung (Vignette für die Mitte)
        ctx.fillStyle = "rgba(10, 15, 30, 0.4)"; 
        ctx.fillRect(0,0,BREITE,HOEHE);

        // Die vier Lichthöfe in den Ecken (Radial-Gradients)
        ctx.globalCompositeOperation = "screen"; // Sorgt für echtes "Aufhellen"
        lights.forEach(l => {
            let g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 500);
            g.addColorStop(0, "rgba(255, 255, 230, 0.4)"); // Warmer Lichtkern
            g.addColorStop(1, "rgba(255, 255, 255, 0)");   // Läuft sanft aus
            ctx.fillStyle = g;
            ctx.fillRect(0,0,BREITE,HOEHE);
        });
        ctx.globalCompositeOperation = "source-over"; // Zurück zum Standard
        
        // Finaler Kontrast-Layer (macht die Mitte dunkler)
        let v = ctx.createRadialGradient(BREITE/2, HOEHE/2, 100, BREITE/2, HOEHE/2, 600);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = v;
        ctx.fillRect(0,0,BREITE,HOEHE);
    }
    ctx.restore();

    // 8. TEXT-OVERLAYS
    if(isReplay) { ctx.fillStyle="gold"; ctx.font="bold 40px Arial"; ctx.textAlign="center"; ctx.fillText("🎥 REPLAY", BREITE/2, 50); }
    if(Date.now()<torTextBis && !isReplay) { ctx.fillStyle="gold"; ctx.font="bold 80px Arial"; ctx.textAlign="center"; ctx.fillText("TOOOOR!", BREITE/2, HOEHE/2); ctx.strokeStyle="black"; ctx.lineWidth=4; ctx.strokeText("TOOOOR!", BREITE/2, HOEHE/2); }
    if(!spielLaeuft && !isReplay) { ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(0,0,BREITE,HOEHE); ctx.fillStyle="white"; ctx.font="bold 50px Arial"; ctx.textAlign="center"; ctx.fillText(spielEndeText || "Klicke auf 'Spiel starten'", BREITE/2, HOEHE/2); }
}

function loop() { update(); zeichneAlles(); requestAnimationFrame(loop); }
loop();