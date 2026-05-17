export async function fetchGlobalRanking({ db, firebase, collectionName, topN = 3, state } = {}) {
    if (!db || !firebase || !collectionName) return [];
    if (state?.isLoadingRanking) return state?.globalRanking || [];

    if (state) state.isLoadingRanking = true;
    try {
        const q = firebase.query(
            firebase.collection(db, collectionName),
            firebase.orderBy("score", "desc"),
            firebase.limit(topN)
        );
        const querySnapshot = await firebase.getDocs(q);
        const ranking = querySnapshot.docs.map(doc => doc.data());
        if (state) state.globalRanking = ranking;
        return ranking;
    } catch (e) {
        console.error("Error fetching ranking: ", e);
        return state?.globalRanking || [];
    } finally {
        if (state) state.isLoadingRanking = false;
    }
}

export async function saveGlobalScore({ db, firebase, collectionName, score, topN = 3, state } = {}) {
    if (!db || !firebase || !collectionName) return;
    if (typeof score !== 'number' || score <= 0) return;

    try {
        await firebase.addDoc(firebase.collection(db, collectionName), {
            score,
            timestamp: firebase.serverTimestamp(),
            userAgent: navigator.userAgent
        });
        if (state) {
            await fetchGlobalRanking({ db, firebase, collectionName, topN, state });
        }
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

export function getRanking(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

export function fillRoundRect(ctx, x, y, width, height, radius = 0) {
    if (!ctx) return;
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, r);
    } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    ctx.fill();
}

export function getCanvasPointFromEvent({ canvas, event } = {}) {
    if (!canvas || !event) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX;
    let clientY;

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
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

export function createLangState({
    translations,
    storageKey = 'sushicious_lang',
    defaultLang = 'en',
    navigatorLang = (typeof navigator !== 'undefined' ? navigator.language : '')
} = {}) {
    let currentLang = localStorage.getItem(storageKey) || (navigatorLang?.startsWith('ja') ? 'ja' : defaultLang);

    const t = (key) => translations?.[currentLang]?.[key] ?? translations?.[defaultLang]?.[key] ?? key;
    const sync = () => {
        const portalLang = localStorage.getItem(storageKey);
        if (portalLang && portalLang !== currentLang) currentLang = portalLang;
        return currentLang;
    };
    const getLang = () => currentLang;

    return { t, sync, getLang };
}

export function createParentGameStateNotifier({
    parent = (typeof window !== 'undefined' ? window.parent : null),
    targetOrigin = '*',
    getMessage = (gameState) => (gameState === 'playing' ? 'gameState:playing' : 'gameState:not_playing')
} = {}) {
    let lastMessage = '';
    return (gameState) => {
        const message = getMessage(gameState);
        if (message === lastMessage) return;
        if (parent && typeof parent.postMessage === 'function') parent.postMessage(message, targetOrigin);
        lastMessage = message;
    };
}

export function saveRanking({
    key,
    score,
    maxEntries = 3,
    dailyKey,
    dateKeySuffix = '_date',
    includeTimestamp = false,
    getRanking: getRankingFn = getRanking,
    now = Date.now,
    getToday = () => new Date().toLocaleDateString(),
    onSave
} = {}) {
    if (!key) return [];
    if (typeof score !== 'number') return getRankingFn(key);

    let ranking = getRankingFn(key);
    const today = getToday();

    if (dailyKey && key === dailyKey) {
        const lastDate = localStorage.getItem(key + dateKeySuffix);
        if (lastDate !== today) {
            ranking = [];
            localStorage.setItem(key + dateKeySuffix, today);
        }
    }

    const entry = { score, date: today };
    if (includeTimestamp) entry.timestamp = now();
    ranking.push(entry);

    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, maxEntries);
    localStorage.setItem(key, JSON.stringify(ranking));

    if (typeof onSave === 'function') onSave({ key, score, ranking, today });
    return ranking;
}

export function resizeCanvas({ canvas, maxAspectRatio = 9 / 16 } = {}) {
    if (!canvas) return { canvasWidth: 0, canvasHeight: 0 };
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;

    let canvasWidth = viewWidth;
    let canvasHeight = viewHeight;

    if (viewWidth / viewHeight > maxAspectRatio) {
        canvasWidth = Math.floor(viewHeight * maxAspectRatio);
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';

    return { canvasWidth, canvasHeight };
}

export function drawRankList({ ctx, t, canvasWidth, title, list, yStart, isGlobal = false, isLoadingRanking = false } = {}) {
    if (!ctx) return;
    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth / 2, yStart);

    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.font = 'bold 18px monospace';
    if (isGlobal && isLoadingRanking && list.length === 0) {
        ctx.fillStyle = '#999';
        ctx.fillText(translate('loading'), canvasWidth / 2, yStart + 35);
        return;
    }
    if (list.length === 0) {
        ctx.fillStyle = '#666';
        ctx.fillText('-', canvasWidth / 2, yStart + 35);
        return;
    }

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        ctx.fillStyle = i === 0 ? '#ffd700' : (i === 1 ? '#e0e0e0' : (i === 2 ? '#cd7f32' : '#ffffff'));
        ctx.fillText(`${i + 1}. ${item.score} ${translate('pts')}`, canvasWidth / 2, yStart + 35 + (i * 28));
    }
}

export function drawStartScreen({ ctx, canvasWidth, canvasHeight, t, globalRanking = [], isLoadingRanking = false, subtitleText, sections } = {}) {
    if (!ctx) return;

    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.fillStyle = '#ff3e3e';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(translate('game_title'), canvasWidth / 2, canvasHeight * 0.15);

    if (subtitleText) {
        ctx.fillStyle = '#f0f0f0';
        ctx.font = '22px sans-serif';
        ctx.fillText(subtitleText, canvasWidth / 2, canvasHeight * 0.23);
    }

    if (Array.isArray(sections) && sections.length > 0) {
        for (const section of sections) {
            if (!section) continue;
            drawRankList({
                ctx,
                t: translate,
                canvasWidth,
                title: section.title,
                list: section.list || [],
                yStart: section.yStart,
                isGlobal: Boolean(section.isGlobal),
                isLoadingRanking: Boolean(section.isLoadingRanking)
            });
        }
    } else {
        drawRankList({
            ctx,
            t: translate,
            canvasWidth,
            title: translate('community_top'),
            list: globalRanking,
            yStart: canvasHeight * 0.35,
            isGlobal: true,
            isLoadingRanking
        });
    }

    ctx.fillStyle = `rgba(240, 240, 240, ${0.7 + Math.sin(Date.now() / 300) * 0.3})`;
    ctx.font = '22px sans-serif';
    ctx.fillText(translate('tap_to_start'), canvasWidth / 2, canvasHeight * 0.85);
}

export function drawGameScreen({ ctx, canvasWidth, canvasHeight, t, score, drawPlayfield, showDefaultScore = true, backgroundColor = '#121212' } = {}) {
    if (!ctx) return;
    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (typeof drawPlayfield === 'function') {
        drawPlayfield({ ctx, canvasWidth, canvasHeight });
    }

    if (!showDefaultScore) return;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${translate('score')}: ${score}`, 15, 45);
}

export function drawGameOverScreen({
    ctx,
    canvasWidth,
    canvasHeight,
    t,
    score,
    storageKeyAllTime,
    storageKeyDaily,
    getRanking: getRankingFn = getRanking,
    showScore = true,
    sections
} = {}) {
    if (!ctx) return;
    const translate = typeof t === 'function' ? t : (key) => key;

    ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(translate('game_over'), canvasWidth / 2, canvasHeight * 0.15);

    if (showScore) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText(score, canvasWidth / 2, canvasHeight * 0.28);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(translate('score').toUpperCase(), canvasWidth / 2, canvasHeight * 0.33);
    }

    if (Array.isArray(sections) && sections.length > 0) {
        for (const section of sections) {
            if (!section) continue;
            drawRankList({
                ctx,
                t: translate,
                canvasWidth,
                title: section.title,
                list: section.list || [],
                yStart: section.yStart,
                isGlobal: Boolean(section.isGlobal),
                isLoadingRanking: Boolean(section.isLoadingRanking)
            });
        }
    } else {
        const allTime = storageKeyAllTime ? getRankingFn(storageKeyAllTime) : [];
        const daily = storageKeyDaily ? getRankingFn(storageKeyDaily) : [];

        drawRankList({
            ctx,
            t: translate,
            canvasWidth,
            title: translate('all_time_top'),
            list: allTime,
            yStart: canvasHeight * 0.45
        });
        drawRankList({
            ctx,
            t: translate,
            canvasWidth,
            title: translate('today_top'),
            list: daily,
            yStart: canvasHeight * 0.70
        });
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(translate('tap_to_retry'), canvasWidth / 2, canvasHeight * 0.92);
}
