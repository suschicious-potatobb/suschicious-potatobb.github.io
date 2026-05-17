import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
    fetchGlobalRanking,
    saveGlobalScore,
    getRanking,
    saveRanking,
    fillRoundRect,
    getCanvasPointFromEvent,
    createLangState,
    createParentGameStateNotifier,
    resizeCanvas,
    drawRankList,
    drawStartScreen,
    drawGameScreen,
    drawGameOverScreen,
} from "../../shared/Scripts/game-common.js";

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
const firebaseOps = { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp };

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

const langState = createLangState({ translations, defaultLang: 'en' });
const t = langState.t;

// --- Game Configuration ---
let canvasWidth, canvasHeight;
let score = 0;
let timeLeft = 30;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
const rankingState = { globalRanking: [], isLoadingRanking: false };

// --- Ranking Configuration ---
const STORAGE_KEY_ALL_TIME = 'sushicious_match_all_time_rank';
const STORAGE_KEY_DAILY = 'sushicious_daily_rank';
const GLOBAL_COLLECTION = 'rankings_match';

// --- Puzzle Logic ---
const GRID_SIZE = 4;
let cards = [];
let selectedCards = [];
const sushiEmojis = ['🍣', '🦐', '🍳', '🐙', '🥢', '🍵', '🍶', '🍱'];

function applyResize() {
    const size = resizeCanvas({ canvas });
    canvasWidth = size.canvasWidth;
    canvasHeight = size.canvasHeight;
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
        saveRanking({
            key: STORAGE_KEY_ALL_TIME,
            score,
            maxEntries: 3,
            includeTimestamp: true,
            onSave: () => {
                saveGlobalScore({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, score, topN: 3, state: rankingState });
            }
        });
        saveRanking({
            key: STORAGE_KEY_DAILY,
            score,
            maxEntries: 3,
            dailyKey: STORAGE_KEY_DAILY,
            includeTimestamp: true
        });
    }
}

function draw() {
    if (gameState === 'start') {
        drawStartScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            subtitleText: t('tap_to_start'),
            globalRanking: rankingState.globalRanking,
            isLoadingRanking: rankingState.isLoadingRanking
        });
        return;
    }
    if (gameState === 'gameOver') {
        drawGameOverScreen({
            ctx,
            canvasWidth,
            canvasHeight,
            t,
            score,
            showScore: false,
            sections: [
                {
                    title: t('community_top'),
                    list: rankingState.globalRanking,
                    yStart: canvasHeight * 0.45,
                    isGlobal: true,
                    isLoadingRanking: rankingState.isLoadingRanking
                }
            ]
        });
        drawRankList({
            ctx,
            t,
            canvasWidth,
            title: t('all_time_top'),
            list: getRanking(STORAGE_KEY_ALL_TIME),
            yStart: canvasHeight * 0.70
        });
        return;
    }

    drawGameScreen({
        ctx,
        canvasWidth,
        canvasHeight,
        t,
        score,
        showDefaultScore: false,
        drawPlayfield: () => {
            ctx.fillStyle = '#0f0f0f';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            const { padding, cardSize, gridYStart, cellStep } = getGridLayout();

            cards.forEach((card, i) => {
                const row = Math.floor(i / GRID_SIZE);
                const col = i % GRID_SIZE;
                const x = padding + col * cellStep;
                const y = gridYStart + row * cellStep;

                ctx.fillStyle = card.isMatched ? 'rgba(255, 255, 255, 0.1)' : (card.isFlipped ? '#fff' : '#e63946');
                fillRoundRect(ctx, x, y, cardSize, cardSize, 8);

                if (card.isFlipped || card.isMatched) {
                    ctx.font = `${cardSize * 0.6}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#000';
                    ctx.fillText(card.emoji, x + cardSize / 2, y + cardSize / 2);
                }
            });

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${t('score')}: ${score}`, 20, 45);
            ctx.textAlign = 'right';
            ctx.fillText(`${t('time')}: ${Math.ceil(timeLeft)}s`, canvasWidth - 20, 45);
        }
    });
}

function getGridLayout() {
    const padding = 20;
    const cardSize = (canvasWidth - padding * (GRID_SIZE + 1)) / GRID_SIZE;
    const gridHeight = padding + (cardSize + padding) * GRID_SIZE;
    const gridYStart = (canvasHeight - gridHeight) / 2 + 30;
    const cellStep = cardSize + padding;
    return { padding, cardSize, gridYStart, cellStep };
}


const notifyParentState = createParentGameStateNotifier();

function gameLoop() {
    langState.sync();

    update();
    draw();
    notifyParentState(gameState);
    requestAnimationFrame(gameLoop);
}

// --- Events ---
window.addEventListener('resize', () => {
    setTimeout(applyResize, 100);
});

function handleCardClick(x, y) {
    if (gameState === 'start') {
        gameState = 'playing';
        return;
    }
    if (gameState !== 'playing' || selectedCards.length >= 2) return;

    const { padding, cardSize, gridYStart, cellStep } = getGridLayout();

    const localX = x - padding;
    const localY = y - gridYStart;
    if (localX < 0 || localY < 0) return;

    const col = Math.floor(localX / cellStep);
    const row = Math.floor(localY / cellStep);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return;

    const withinCardX = (localX % cellStep) <= cardSize;
    const withinCardY = (localY % cellStep) <= cardSize;
    if (!withinCardX || !withinCardY) return;

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
        fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
    } else {
        const p = getCanvasPointFromEvent({ canvas, event: e });
        handleCardClick(p.x, p.y);
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'gameOver') {
        gameState = 'start';
        score = 0;
        timeLeft = 30;
        initGrid();
        fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
    } else {
        const p = getCanvasPointFromEvent({ canvas, event: e });
        handleCardClick(p.x, p.y);
    }
}, { passive: false });

applyResize();
initGrid();
fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: 3, state: rankingState });
gameLoop();
