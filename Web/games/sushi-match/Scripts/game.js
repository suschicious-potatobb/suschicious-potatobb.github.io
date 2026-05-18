import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
    fetchGlobalRanking,
    getRanking,
    saveScoreToRankings,
    resizeCanvas,
    drawStartScreen,
    drawGameScreen,
    drawGameOverScreen,
    drawRankList,
    fillRoundRect,
    bindCanvasPointerStart,
    createLangState,
    createParentGameStateNotifier,
    resetGame,
    endGame,
} from "../../shared/Scripts/game-common.js";
import {
    BONUS_TIME_SECONDS,
    CARD_CORNER_RADIUS,
    CARD_EMOJI_FONT_SCALE,
    GAME_OVER_ALL_TIME_Y_RATIO,
    GAME_OVER_GLOBAL_Y_RATIO,
    GRID_PADDING,
    GRID_SIZE,
    GRID_Y_OFFSET,
    INITIAL_TIME_SECONDS,
    MISMATCH_FLIP_BACK_DELAY_MS,
    PLAYFIELD_BORDER_COLOR,
    PLAYFIELD_BORDER_LINE_WIDTH,
    RANKING_MAX_ENTRIES,
    RANKING_TOP_N,
    RESIZE_DEBOUNCE_MS,
    SCORE_PER_MATCH,
    SUSHI_EMOJIS,
    TIME_DECREMENT_PER_TICK,
} from "./constants.js";

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
let timeLeft = INITIAL_TIME_SECONDS;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
const rankingState = { globalRanking: [], isLoadingRanking: false };

// --- Ranking Configuration ---
const STORAGE_KEY_ALL_TIME = 'sushicious_match_all_time_rank';
const STORAGE_KEY_DAILY = 'sushicious_daily_rank';
const GLOBAL_COLLECTION = 'rankings_match';

// --- Puzzle Logic ---
let cards = [];
let selectedCards = [];

function applyResize() {
    const size = resizeCanvas({ canvas });
    canvasWidth = size.canvasWidth;
    canvasHeight = size.canvasHeight;
}

function initGrid() {
    const pairs = [...SUSHI_EMOJIS, ...SUSHI_EMOJIS];
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
        timeLeft -= TIME_DECREMENT_PER_TICK;
    } else {
        timeLeft = 0;
        endGame({
            getGameState: () => gameState,
            setGameState: (next) => { gameState = next; },
            onSaveScore: () => saveScoreToRankings({
                score,
                storageKeyAllTime: STORAGE_KEY_ALL_TIME,
                storageKeyDaily: STORAGE_KEY_DAILY,
                dailyKey: STORAGE_KEY_DAILY,
                maxEntries: RANKING_MAX_ENTRIES,
                includeTimestamp: true,
                global: {
                    db,
                    firebase: firebaseOps,
                    collectionName: GLOBAL_COLLECTION,
                    topN: RANKING_TOP_N,
                    state: rankingState
                }
            })
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
                    yStart: canvasHeight * GAME_OVER_GLOBAL_Y_RATIO,
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
            yStart: canvasHeight * GAME_OVER_ALL_TIME_Y_RATIO
        });
        return;
    }

    drawGameScreen({
        ctx,
        canvasWidth,
        canvasHeight,
        t,
        score,
        hudRightText: `${t('time')}: ${Math.ceil(timeLeft)}s`,
        backgroundColor: '#0f0f0f',
        drawPlayfield: () => {
            ctx.strokeStyle = PLAYFIELD_BORDER_COLOR;
            ctx.lineWidth = PLAYFIELD_BORDER_LINE_WIDTH;
            ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

            const { padding, cardSize, gridYStart, cellStep } = getGridLayout();

            cards.forEach((card, i) => {
                const row = Math.floor(i / GRID_SIZE);
                const col = i % GRID_SIZE;
                const x = padding + col * cellStep;
                const y = gridYStart + row * cellStep;

                ctx.fillStyle = card.isMatched ? 'rgba(255, 255, 255, 0.1)' : (card.isFlipped ? '#fff' : '#e63946');
                fillRoundRect(ctx, x, y, cardSize, cardSize, CARD_CORNER_RADIUS);

                if (card.isFlipped || card.isMatched) {
                    ctx.font = `${cardSize * CARD_EMOJI_FONT_SCALE}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#000';
                    ctx.fillText(card.emoji, x + cardSize / 2, y + cardSize / 2);
                }
            });
        }
    });
}

function getGridLayout() {
    const padding = GRID_PADDING;
    const cardSize = (canvasWidth - padding * (GRID_SIZE + 1)) / GRID_SIZE;
    const gridHeight = padding + (cardSize + padding) * GRID_SIZE;
    const gridYStart = (canvasHeight - gridHeight) / 2 + GRID_Y_OFFSET;
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
    setTimeout(applyResize, RESIZE_DEBOUNCE_MS);
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
                score += SCORE_PER_MATCH;
                timeLeft += BONUS_TIME_SECONDS; // Bonus time
                selectedCards = [];
                if (cards.every(c => c.isMatched)) {
                    initGrid(); // Reset grid if all matched
                }
            } else {
                setTimeout(() => {
                    selectedCards[0].isFlipped = false;
                    selectedCards[1].isFlipped = false;
                    selectedCards = [];
                }, MISMATCH_FLIP_BACK_DELAY_MS);
            }
        }
    }
}

bindCanvasPointerStart({
    canvas,
    onPoint: ({ x, y }) => {
        if (gameState === 'gameOver') {
        resetGame({
            setGameState: (next) => { gameState = next; },
            setScore: (next) => { score = next; },
            extraReset: () => {
                timeLeft = INITIAL_TIME_SECONDS;
                selectedCards = [];
                initGrid();
            },
            fetchRanking: () => fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: RANKING_TOP_N, state: rankingState })
        });

            return;
        }
        handleCardClick(x, y);
    }
});

applyResize();
initGrid();
fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: RANKING_TOP_N, state: rankingState });
gameLoop();
