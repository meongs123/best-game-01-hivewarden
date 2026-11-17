// HIVEWARDEN — DOM overlays: title, Meadow's Fork, upgrade choice, pause,
// victory, defeat. The game canvas handles play; menus are real DOM so they
// are readable, focusable and easy to screenshot. Every screen focuses its
// first button on open (gamepad/keyboard reachable).
import { ENEMY_TYPES, BOSSES } from './levels.js';
import { UPGRADES, RELICS, MARKET_CONSUMABLES, randomUpgradeChoices, randomMarketStock } from './upgrades.js';
import { HONEY } from './config.js';

function el(id) { return document.getElementById(id); }
function show(id) { el(id).classList.remove('hidden'); }
function hide(id) { el(id).classList.add('hidden'); }
function hideAll() {
  ['title-screen', 'fork-screen', 'upgrade-screen', 'pause-screen', 'victory-screen', 'defeat-screen', 'shop-panel'].forEach(hide);
}
function focusFirst(containerId) {
  const c = el(containerId);
  const b = c && c.querySelector('button');
  if (b) b.focus();
}

export function createUI(game) {
  const ui = {
    showTitle(best) {
      hideAll();
      const b = el('best-stats');
      b.textContent = best.score > 0
        ? `Best score ${best.score.toLocaleString()} · Furthest day ${best.day}/10 · Hives saved ${best.wins}`
        : 'No hives saved yet — the meadow is waiting.';
      show('title-screen');
      focusFirst('title-screen');
    },
    showFork(state, onDone) {
      hideAll();
      const roadCards = [
        { key: 'shrine', title: '🌸 Wildflower Shrine', text: state.honey >= HONEY.shrineCost ? `Pay ${HONEY.shrineCost}🍯: heal 2 hearts and gain 4 bees.` : 'Not enough honey — the shrine still grants 1 heart, free.' },
        { key: 'quiet', title: '🌿 Quiet Meadow', text: `No toll. Gain ${HONEY.quietMeadowGift}🍯 and 2 bees, and catch your breath.` },
        { key: 'market', title: '🏪 Apiary Market', text: 'Spend honey on relics and supplies. The keeper always has something.' },
      ];
      const wrap = el('fork-cards');
      wrap.innerHTML = '';
      roadCards.forEach((r) => {
        const btn = document.createElement('button');
        btn.className = 'card';
        btn.innerHTML = `<h3>${r.title}</h3><p>${r.text}</p>`;
        btn.addEventListener('click', () => {
          if (r.key === 'market') { ui.showShop(state, onDone); return; }
          game.applyRoad(r.key);
          onDone();
        });
        wrap.appendChild(btn);
      });
      el('fork-honey').textContent = `Honey: ${Math.floor(state.honey)}🍯 · Bees: ${state.bees.list.length}/${state.bees.cap} · Hive ${Math.ceil(state.hive.hp)}/${state.hive.maxHp} · Hearts ${state.warden.hp}/${state.warden.maxHp}`;
      el('fork-day').textContent = `Day ${state.day} clear — the meadow forks ahead`;
      show('fork-screen');
      focusFirst('fork-screen');
    },
    showShop(state, onDone) {
      const stock = randomMarketStock(state.rng, state.relics);
      const panel = el('shop-panel');
      const list = el('shop-items');
      list.innerHTML = '';
      stock.forEach((item) => {
        const owned = item.key && state.relics.has(item.key);
        const btn = document.createElement('button');
        btn.className = 'card shop-item';
        btn.disabled = owned || state.honey < item.cost;
        btn.innerHTML = `<h3>${item.icon} ${item.name} — ${item.cost}🍯</h3><p>${item.desc}</p>${owned ? '<p><em>Already owned</em></p>' : ''}`;
        btn.addEventListener('click', () => {
          const ok = item.key && RELICS.some((r) => r.key === item.key)
            ? game.buyRelic(item)
            : game.buyConsumable(item);
          if (ok) { ui.showShop(state, onDone); ui.refreshShopHoney(state); }
        });
        list.appendChild(btn);
      });
      ui.refreshShopHoney(state);
      show('shop-panel');
      focusFirst('shop-panel');
      el('shop-done').onclick = () => { hide('shop-panel'); onDone(); };
    },
    refreshShopHoney(state) {
      el('shop-honey').textContent = `Honey: ${Math.floor(state.honey)}🍯`;
    },
    showUpgrade(state, onDone) {
      hideAll();
      const choices = randomUpgradeChoices(state.rng, state.upgrades, 3);
      const wrap = el('upgrade-cards');
      wrap.innerHTML = '';
      if (choices.length === 0) {
        wrap.innerHTML = '<p>Every upgrade is maxed — the swarm is at its peak.</p>';
        const btn = document.createElement('button');
        btn.className = 'card';
        btn.innerHTML = '<h3>Onward</h3><p>To the next day.</p>';
        btn.addEventListener('click', onDone);
        wrap.appendChild(btn);
      } else {
        choices.forEach((u) => {
          const owned = state.upgrades[u.key] || 0;
          const btn = document.createElement('button');
          btn.className = 'card';
          btn.innerHTML = `<h3>${u.icon} ${u.name} ${owned > 0 ? `(Lv ${owned + 1})` : ''}</h3><p>${u.desc}</p><p><em>${u.flavor}</em></p>`;
          btn.addEventListener('click', () => { game.applyUpgrade(u.key); onDone(); });
          wrap.appendChild(btn);
        });
      }
      el('upgrade-day').textContent = `Day ${state.day} done — the shepherd teaches a trick`;
      show('upgrade-screen');
      focusFirst('upgrade-screen');
    },
    showPause(onResume, onRestart, onTitle) {
      hideAll();
      show('pause-screen');
      el('pause-resume').onclick = onResume;
      el('pause-restart').onclick = onRestart;
      el('pause-title').onclick = onTitle;
      focusFirst('pause-screen');
    },
    showVictory(state, best, rank, onAgain, onTitle) {
      hideAll();
      el('victory-rank').textContent = `Rank ${rank}`;
      el('victory-rank').className = `rank rank-${rank}`;
      const s = state.stats;
      el('victory-stats').innerHTML = `
        <div>Score <b>${state.score.toLocaleString()}</b></div>
        <div>Days held <b>10/10</b></div>
        <div>Wasps banished <b>${s.banished}</b></div>
        <div>Longest chain <b>x${state.longestChain}</b></div>
        <div>Time survived <b>${fmtTime(s.timeSurvived)}</b></div>
        <div>Flowers planted <b>${s.flowersPlanted}</b></div>
        <div>Honey left <b>${Math.floor(state.honey)}🍯</b></div>
        <div>Hive HP left <b>${Math.ceil(state.hive.hp)}/${state.hive.maxHp}</b></div>`;
      el('victory-best').textContent = `Best score ${best.score.toLocaleString()} · Hives saved ${best.wins}`;
      el('victory-again').onclick = onAgain;
      el('victory-title').onclick = onTitle;
      show('victory-screen');
      focusFirst('victory-screen');
    },
    showDefeat(state, best, onRetry, onTitle) {
      hideAll();
      const s = state.stats;
      const cause = state.hive.hp <= 0 ? 'The hive has fallen silent.' : 'The warden has fallen.';
      el('defeat-cause').textContent = cause;
      el('defeat-stats').innerHTML = `
        <div>Score <b>${state.score.toLocaleString()}</b></div>
        <div>Reached day <b>${state.day}/10</b></div>
        <div>Wasps banished <b>${s.banished}</b></div>
        <div>Longest chain <b>x${state.longestChain}</b></div>
        <div>Time survived <b>${fmtTime(s.timeSurvived)}</b></div>
        <div>Flowers planted <b>${s.flowersPlanted}</b></div>`;
      el('defeat-best').textContent = `Best score ${best.score.toLocaleString()} · Furthest day ${best.day}/10`;
      el('defeat-retry').onclick = onRetry;
      el('defeat-title').onclick = onTitle;
      show('defeat-screen');
      focusFirst('defeat-screen');
    },
    hideAll,
  };
  return ui;
}

export function buildBestiary() {
  const wrap = el('bestiary');
  if (!wrap) return;
  wrap.innerHTML = '';
  const all = [
    ...Object.entries(ENEMY_TYPES).map(([key, d]) => ({ key, ...d, boss: false })),
    ...Object.entries(BOSSES).map(([key, d]) => ({ key, ...d, boss: true })),
  ];
  for (const e of all) {
    const div = document.createElement('div');
    div.className = 'beast' + (e.boss ? ' boss' : '');
    div.innerHTML = `<b>${e.name}${e.boss ? ' 👑' : ''}</b> — HP ${e.hp} · ${e.desc}<br><em>${e.flavor}</em>`;
    wrap.appendChild(div);
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
