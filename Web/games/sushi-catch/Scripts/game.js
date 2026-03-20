import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";

// --- Firebase Configuration ---
const firebaseConfig = { 
    apiKey: "AIzaSyDffNMWkocUzsvZkbX_sOXtk5NHr8-KQME", 
    authDomain: "sushicious-games.firebaseapp.com", 
    projectId: "sushicious-games", 
    storageBucket: "sushicious-games.firebasestorage.app", 
    messagingSenderId: "597158694276", 
    appId: "1:597158694276:web:28d7699f3e4ef4050d61d1", 
    measurementId: "G-H309XJ7ST6" 
}; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Multilingual Support ---
const translations = {
    en: {
        game_title: "Sushi Catch",
        tap_to_start: "Move Plate to Start",
        score: "Score",
        lives: "Lives",
        game_over: "GAME OVER",
        all_time_top: "--- YOUR BEST 3 ---",
        community_top: "--- GLOBAL TOP 3 ---",
        tap_to_retry: "Tap to Retry",
        pts: "pts",
        loading: "Loading..."
    },
    ja: {
        game_title: "寿司キャッチ",
        tap_to_start: "お皿を動かしてスタート",
        score: "スコア",
        lives: "ライフ",
        game_over: "ゲームオーバー",
        all_time_top: "--- あなたのベスト3 ---",
        community_top: "--- 世界ランキング ---",
        tap_to_retry: "タップしてリトライ",
        pts: "点",
        loading: "読み込み中..."
    }
};

let currentLang = localStorage.getItem('sushicious_lang') || (navigator.language.startsWith('ja') ? 'ja' : 'en');
const t = (key) => translations[currentLang][key] || key;

// --- Game Configuration ---
let canvasWidth, canvasHeight;
let score = 0;
let lives = 3;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let globalRanking = [];
let isLoadingRanking = false;

const STORAGE_KEY_ALL_TIME = 'sushicious_catch_all_time_rank';

// --- Sushi & Plate ---
let plate = { x: 0, y: 0, width: 80, height: 20 };
let sushis = [];
const sushiTypes = [
    { name: 'salmon', color: '#ff7f50', textColor: '#fff', label: '🍣' },
    { name: 'tuna', color: '#dc143c', textColor: '#fff', label: '🍣' },
    { name: 'ebi', color: '#ffa07a', textColor: '#fff', label: '🦐' },
    { name: 'egg', color: '#ffd700', textColor: '#000', label: '🍳' }
];

async function fetchGlobalRanking() {
    if (isLoadingRanking) return;
    isLoadingRanking = true;
    try {
        const q = query(collection(db, "rankings_catch"), orderBy("score", "desc"), limit(3));
        const querySnapshot = await getDocs(q);
        globalRanking = querySnapshot.docs.map(doc => doc.data());
    } catch (e) {
        console.error("Error fetching ranking: ", e);
    } finally {
        isLoadingRanking = false;
    }
}

async function saveGlobalScore(score) {
    if (score <= 0) return;
    try {
        await addDoc(collection(db, "rankings_catch"), {
            score: score,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
        });
        fetchGlobalRanking();
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

function getRanking(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveRanking(key, score) {
    let ranking = getRanking(key);
    ranking.push({ score, date: new Date().toLocaleDateString() });
    ranking.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(ranking.slice(0, 3)));
    
    // Explicitly call saveGlobalScore when local ranking is saved
    if (key === STORAGE_KEY_ALL_TIME) {
        saveGlobalScore(score);
    }
}

function resize() {
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;
    
    canvasWidth = viewWidth;
    canvasHeight = viewHeight;
    
    const maxAspectRatio = 9 / 16;
    if (viewWidth / viewHeight > maxAspectRatio) {
        canvasWidth = Math.floor(viewHeight * maxAspectRatio);
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    plate.width = canvasWidth * 0.25;
    plate.height = 20;
    plate.y = canvasHeight - plate.height - 40;
}

function spawnSushi() {
    const type = sushiTypes[Math.floor(Math.random() * sushiTypes.length)];
    const size = canvasWidth * 0.1;
    sushis.push({
        x: Math.random() * (canvasWidth - size),
        y: -size,
        size: size,
        speed: 2 + Math.random() * 2 + (score / 100),
        type: type
    });
}

function update() {
    if (gameState !== 'playing') return;

    if (Math.random() < 0.02) spawnSushi();

    for (let i = sushis.length - 1; i >= 0; i--) {
        const s = sushis[i];
        s.y += s.speed;

        // Check collision with plate
        if (s.y + s.size > plate.y && s.y < plate.y + plate.height &&
            s.x + s.size > plate.x && s.x < plate.x + plate.width) {
            score += 10;
            sushis.splice(i, 1);
            continue;
        }

        // Check miss
        if (s.y > canvasHeight) {
            lives--;
            sushis.splice(i, 1);
            if (lives <= 0) {
                gameState = 'gameOver';
                saveRanking(STORAGE_KEY_ALL_TIME, score);
            }
        }
    }
}

function draw() {
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw plate
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.roundRect(plate.x, plate.y, plate.width, plate.height, 5);
    ctx.fill();

    // Draw sushis
    sushis.forEach(s => {
        ctx.font = `${s.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.type.label, s.x + s.size / 2, s.y + s.size / 2);
    });

    // Draw UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${t('score')}: ${score}`, 20, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`${t('lives')}: ${'❤️'.repeat(lives)}`, canvasWidth - 20, 40);

    if (gameState === 'start') {
        drawOverlay(t('game_title'), t('tap_to_start'));
    } else if (gameState === 'gameOver') {
        drawGameOver();
    }
}

function drawOverlay(title, subtitle) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#ff3e3e';
    ctx.font = 'bold 40px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth/2, canvasHeight/2 - 40);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText(subtitle, canvasWidth/2, canvasHeight/2 + 20);

    if (isLoadingRanking) {
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText(t('loading'), canvasWidth/2, canvasHeight/2 + 150);
    } else {
        drawRankings();
    }
}

function drawRankings() {
    let y = canvasHeight / 2 + 80;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(t('community_top'), canvasWidth/2, y);
    
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    globalRanking.forEach((r, i) => {
        ctx.fillText(`${i+1}. ${r.score}${t('pts')}`, canvasWidth/2, y + 25 + i*20);
    });

    y += 110;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(t('all_time_top'), canvasWidth/2, y);
    
    const localBest = getRanking(STORAGE_KEY_ALL_TIME);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    localBest.forEach((r, i) => {
        ctx.fillText(`${i+1}. ${r.score}${t('pts')}`, canvasWidth/2, y + 25 + i*20);
    });
}

function drawGameOver() {
    drawOverlay(t('game_over'), t('tap_to_retry'));
}

let lastNotifiedState = '';
function notifyParentState() {
    if (gameState === lastNotifiedState) return;
    const message = gameState === 'playing' ? 'gameState:playing' : 'gameState:not_playing';
    window.parent.postMessage(message, '*');
    lastNotifiedState = gameState;
}

function gameLoop() {
    // Sync language from portal
    const portalLang = localStorage.getItem('sushicious_lang');
    if (portalLang && portalLang !== currentLang) {
        currentLang = portalLang;
    }

    update();
    draw();
    notifyParentState();
    requestAnimationFrame(gameLoop);
}

// --- Events ---
window.addEventListener('resize', () => {
    setTimeout(resize, 100);
});

let isInputActive = false;
function handleInput(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    plate.x = Math.max(0, Math.min(x - plate.width / 2, canvasWidth - plate.width));
    
    if (gameState === 'start' && isInputActive) {
        gameState = 'playing';
    }
}

canvas.addEventListener('mousedown', (e) => {
    isInputActive = true;
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        lives = 3;
        sushis = [];
        fetchGlobalRanking();
    } else {
        handleInput(e.clientX);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isInputActive || gameState === 'playing') {
        handleInput(e.clientX);
    }
});

window.addEventListener('mouseup', () => {
    isInputActive = false;
});

canvas.addEventListener('touchstart', (e) => {
    isInputActive = true;
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        lives = 3;
        sushis = [];
        fetchGlobalRanking();
    } else {
        handleInput(e.touches[0].clientX);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isInputActive || gameState === 'playing') {
        handleInput(e.touches[0].clientX);
    }
}, { passive: false });

window.addEventListener('touchend', () => {
    isInputActive = false;
});

resize();
fetchGlobalRanking();
gameLoop();
