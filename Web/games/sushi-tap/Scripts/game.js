import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = { 
    apiKey: "AIzaSyDqId4B-kbsT0Xn_QbfCIh88vgr0yDNQu0", 
    authDomain: "sushicious-games.firebaseapp.com", 
    projectId: "sushicious-games", 
    storageBucket: "sushicious-games.firebasestorage.app", 
    messagingSenderId: "597158694276", 
    appId: "1:597158694276:web:b4ed18046b6711770d61d1", 
    measurementId: "G-NS62XTVFTP" 
}; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Multilingual Support ---
const translations = {
    en: {
        game_title: "Sushi Tap",
        tap_to_start: "Tap to Start",
        score: "Score",
        game_over: "GAME OVER",
        all_time_top: "--- YOUR BEST 3 ---",
        today_top: "--- TODAY BEST 3 ---",
        community_top: "--- GLOBAL TOP 3 ---",
        tap_to_retry: "Tap to Retry",
        pts: "pts",
        loading: "Loading..."
    },
    ja: {
        game_title: "寿司タップ",
        tap_to_start: "タップしてスタート",
        score: "スコア",
        game_over: "ゲームオーバー",
        all_time_top: "--- あなたのベスト3 ---",
        today_top: "--- 本日のベスト3 ---",
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
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let globalRanking = [];
let isLoadingRanking = false;

// --- Ranking Configuration ---
const STORAGE_KEY_ALL_TIME = 'sushicious_all_time_rank';
const STORAGE_KEY_DAILY = 'sushicious_daily_rank';

async function fetchGlobalRanking() {
    if (isLoadingRanking) return;
    isLoadingRanking = true;
    try {
        const q = query(collection(db, "rankings_tap"), orderBy("score", "desc"), limit(3));
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
        await addDoc(collection(db, "rankings_tap"), {
            score: score,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
        });
        // Refresh ranking after saving
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
    const today = new Date().toLocaleDateString();
    
    // For daily rank, check if the data is from today
    if (key === STORAGE_KEY_DAILY) {
        const lastDate = localStorage.getItem(key + '_date');
        if (lastDate !== today) {
            ranking = [];
            localStorage.setItem(key + '_date', today);
        }
    }

    ranking.push({ score, date: today, timestamp: Date.now() });
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 3); // Keep only top 3
    localStorage.setItem(key, JSON.stringify(ranking));
    
    // Also save to Firebase if it's high enough (simplified: always send to Firebase)
    if (key === STORAGE_KEY_ALL_TIME) {
        saveGlobalScore(score);
    }
}

// --- Game Objects ---
let targets = [];
let targetSpeed = 3;

function resizeCanvas() {
    // Use clientHeight/Width for better mobile precision
    let viewWidth = document.documentElement.clientWidth;
    let viewHeight = document.documentElement.clientHeight;
    
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
}

function drawRankList(title, list, yStart, isGlobal = false) {
    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth / 2, yStart);
    
    ctx.font = 'bold 18px monospace';
    if (isGlobal && isLoadingRanking && list.length === 0) {
        ctx.fillStyle = '#999';
        ctx.fillText(t('loading'), canvasWidth / 2, yStart + 35);
    } else if (list.length === 0) {
        ctx.fillStyle = '#666';
        ctx.fillText('-', canvasWidth / 2, yStart + 35);
    } else {
        list.forEach((item, i) => {
            ctx.fillStyle = i === 0 ? '#ffd700' : (i === 1 ? '#e0e0e0' : (i === 2 ? '#cd7f32' : '#ffffff'));
            ctx.fillText(`${i + 1}. ${item.score} ${t('pts')}`, canvasWidth / 2, yStart + 35 + (i * 28));
        });
    }
}

function drawStartScreen() {
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#ff3e3e';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('game_title'), canvasWidth / 2, canvasHeight * 0.15);
    
    // World Ranking from Firebase
    drawRankList(t('community_top'), globalRanking, canvasHeight * 0.35, true);

    ctx.fillStyle = `rgba(240, 240, 240, ${0.7 + Math.sin(Date.now() / 300) * 0.3})`;
    ctx.font = '22px sans-serif';
    ctx.fillText(t('tap_to_start'), canvasWidth / 2, canvasHeight * 0.85);
}

// --- Drawing Helpers ---
function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
}

function drawGameScreen() {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    targets.forEach(target => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.ellipse) {
            ctx.ellipse(target.x, target.y + 10, target.size / 2, target.size / 3, 0, 0, Math.PI * 2);
        } else {
            ctx.arc(target.x, target.y + 10, target.size / 2.5, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ff3e3e';
        drawRoundedRect(ctx, target.x - target.size / 2, target.y - target.size / 4, target.size, target.size / 2, 8);
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${t('score')}: ${score}`, 15, 45);
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('game_over'), canvasWidth / 2, canvasHeight * 0.15);
    
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(score, canvasWidth / 2, canvasHeight * 0.28);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(t('score').toUpperCase(), canvasWidth / 2, canvasHeight * 0.33);

    const allTime = getRanking(STORAGE_KEY_ALL_TIME);
    const daily = getRanking(STORAGE_KEY_DAILY);

    drawRankList(t('all_time_top'), allTime, canvasHeight * 0.45);
    drawRankList(t('today_top'), daily, canvasHeight * 0.70);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(t('tap_to_retry'), canvasWidth / 2, canvasHeight * 0.92);
}

function update() {
    if (gameState !== 'playing') return;
    targets.forEach(target => {
        target.y += targetSpeed;
    });
    if (Math.random() < 0.04) {
        const size = 50 + Math.random() * 30;
        targets.push({
            x: size/2 + Math.random() * (canvasWidth - size),
            y: -size,
            size: size
        });
    }
    if (targets.some(t => t.y > canvasHeight + 50)) {
        gameState = 'gameOver';
        saveRanking(STORAGE_KEY_ALL_TIME, score);
        saveRanking(STORAGE_KEY_DAILY, score);
        lastStateChange = Date.now();
    }
    if (targets.length > 50) {
        targets = targets.filter(t => t.y < canvasHeight + 100);
    }
}

let lastNotifiedState = '';
function notifyParentState() {
    if (gameState === lastNotifiedState) return;
    const message = gameState === 'playing' ? 'gameState:playing' : 'gameState:not_playing';
    window.parent.postMessage(message, '*');
    lastNotifiedState = gameState;
}

function gameLoop() {
    update();
    notifyParentState();
    currentLang = localStorage.getItem('sushicious_lang') || 'en';
    if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'playing') {
        drawGameScreen();
    } else if (gameState === 'gameOver') {
        drawGameOverScreen();
    }
    requestAnimationFrame(gameLoop);
}

let lastStateChange = 0;

function handleTap(event) {
    const now = Date.now();
    const canChangeState = (now - lastStateChange > 300);
    if (event.type === 'touchstart' && event.cancelable) {
        event.preventDefault();
    }
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const tapX = (clientX - rect.left) * scaleX;
    const tapY = (clientY - rect.top) * scaleY;

    if (gameState === 'start' && canChangeState) {
        gameState = 'playing';
        score = 0;
        targets = [];
        lastStateChange = now;
    } else if (gameState === 'playing') {
        targets.forEach((target, index) => {
            const distance = Math.sqrt(Math.pow(tapX - target.x, 2) + Math.pow(tapY - target.y, 2));
            if (distance < target.size / 2) {
                targets.splice(index, 1);
                score++;
            }
        });
    } else if (gameState === 'gameOver' && canChangeState) {
        gameState = 'start';
        lastStateChange = now;
        // Fetch latest rankings when returning to start screen
        fetchGlobalRanking();
    }
}

window.addEventListener('resize', () => {
    setTimeout(resizeCanvas, 100);
}, false);
canvas.addEventListener('touchstart', handleTap, { passive: false });
canvas.addEventListener('mousedown', handleTap, false);

resizeCanvas();
fetchGlobalRanking(); // Initial fetch
gameLoop();
