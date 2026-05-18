import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
    fetchGlobalRanking,
    saveGlobalScore,
    getRanking,
    saveRanking,
    drawStartScreen,
    drawGameOverScreen,
    drawRankList,
    resizeCanvas,
} from "../../shared/Scripts/game-common.js";
import * as C from "./constants.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDffNMWkocUzsvZkbX_sOXtk5NHr8-KQME",
    authDomain: "sushicious-games.firebaseapp.com",
    projectId: "sushicious-games",
    storageBucket: "sushicious-games.firebasestorage.app",
    messagingSenderId: "597158694276",
    appId: "1:597158694276:web:c52ac21a53f9637d0d61d1",
    measurementId: "G-3CY5YW1H20"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const firebaseOps = { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp };

// --- Multilingual Support ---
const translations = {
    en: {
        game_title: "Sushi Docking",
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
        game_title: "寿司Docking",
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
const t = (key) => translations[currentLang]?.[key] || key;

// --- Ranking Configuration ---
const STORAGE_KEY_ALL_TIME = 'sushicious_docking_all_time_rank';
const STORAGE_KEY_DAILY = 'sushicious_docking_daily_rank';
const GLOBAL_COLLECTION = 'rankings_docking';

function createRankingStateAdapter(scene) {
    return {
        get globalRanking() {
            return scene.globalRanking;
        },
        set globalRanking(value) {
            scene.globalRanking = Array.isArray(value) ? value : [];
        },
        get isLoadingRanking() {
            return scene.isLoadingGlobalRanking;
        },
        set isLoadingRanking(value) {
            scene.isLoadingGlobalRanking = Boolean(value);
        }
    };
}

(() => {
    const canvas = document.getElementById('gameCanvas') || (() => {
        const c = document.createElement('canvas');
        c.id = 'gameCanvas';
        document.body.appendChild(c);
        return c;
    })();

    let currentZoom = 1;

    function applyViewport(game) {
        const { canvasWidth: width, canvasHeight: height } = resizeCanvas({ canvas, maxAspectRatio: C.MAX_ASPECT_RATIO });
        if (width <= 1 || height <= 1) {
            requestAnimationFrame(() => applyViewport(game));
            return;
        }
        currentZoom = Math.min(width / C.GAME_WIDTH, height / C.GAME_HEIGHT);

        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        if (game?.scale?.resize) {
            game.scale.resize(width, height);
        }

        const scenes = game?.scene?.getScenes(true) || [];
        for (const scene of scenes) {
            const cam = scene.cameras?.main;
            if (!cam) continue;
            cam.setZoom(currentZoom);
            cam.centerOn(C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2);
        }
    }

    const CONTAINER_LEFT = C.CONTAINER.x;
    const CONTAINER_RIGHT = C.CONTAINER.x + C.CONTAINER.width;
    const CONTAINER_TOP = C.CONTAINER.y;
    const CONTAINER_BOTTOM = C.CONTAINER.y + C.CONTAINER.height;
    const DEADLINE_Y = CONTAINER_TOP + C.DEADLINE_OFFSET_Y;
    const TYPES = C.PIECE_TYPES;

    const TYPE_BY_ID = new Map(TYPES.map(t => [t.id, t]));

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function pickWeightedTypeId(rng = Math.random) {
        let total = 0;
        for (const t of TYPES) total += t.weight;
        let r = rng() * total;
        for (const t of TYPES) {
            r -= t.weight;
            if (r <= 0) return t.id;
        }
        return TYPES[0].id;
    }

    class MainScene extends Phaser.Scene {
        constructor() {
            super('MainScene');
            this.pieces = new Set();
            this.score = 0;
            this.gameOver = false;
            this.restartQueued = false;
            this.scoreSubmitted = false;
            this.dangerMs = 0;
            this.pointerWorldX = C.GAME_WIDTH / 2;
            this.controlled = null;
            this.nextTypeId = null;
            this.scoreText = null;
            this.nextText = null;
            this.overlay = null;
            this.startOverlay = null;
            this.rankingsContainer = null;
            this.globalRanking = [];
            this.isLoadingGlobalRanking = false;
            this.sparkTextureKey = C.SPARK_TEXTURE_KEY;
            this.started = false;
            this._onPointerMove = null;
            this._onPointerDown = null;
            this._onCollisionStart = null;
        }

        create() {
            this.cameras.main.setBackgroundColor('#0f0f0f');
            this.cameras.main.setZoom(currentZoom);
            this.cameras.main.centerOn(C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2);
            this.pieces = new Set();
            this.score = 0;
            this.gameOver = false;
            this.restartQueued = false;
            this.scoreSubmitted = false;
            this.dangerMs = 0;
            currentLang = localStorage.getItem('sushicious_lang') || (navigator.language.startsWith('ja') ? 'ja' : 'en');

            this.started = false;
            this.controlled = null;
            this.overlay = null;
            this.startOverlay = null;
            this.rankingsContainer = null;
            this.globalRanking = [];
            this.isLoadingGlobalRanking = false;
            if (this.matter?.world?.removeAll) {
                this.matter.world.removeAll();
            }
            this.matter.world.setGravity(0, C.MATTER_GRAVITY_Y);
            this.matter.world.resume();
            this.matter.world.setBounds(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT, C.MATTER_WORLD_BOUNDS_THICKNESS, true, true, true, true);


            this.createTextures();
            this.drawBackdrop();
            this.createContainerBounds();
            this.createUI();

            this.nextTypeId = pickWeightedTypeId();
            const nextType = TYPE_BY_ID.get(this.nextTypeId);
            if (nextType) this.nextText.setText(nextType.emoji);
            this.showStartOverlay();
            this.refreshGlobalRanking();

            this._onPointerMove = () => {
                const p = this.input.activePointer;
                const worldPoint = p.positionToCamera(this.cameras.main);
                this.pointerWorldX = worldPoint.x;
            };

            this._onPointerDown = () => {
                if (!this.started && !this.gameOver) {
                    this.startGame();
                    return;
                }
                if (this.gameOver) {
                    if (this.restartQueued) return;
                    this.restartQueued = true;
                    this.scene.restart();
                }
            };

            this.input.on('pointermove', this._onPointerMove);
            this.input.on('pointerdown', this._onPointerDown);

            this._onCollisionStart = (event) => {
                if (this.gameOver || !this.started) return;
                for (const pair of event.pairs) {
                    const bodyA = pair.bodyA;
                    const bodyB = pair.bodyB;
                    const goA = bodyA?.gameObject;
                    const goB = bodyB?.gameObject;

                    if (this.controlled && this.controlled.active && this.controlled.body) {
                        const controlledBody = this.controlled.body;
                        if (bodyA === controlledBody || bodyB === controlledBody) {
                            const otherBody = bodyA === controlledBody ? bodyB : bodyA;
                            const otherGo = otherBody?.gameObject;
                            const hitsPiece = !!otherGo?.getData?.('kind');
                            const hitsFloor = otherBody?.label === 'floor';
                            if (this.controlled.getData('controllable') && (hitsPiece || hitsFloor)) {
                                this.releaseControlled(this.controlled);
                            }
                        }
                    }

                    if (goA && goB) {
                        this.tryMergeFromCollision(goA, goB);
                    }
                }
            };

            const world = this.matter?.world;
            if (world) {
                world.on('collisionstart', this._onCollisionStart);
            }

            this.events.once('shutdown', () => {
                if (this._onPointerMove && this.input) this.input.off('pointermove', this._onPointerMove);
                if (this._onPointerDown && this.input) this.input.off('pointerdown', this._onPointerDown);
                if (this._onCollisionStart && world) world.off('collisionstart', this._onCollisionStart);
            });
        }

        getOrCreateOverlayTexture(key) {
            if (!this._overlayTextures) this._overlayTextures = new Map();
            const existing = this._overlayTextures.get(key);
            if (existing) return existing;

            if (this.textures.exists(key)) {
                this.textures.remove(key);
            }

            const canvas = document.createElement('canvas');
            canvas.width = C.GAME_WIDTH;
            canvas.height = C.GAME_HEIGHT;
            const texture = this.textures.addCanvas(key, canvas);
            const ctx2d = canvas.getContext('2d');

            const entry = { canvas, ctx: ctx2d, texture };
            this._overlayTextures.set(key, entry);
            return entry;
        }

        renderCommonStartOverlay() {
            const { ctx: ctx2d, texture } = this.getOrCreateOverlayTexture('ui-start');
            drawStartScreen({
                ctx: ctx2d,
                canvasWidth: C.GAME_WIDTH,
                canvasHeight: C.GAME_HEIGHT,
                t,
                globalRanking: this.globalRanking,
                isLoadingRanking: this.isLoadingGlobalRanking,
            });
            drawRankList({
                ctx: ctx2d,
                t,
                canvasWidth: C.GAME_WIDTH,
                title: t('all_time_top'),
                list: getRanking(STORAGE_KEY_ALL_TIME),
                yStart: C.GAME_HEIGHT * C.START_RANK_ALL_TIME_Y_RATIO,
            });
            drawRankList({
                ctx: ctx2d,
                t,
                canvasWidth: C.GAME_WIDTH,
                title: t('today_top'),
                list: getRanking(STORAGE_KEY_DAILY),
                yStart: C.GAME_HEIGHT * C.START_RANK_DAILY_Y_RATIO,
            });
            texture.refresh();

            if (!this.startOverlay || !this.startOverlay.active) {
                this.startOverlay = this.add.image(C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2, 'ui-start').setOrigin(0.5);
                this.startOverlay.setDepth(1000);
            }
        }

        renderCommonGameOverOverlay() {
            const { ctx: ctx2d, texture } = this.getOrCreateOverlayTexture('ui-gameover');
            drawGameOverScreen({
                ctx: ctx2d,
                canvasWidth: C.GAME_WIDTH,
                canvasHeight: C.GAME_HEIGHT,
                t,
                score: this.score,
                storageKeyAllTime: STORAGE_KEY_ALL_TIME,
                storageKeyDaily: STORAGE_KEY_DAILY,
            });
            texture.refresh();

            if (!this.overlay || !this.overlay.active) {
                this.overlay = this.add.image(C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2, 'ui-gameover').setOrigin(0.5);
                this.overlay.setDepth(1000);
            }
        }

        showStartOverlay() {
            this.renderCommonStartOverlay();
        }

        startGame() {
            if (this.started || this.gameOver) return;
            this.started = true;
            if (this.startOverlay) {
                this.startOverlay.destroy();
                this.startOverlay = null;
            }
            this.spawnControlledPiece();
        }

        createTextures() {
            if (this.textures.exists(this.sparkTextureKey)) return;
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(C.SPARK_DOT_RADIUS, C.SPARK_DOT_RADIUS, C.SPARK_DOT_RADIUS);
            g.generateTexture(this.sparkTextureKey, C.SPARK_TEXTURE_SIZE, C.SPARK_TEXTURE_SIZE);
            g.destroy();
        }

        drawBackdrop() {
            const g = this.add.graphics();

            g.fillStyle(C.BACKDROP_BG_COLOR, 1);
            g.fillRect(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT);

            for (let y = 0; y < C.GAME_HEIGHT; y += C.BACKDROP_STRIPE_STEP_Y) {
                const alpha =
                    C.BACKDROP_STRIPE_ALPHA_BASE + ((y / C.BACKDROP_STRIPE_STEP_Y) % 2) * C.BACKDROP_STRIPE_ALPHA_ALT;
                g.lineStyle(C.BACKDROP_STRIPE_LINE_WIDTH, C.BACKDROP_STRIPE_COLOR, alpha);
                g.beginPath();
                g.moveTo(0, y);
                g.lineTo(C.GAME_WIDTH, y + C.BACKDROP_STRIPE_SLOPE_OFFSET_Y);
                g.strokePath();
            }

            g.fillStyle(0xffffff, C.BACKDROP_CONTAINER_OUTER_ALPHA);
            g.fillRoundedRect(
                C.CONTAINER.x - C.BACKDROP_CONTAINER_OUTER_PADDING,
                C.CONTAINER.y - C.BACKDROP_CONTAINER_OUTER_PADDING,
                C.CONTAINER.width + C.BACKDROP_CONTAINER_OUTER_PADDING * 2,
                C.CONTAINER.height + C.BACKDROP_CONTAINER_OUTER_PADDING * 2,
                C.BACKDROP_CONTAINER_OUTER_CORNER_RADIUS
            );

            g.fillStyle(0x000000, C.BACKDROP_CONTAINER_INNER_ALPHA);
            g.fillRoundedRect(
                C.CONTAINER.x,
                C.CONTAINER.y,
                C.CONTAINER.width,
                C.CONTAINER.height,
                C.BACKDROP_CONTAINER_INNER_CORNER_RADIUS
            );

            g.lineStyle(C.BACKDROP_CONTAINER_BORDER_WIDTH, C.BACKDROP_CONTAINER_BORDER_COLOR, C.BACKDROP_CONTAINER_BORDER_ALPHA);
            g.strokeRoundedRect(
                C.CONTAINER.x,
                C.CONTAINER.y,
                C.CONTAINER.width,
                C.CONTAINER.height,
                C.BACKDROP_CONTAINER_INNER_CORNER_RADIUS
            );

            const seaLeft = C.CONTAINER.x;
            const seaRight = C.CONTAINER.x + C.CONTAINER.width;
            const waveAmp = C.SEA_WAVE_AMP;
            const waveStep = C.SEA_WAVE_STEP;
            const waveLen = C.SEA_WAVE_LEN;

            g.fillStyle(C.SEA_FILL_COLOR, C.SEA_FILL_ALPHA);
            g.beginPath();
            g.moveTo(seaLeft, DEADLINE_Y - waveAmp - C.SEA_FILL_TOP_PAD);
            for (let x = seaLeft; x <= seaRight; x += waveStep) {
                const y = DEADLINE_Y - waveAmp + Math.sin((x - seaLeft) / waveLen) * waveAmp;
                g.lineTo(x, y);
            }
            g.lineTo(seaRight, DEADLINE_Y + waveAmp + C.SEA_FILL_BOTTOM_PAD);
            for (let x = seaRight; x >= seaLeft; x -= waveStep) {
                const y =
                    DEADLINE_Y +
                    waveAmp +
                    Math.sin((x - seaLeft) / waveLen + C.SEA_BOTTOM_PHASE) * (waveAmp * C.SEA_BOTTOM_AMP_MULT);
                g.lineTo(x, y);
            }
            g.closePath();
            g.fillPath();

            g.lineStyle(C.SEA_DARK_LINE_WIDTH, C.SEA_DARK_LINE_COLOR, C.SEA_DARK_LINE_ALPHA);
            g.beginPath();
            for (let x = seaLeft; x <= seaRight; x += waveStep) {
                const y = DEADLINE_Y + Math.sin((x - seaLeft) / waveLen) * waveAmp;
                if (x === seaLeft) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.strokePath();

            g.lineStyle(C.SEA_LIGHT_LINE_WIDTH, C.SEA_LIGHT_LINE_COLOR, C.SEA_LIGHT_LINE_ALPHA);
            g.beginPath();
            for (let x = seaLeft; x <= seaRight; x += waveStep) {
                const y =
                    DEADLINE_Y -
                    C.SEA_LIGHT_LINE_OFFSET_Y +
                    Math.sin((x - seaLeft) / waveLen + C.SEA_LIGHT_LINE_PHASE) * (waveAmp * C.SEA_LIGHT_AMP_MULT);
                if (x === seaLeft) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.strokePath();

            g.destroy();

            const noriCount = C.NORI_COUNT;
            for (let i = 0; i < noriCount; i += 1) {
                const x = seaLeft + ((i + 0.5) / noriCount) * (seaRight - seaLeft);
                this.add.text(x, DEADLINE_Y - C.NORI_Y_OFFSET, '🌿', {
                    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                    fontSize: `${C.NORI_FONT_SIZE_PX}px`,
                    color: '#ffffff'
                }).setOrigin(0.5).setAlpha(C.NORI_ALPHA);
            }
        }

        createContainerBounds() {
            const thickness = C.CONTAINER_WALL_THICKNESS;
            const sideOpts = { isStatic: true, restitution: C.CONTAINER_SIDE_RESTITUTION, friction: C.CONTAINER_SIDE_FRICTION, label: 'side' };
            const floorOpts = { isStatic: true, restitution: C.CONTAINER_FLOOR_RESTITUTION, friction: C.CONTAINER_FLOOR_FRICTION, label: 'floor' };

            this.matter.add.rectangle(CONTAINER_LEFT - thickness / 2, (CONTAINER_TOP + CONTAINER_BOTTOM) / 2, thickness, C.CONTAINER.height + thickness, sideOpts);
            this.matter.add.rectangle(CONTAINER_RIGHT + thickness / 2, (CONTAINER_TOP + CONTAINER_BOTTOM) / 2, thickness, C.CONTAINER.height + thickness, sideOpts);
            this.matter.add.rectangle((CONTAINER_LEFT + CONTAINER_RIGHT) / 2, CONTAINER_BOTTOM + thickness / 2, C.CONTAINER.width + thickness, thickness, floorOpts);
        }

        createUI() {
            const styleTitle = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontStyle: '900',
                fontSize: `${C.UI_TITLE_FONT_SIZE_PX}px`,
                color: '#f0f0f0'
            };

            const styleSmall = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${C.UI_SMALL_FONT_SIZE_PX}px`,
                color: '#f0f0f0'
            };

            this.add.text(0, C.UI_TITLE_Y, 'SUSHI-Docking', styleTitle).setAlpha(C.UI_TITLE_ALPHA);
            this.scoreText = this.add.text(0, C.UI_SCORE_Y, 'Score: 0', styleSmall).setAlpha(C.UI_SCORE_ALPHA);

            const nextLabel = this.add.text(C.GAME_WIDTH - C.UI_NEXT_MARGIN_X, C.UI_NEXT_LABEL_Y, 'Next', styleSmall).setOrigin(1, 0).setAlpha(C.UI_NEXT_LABEL_ALPHA);
            nextLabel.setColor('#d4af37');

            this.nextText = this.add.text(C.GAME_WIDTH - C.UI_NEXT_MARGIN_X, C.UI_NEXT_EMOJI_Y, '🦐', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${C.UI_NEXT_EMOJI_FONT_SIZE_PX}px`,
                color: '#ffffff'
            }).setOrigin(1, 0).setAlpha(C.UI_NEXT_EMOJI_ALPHA);
        }

        update(time, delta) {
            if (this.gameOver) return;
            if (!this.started) return;

            const p = this.input.activePointer;
            if (p) {
                const worldPoint = p.positionToCamera(this.cameras.main);
                this.pointerWorldX = worldPoint.x;
            }

            if (this.controlled && this.controlled.active && this.controlled.getData('controllable')) {
                const radius = this.controlled.getData('radius');
                const targetX = clamp(this.pointerWorldX, CONTAINER_LEFT + radius, CONTAINER_RIGHT - radius);
                const currentY = this.controlled.body.position.y;
                this.controlled.setPosition(targetX, currentY);
                this.controlled.setVelocity(0, C.CONTROLLED_FALL_SPEED);
                this.controlled.setAngularVelocity(0);
            }

            this.updateDanger(delta);
        }

        updateDanger(delta) {
            let inDanger = false;
            for (const piece of this.pieces) {
                if (!piece.active) continue;
                if (piece.getData('controllable')) continue;
                const y = piece.body.position.y;
                const radius = piece.getData('radius') || 0;
                if (y - radius < DEADLINE_Y) {
                    inDanger = true;
                    break;
                }
            }

            if (inDanger) {
                this.dangerMs += delta;
            } else {
                this.dangerMs = 0;
            }

            if (this.dangerMs >= C.DANGER_DURATION_MS) {
                this.endGame();
            }
        }

        endGame() {
            if (this.gameOver) return;
            this.gameOver = true;
            this.matter.world.pause();
            this.saveRankingsOnce();
            this.renderCommonGameOverOverlay();
        }

        saveRankingsOnce() {
            if (this.scoreSubmitted) return;
            this.scoreSubmitted = true;

            saveRanking({ key: STORAGE_KEY_ALL_TIME, score: this.score, maxEntries: C.RANKING_MAX_ENTRIES, includeTimestamp: true });
            saveRanking({ key: STORAGE_KEY_DAILY, score: this.score, maxEntries: C.RANKING_MAX_ENTRIES, dailyKey: STORAGE_KEY_DAILY, includeTimestamp: true });

            const state = this._rankingState || (this._rankingState = createRankingStateAdapter(this));
            saveGlobalScore({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, score: this.score, topN: C.RANKING_TOP_N, state })
                .then(() => this.refreshGlobalRanking())
                .catch(() => {});
        }

        refreshGlobalRanking() {
            const state = this._rankingState || (this._rankingState = createRankingStateAdapter(this));
            fetchGlobalRanking({ db, firebase: firebaseOps, collectionName: GLOBAL_COLLECTION, topN: C.RANKING_TOP_N, state })
                .then(() => {
                    if (!this.started && this.startOverlay) {
                        this.renderCommonStartOverlay();
                    }
                })
                .catch(() => {
                    this.globalRanking = [];
                    if (!this.started && this.startOverlay) {
                        this.renderCommonStartOverlay();
                    }
                });
        }

        buildRankingsUI() {
            if (!this.overlay) return;
            if (this.rankingsContainer) {
                this.rankingsContainer.destroy();
                this.rankingsContainer = null;
            }

            const baseY = C.GAME_HEIGHT * C.OVERLAY_BASE_Y_RATIO;
            const columnGap = C.OVERLAY_COLUMN_GAP;
            const leftX = C.GAME_WIDTH / 2 - columnGap;
            const midX = C.GAME_WIDTH / 2;
            const rightX = C.GAME_WIDTH / 2 + columnGap;

            const textStyleTitle = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${C.OVERLAY_TEXT_FONT_SIZE_PX}px`,
                color: '#f0f0f0',
                fontStyle: '700'
            };

            const textStyleRow = {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${C.OVERLAY_TEXT_FONT_SIZE_PX}px`,
                color: '#ffffff'
            };

            const allTime = getRanking(STORAGE_KEY_ALL_TIME);
            const daily = getRanking(STORAGE_KEY_DAILY);
            const global = this.globalRanking;

            const container = this.add.container(0, 0);

            const makeColumn = (x, titleText, items, isLoading = false) => {
                const title = this.add.text(x, baseY, titleText, textStyleTitle).setOrigin(0.5, 0);
                const rows = [];
                if (isLoading && (!items || items.length === 0)) {
                    rows.push(this.add.text(x, baseY + C.OVERLAY_LOADING_Y_OFFSET, t('loading'), { ...textStyleRow, color: '#999999' }).setOrigin(0.5, 0));
                } else if (!items || items.length === 0) {
                    rows.push(this.add.text(x, baseY + C.OVERLAY_LOADING_Y_OFFSET, '-', { ...textStyleRow, color: '#999999' }).setOrigin(0.5, 0));
                } else {
                    for (let i = 0; i < Math.min(C.RANKING_TOP_N, items.length); i += 1) {
                        const scoreVal = items[i]?.score ?? items[i]?.score;
                        const line = `${i + 1}. ${scoreVal}`;
                        rows.push(this.add.text(x, baseY + C.OVERLAY_LOADING_Y_OFFSET + i * C.OVERLAY_ROW_SPACING, line, textStyleRow).setOrigin(0.5, 0));
                    }
                }
                return [title, ...rows];
            };

            container.add(makeColumn(leftX, t('all_time_top'), allTime));
            container.add(makeColumn(midX, t('today_top'), daily));
            container.add(makeColumn(rightX, t('community_top'), global, this.isLoadingGlobalRanking));

            this.rankingsContainer = container;
            this.overlay.add(container);
        }

        releaseControlled(piece) {
            if (!piece.active) return;
            if (!piece.getData('controllable')) return;
            if (piece.getData('spawnQueued')) {
                piece.setData('controllable', false);
                piece.setIgnoreGravity(false);
                return;
            }

            piece.setData('controllable', false);
            piece.setData('spawnQueued', true);
            piece.setIgnoreGravity(false);

            this.time.delayedCall(C.CONTROL_RELEASE_DELAY_MS, () => {
                if (this.gameOver) return;
                if (!piece.active) return;
                if (this.controlled !== piece) return;
                this.controlled = null;
                this.spawnControlledPiece();
            });
        }

        spawnControlledPiece() {
            const typeId = this.nextTypeId;
            this.nextTypeId = pickWeightedTypeId();
            const nextType = TYPE_BY_ID.get(this.nextTypeId);
            if (nextType) this.nextText.setText(nextType.emoji);

            const type = TYPE_BY_ID.get(typeId) || TYPES[0];
            const x = clamp(this.pointerWorldX, CONTAINER_LEFT + type.radius, CONTAINER_RIGHT - type.radius);
            const y = CONTAINER_TOP + C.CONTROL_SPAWN_Y_OFFSET;
            const piece = this.createPiece(type.id, x, y);
            piece.setData('controllable', true);
            piece.setIgnoreGravity(true);
            this.controlled = piece;

            this.time.delayedCall(C.CONTROL_AUTORELEASE_DELAY_MS, () => {
                if (!piece.active) return;
                if (!piece.getData('controllable')) return;
                if (piece.body.position.y > CONTAINER_TOP + C.CONTROL_AUTORELEASE_Y_OFFSET) {
                    this.releaseControlled(piece);
                }
            });
        }

        createPiece(typeId, x, y) {
            const def = TYPE_BY_ID.get(typeId) || TYPES[0];
            const fontSize = Math.max(C.PIECE_FONT_MIN_SIZE_PX, Math.round(def.radius * C.PIECE_FONT_RADIUS_MULT));
            const obj = this.add.text(x, y, def.emoji, {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${fontSize}px`,
                color: '#ffffff'
            });
            obj.setOrigin(0.5);

            this.matter.add.gameObject(obj, {
                shape: { type: 'circle', radius: def.radius },
                restitution: C.PIECE_RESTITUTION,
                friction: C.PIECE_FRICTION,
                frictionAir: C.PIECE_FRICTION_AIR,
                density: C.PIECE_DENSITY
            });

            obj.setData('kind', def.id);
            obj.setData('radius', def.radius);
            obj.setData('merging', false);
            obj.setData('controllable', false);
            obj.setData('spawnQueued', false);
            obj.setIgnoreGravity(false);

            this.pieces.add(obj);
            obj.once('destroy', () => this.pieces.delete(obj));

            return obj;
        }

        tryMergeFromCollision(a, b) {
            if (this.gameOver) return;
            const kindA = a.getData('kind');
            const kindB = b.getData('kind');
            if (!kindA || !kindB) return;
            if (a.getData('merging') || b.getData('merging')) return;

            if (kindA === kindB) {
                const result = C.SAME_MERGE_TO[kindA];
                if (result) {
                    this.mergePieces([a, b], result);
                    return;
                }
                if (kindA === 'sushi') {
                    this.vanishSushiPair([a, b]);
                }
                return;
            }

            const makesSushi =
                (kindA === 'fish' && kindB === 'rice') ||
                (kindA === 'rice' && kindB === 'fish');
            if (makesSushi) {
                this.mergePieces([a, b], 'sushi');
            }
        }

        mergePieces(pair, resultTypeId) {
            if (this.gameOver) return;
            const [a, b] = pair;
            if (!a.active || !b.active) return;

            a.setData('merging', true);
            b.setData('merging', true);

            const mx = (a.body.position.x + b.body.position.x) / 2;
            const my = (a.body.position.y + b.body.position.y) / 2;

            this.spawnSparkles(mx, my, C.MERGE_SPARKLES_COUNT, 0xffffff);

            this.time.delayedCall(0, () => {
                if (a.active) a.destroy();
                if (b.active) b.destroy();

                const newPiece = this.createPiece(resultTypeId, mx, my);
                newPiece.setVelocity(
                    Phaser.Math.Between(C.MERGE_NEW_X_VELOCITY_MIN, C.MERGE_NEW_X_VELOCITY_MAX),
                    Phaser.Math.Between(C.MERGE_NEW_Y_VELOCITY_MIN, C.MERGE_NEW_Y_VELOCITY_MAX)
                );
                newPiece.setAngularVelocity(
                    Phaser.Math.FloatBetween(C.MERGE_NEW_ANGULAR_VELOCITY_MIN, C.MERGE_NEW_ANGULAR_VELOCITY_MAX)
                );
            });

            this.addScoreForType(resultTypeId);
            this.playTone(C.MERGE_TONE_FREQ, C.MERGE_TONE_DURATION_SEC, C.MERGE_TONE_GAIN);

            if (this.controlled && (a === this.controlled || b === this.controlled)) {
                this.controlled = null;
                this.time.delayedCall(C.CONTROL_POST_MERGE_DELAY_MS, () => this.spawnControlledPiece());
            }
        }

        vanishSushiPair(pair) {
            if (this.gameOver) return;
            const [a, b] = pair;
            if (!a.active || !b.active) return;

            a.setData('merging', true);
            b.setData('merging', true);

            const mx = (a.body.position.x + b.body.position.x) / 2;
            const my = (a.body.position.y + b.body.position.y) / 2;

            this.spawnSmoke(mx, my);
            this.spawnSparkles(mx, my, C.SUSHI_SPARKLES_COUNT, 0xd4af37);
            this.applyPopImpulse(mx, my);

            const pop = this.add.text(mx, my, '💰', {
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                fontSize: `${C.SUSHI_POP_EMOJI_FONT_SIZE_PX}px`,
                color: '#ffffff'
            }).setOrigin(0.5);
            pop.setScale(C.SUSHI_POP_EMOJI_SCALE);
            pop.setAlpha(C.SUSHI_POP_EMOJI_ALPHA);
            this.tweens.add({
                targets: pop,
                scale: C.SUSHI_POP_TWEEN_SCALE,
                alpha: C.SUSHI_POP_TWEEN_ALPHA,
                duration: C.SUSHI_POP_TWEEN_DURATION_MS,
                yoyo: true,
                hold: C.SUSHI_POP_TWEEN_HOLD_MS,
                onComplete: () => pop.destroy()
            });

            this.time.delayedCall(C.SUSHI_VANISH_DELAY_MS, () => {
                if (a.active) a.destroy();
                if (b.active) b.destroy();
            });

            this.score += C.SUSHI_BONUS;
            if (this.scoreText && this.scoreText.active) {
                this.scoreText.setText(`Score: ${this.score}`);
            }
            this.playTone(C.SUSHI_TONE_FREQ, C.SUSHI_TONE_DURATION_SEC, C.SUSHI_TONE_GAIN);

            if (this.controlled && (a === this.controlled || b === this.controlled)) {
                this.controlled = null;
                this.time.delayedCall(C.CONTROL_POST_MERGE_DELAY_MS, () => this.spawnControlledPiece());
            }
        }

        applyPopImpulse(x, y) {
            const MatterBody = Phaser.Physics.Matter.Matter.Body;
            const radius = C.POP_IMPULSE_RADIUS;
            const base = C.POP_IMPULSE_BASE_FORCE;

            for (const piece of this.pieces) {
                if (!piece.active || !piece.body) continue;
                const bx = piece.body.position.x;
                const by = piece.body.position.y;
                const dx = bx - x;
                const dy = by - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= C.POP_IMPULSE_IGNORE_DIST || dist > radius) continue;
                const nx = dx / dist;
                const ny = dy / dist;
                const falloff = 1 - dist / radius;
                const force = base * falloff;
                MatterBody.applyForce(piece.body, piece.body.position, { x: nx * force, y: ny * force });
            }
        }

        spawnSparkles(x, y, count, color) {
            const particles = this.add.particles(0, 0, this.sparkTextureKey, {
                x,
                y,
                quantity: count,
                lifespan: C.SPARKLES_LIFESPAN_MS,
                speed: { min: C.SPARKLES_SPEED_MIN, max: C.SPARKLES_SPEED_MAX },
                angle: { min: 0, max: 360 },
                scale: { start: C.SPARKLES_SCALE_START, end: 0 },
                alpha: { start: C.SPARKLES_ALPHA_START, end: 0 },
                tint: color,
                blendMode: 'ADD'
            });

            this.time.delayedCall(C.SPARKLES_LIFESPAN_MS, () => particles.destroy());
        }

        spawnSmoke(x, y) {
            const particles = this.add.particles(0, 0, this.sparkTextureKey, {
                x,
                y,
                quantity: C.SMOKE_QUANTITY,
                lifespan: C.SMOKE_LIFESPAN_MS,
                speed: { min: C.SMOKE_SPEED_MIN, max: C.SMOKE_SPEED_MAX },
                angle: { min: 0, max: 360 },
                scale: { start: C.SMOKE_SCALE_START, end: C.SMOKE_SCALE_END },
                alpha: { start: C.SMOKE_ALPHA_START, end: 0 },
                tint: 0xffffff,
                blendMode: 'NORMAL'
            });

            this.time.delayedCall(C.SMOKE_LIFESPAN_MS, () => particles.destroy());
        }

        addScoreForType(typeId) {
            if (this.gameOver) return;
            const def = TYPE_BY_ID.get(typeId);
            const add = def?.score ?? 0;
            this.score += add;
            if (this.scoreText && this.scoreText.active) {
                this.scoreText.setText(`Score: ${this.score}`);
            }
        }

        playTone(freq, durationSec, gain) {
            if (!window.AudioContext && !window.webkitAudioContext) return;
            if (!this._audioCtx) {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioCtx;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            g.gain.setValueAtTime(C.AUDIO_GAIN_FLOOR, now);
            g.gain.exponentialRampToValueAtTime(gain, now + C.AUDIO_ATTACK_SEC);
            g.gain.exponentialRampToValueAtTime(C.AUDIO_GAIN_FLOOR, now + durationSec);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + durationSec + C.AUDIO_STOP_PAD_SEC);
        }
    }

    const preferredRenderType = (() => {
        try {
            const testCanvas = document.createElement('canvas');
            const hasWebGL =
                !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
            return hasWebGL ? Phaser.WEBGL : Phaser.CANVAS;
        } catch {
            return Phaser.CANVAS;
        }
    })();

    const { canvasWidth: initialWidth, canvasHeight: initialHeight } = resizeCanvas({ canvas, maxAspectRatio: C.MAX_ASPECT_RATIO });

    const config = {
        type: preferredRenderType,
        renderType: preferredRenderType,
        canvas,
        width: initialWidth,
        height: initialHeight,
        backgroundColor: '#0f0f0f',
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: C.MATTER_GRAVITY_Y },
                debug: false
            }
        },
        scale: { mode: Phaser.Scale.NONE },
        scene: [MainScene]
    };

    let game;
    try {
        game = new Phaser.Game(config);
    } catch (e) {
        if (preferredRenderType === Phaser.WEBGL) {
            const fallbackConfig = { ...config, type: Phaser.CANVAS, renderType: Phaser.CANVAS };
            game = new Phaser.Game(fallbackConfig);
        } else {
            throw e;
        }
    }
    applyViewport(game);
    setTimeout(() => applyViewport(game), C.VIEWPORT_INITIAL_RESIZE_DELAY_MS);
    window.addEventListener('resize', () => setTimeout(() => applyViewport(game), C.VIEWPORT_RESIZE_DEBOUNCE_MS));
})();
