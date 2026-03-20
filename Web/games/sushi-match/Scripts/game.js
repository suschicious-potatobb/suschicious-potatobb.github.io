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
    appId: "1:597158694276:web:1d9f150f4d73c25c0d61d1", 
    measurementId: "G-9052LHT6N4" 
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
        game_title: "Sushi Match",
        tap_to_start: "Tap Two to Match",
        score: "Score",
        time: "Time",
        game_over: "TIME UP",
        all_time_top: "--- YOUR BEST 3 ---",
        community_top: "--- GLOBAL TOP 3 ---",
        tap_to_retry: "Tap to Retry",
        pts: "pts",
        loading: "Loading..."
    },
    ja: {
        game_title: "寿司マッチ",
        tap_to_start: "2つ選んでペアを作ろう",
        score: "スコア",
        time: "残り時間",
        game_over: "タイムアップ",
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
let timeLeft = 30;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let globalRanking = [];
let isLoadingRanking = false;

const STORAGE_KEY_ALL_TIME = 'sushicious_match_all_time_rank';

// --- Puzzle Logic ---
const GRID_SIZE = 4;
let cards = [];
let selectedCards = [];
const sushiEmojis = ['🍣', '🦐', '🍳', '🐙', '🥢', '🍵', '🍶', '🍱'];

async function fetchGlobalRanking() {
    if (isLoadingRanking) return;
    isLoadingRanking = true;
    try {
        const q = query(collection(db, "rankings_match"), orderBy("score", "desc"), limit(3));
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
        await addDoc(collection(db, "rankings_match"), {
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
}

function initGrid() {
    const pairs = [...sushiEmojis, ...sushiEmojis];
    pairs.sort(() => Math.random() - 0.5);
    cards = pairs.map((emoji, index) => ({
        id: index,
        emoji: emoji,
        isFlipped: false,
        isMatched: false
    }));
}

function update() {
    if (gameState !== 'playing') return;

    if (timeLeft > 0) {
        timeLeft -= 1/60;
    } else {
        timeLeft = 0;
        gameState = 'gameOver';
        saveRanking(STORAGE_KEY_ALL_TIME, score);
    }
}

function draw() {
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // Draw Grid
    const padding = 20;
    const cardSize = (canvasWidth - padding * (GRID_SIZE + 1)) / GRID_SIZE;
    
    // Calculate grid height to center it
    const gridHeight = padding + (cardSize + padding) * GRID_SIZE;
    const gridYStart = (canvasHeight - gridHeight) / 2 + 30;

    cards.forEach((card, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const x = padding + col * (cardSize + padding);
        const y = gridYStart + row * (cardSize + padding);

        ctx.fillStyle = card.isMatched ? 'rgba(255, 255, 255, 0.1)' : (card.isFlipped ? '#fff' : '#e63946');
        ctx.beginPath();
        ctx.roundRect(x, y, cardSize, cardSize, 8);
        ctx.fill();

        if (card.isFlipped || card.isMatched) {
            ctx.font = `${cardSize * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(card.emoji, x + cardSize / 2, y + cardSize / 2);
        }
    });

    // Draw UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${t('score')}: ${score}`, 20, 45);
    ctx.textAlign = 'right';
    ctx.fillText(`${t('time')}: ${Math.ceil(timeLeft)}s`, canvasWidth - 20, 45);

    if (gameState === 'start') {
        drawOverlay(t('game_title'), t('tap_to_start'));
    } else if (gameState === 'gameOver') {
        drawGameOver();
    }
}

function drawOverlay(title, subtitle) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth/2, canvasHeight * 0.2);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText(subtitle, canvasWidth/2, canvasHeight * 0.28);

    if (isLoadingRanking) {
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText(t('loading'), canvasWidth/2, canvasHeight * 0.8);
    } else {
        drawRankings();
    }
}

function drawRankings() {
    let y = canvasHeight * 0.45;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.fillText(t('community_top'), canvasWidth/2, y);
    
    ctx.font = '18px Inter, sans-serif';
    ctx.fillStyle = '#fff';
    globalRanking.forEach((r, i) => {
        ctx.fillText(`${i+1}. ${r.score}${t('pts')}`, canvasWidth/2, y + 35 + i*30);
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

function handleCardClick(x, y) {
    if (gameState === 'start') {
        gameState = 'playing';
        return;
    }
    if (gameState !== 'playing' || selectedCards.length >= 2) return;

    const padding = 20;
    const cardSize = (canvasWidth - padding * (GRID_SIZE + 1)) / GRID_SIZE;
    
    const col = Math.floor((x - padding) / (cardSize + padding));
    const row = Math.floor((y - padding - 60) / (cardSize + padding));
    const index = row * GRID_SIZE + col;

    if (index >= 0 && index < cards.length && !cards[index].isFlipped && !cards[index].isMatched) {
        cards[index].isFlipped = true;
        selectedCards.push(cards[index]);

        if (selectedCards.length === 2) {
            if (selectedCards[0].emoji === selectedCards[1].emoji) {
                selectedCards[0].isMatched = true;
                selectedCards[1].isMatched = true;
                score += 100;
                timeLeft += 2; // Bonus time
                selectedCards = [];
                if (cards.every(c => c.isMatched)) {
                    initGrid(); // Reset grid if all matched
                }
            } else {
                setTimeout(() => {
                    selectedCards[0].isFlipped = false;
                    selectedCards[1].isFlipped = false;
                    selectedCards = [];
                }, 500);
            }
        }
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        timeLeft = 30;
        initGrid();
        fetchGlobalRanking();
    } else {
        const rect = canvas.getBoundingClientRect();
        handleCardClick(e.clientX - rect.left, e.clientY - rect.top);
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        timeLeft = 30;
        initGrid();
        fetchGlobalRanking();
    } else {
        const rect = canvas.getBoundingClientRect();
        handleCardClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
}, { passive: false });

resize();
initGrid();
fetchGlobalRanking();
gameLoop();
