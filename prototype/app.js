'use strict';

const STORAGE_KEY = 'taskboard-prototype-v1';

// ---------- データ ----------
function today(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function sampleData() {
  return {
    nextId: 100,
    columns: [
      { id: 'c1', name: '未着手' },
      { id: 'c2', name: '進行中' },
      { id: 'c3', name: '完了' },
    ],
    cards: [
      { id: 'k1', colId: 'c1', title: '要件定義書をレビューする', desc: '', priority: '高', due: today(-2) },
      { id: 'k2', colId: 'c1', title: '画面イメージを確認する', desc: 'プロトタイプを触ってもらう', priority: '中', due: today(3) },
      { id: 'k3', colId: 'c2', title: 'データベース設計を考える', desc: '', priority: '中', due: '' },
      { id: 'k4', colId: 'c3', title: 'リポジトリを作成する', desc: '', priority: '低', due: today(-7) },
    ],
  };
}

let state = load();
const filter = { text: '', priority: 'all' };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 読み込み失敗時はサンプルにする */ }
  return sampleData();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    showError('保存できませんでした');
  }
}

function newId(prefix) {
  state.nextId += 1;
  return prefix + state.nextId;
}

// ---------- エラー表示 ----------
const errorArea = document.getElementById('errorArea');
let errorTimer;
function showError(message) {
  errorArea.textContent = message;
  errorArea.hidden = false;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => { errorArea.hidden = true; }, 4000);
}

// ---------- 描画 ----------
const board = document.getElementById('board');
const noResult = document.getElementById('noResult');

function matches(card) {
  const textOk = card.title.toLowerCase().includes(filter.text.trim().toLowerCase());
  const priOk = filter.priority === 'all' || card.priority === filter.priority;
  return textOk && priOk;
}

// 列ごとの表示用の並び替え(保存されている順番は変えない)
const PRIORITY_RANK = { '高': 0, '中': 1, '低': 2 };
function sortCards(cards, sort) {
  if (sort === 'priority') {
    return [...cards].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }
  if (sort === 'due') {
    // 期限なしは最後。同じ期限は元の順番を保つ
    return [...cards].sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'));
  }
  return cards;
}

function isOverdue(card) {
  return card.due && card.due < today(0);
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function render() {
  board.replaceChildren();
  const filtering = filter.text.trim() !== '' || filter.priority !== 'all';
  let visibleTotal = 0;

  state.columns.forEach((col) => {
    const colEl = el('section', 'column');
    colEl.dataset.colId = col.id;

    const cards = sortCards(state.cards.filter((c) => c.colId === col.id && matches(c)), col.sort);
    visibleTotal += cards.length;

    const head = el('div', 'column-head');
    head.append(el('h2', 'column-name', col.name), el('span', 'column-count', String(cards.length)));
    const rename = el('button', 'icon-btn', '✎');
    rename.title = '列名を変更';
    rename.addEventListener('click', () => openColDialog(col));
    const del = el('button', 'icon-btn', '🗑');
    del.title = '列を削除';
    del.addEventListener('click', () => confirmDeleteColumn(col));
    head.append(rename, del);

    // 並び順のボタン(この列だけに効く)
    const sortSel = el('div', 'column-sort');
    sortSel.setAttribute('role', 'group');
    sortSel.setAttribute('aria-label', col.name + 'の並び順');
    [
      ['manual', '手動', 'ドラッグで決めた順番'],
      ['priority', '優先度順', '優先度が高い順(高→中→低)'],
      ['due', '期限順', '期限が近い順(期限なしは最後)'],
    ].forEach(([value, label, tip]) => {
      const active = (col.sort || 'manual') === value;
      const b = el('button', 'sort-btn' + (active ? ' active' : ''), label);
      b.type = 'button';
      b.title = tip;
      b.setAttribute('aria-pressed', String(active));
      b.addEventListener('click', () => {
        col.sort = value;
        save();
        render();
      });
      sortSel.append(b);
    });

    const list = el('div', 'card-list');
    list.dataset.colId = col.id;
    if (cards.length === 0 && !filtering) list.append(el('div', 'empty-text', 'カードがありません'));
    cards.forEach((card) => list.append(renderCard(card)));
    setupDropZone(list, col);

    const add = el('button', 'add-card', '＋カードを追加');
    add.addEventListener('click', () => openCardDialog(null, col.id));

    colEl.append(head, sortSel, list, add);
    board.append(colEl);
  });

  const addCol = el('button', 'add-col', '＋列を追加');
  addCol.addEventListener('click', () => openColDialog(null));
  board.append(addCol);

  noResult.hidden = !(filtering && visibleTotal === 0);
}

function renderCard(card) {
  const c = el('article', 'card');
  c.draggable = true;
  c.dataset.cardId = card.id;
  c.append(el('div', 'card-title', card.title));

  const meta = el('div', 'card-meta');
  meta.append(el('span', 'badge ' + card.priority, card.priority));
  if (card.due) {
    const due = el('span', 'due' + (isOverdue(card) ? ' overdue' : ''), '期限 ' + card.due + (isOverdue(card) ? '(期限切れ)' : ''));
    meta.append(due);
  }
  meta.append(el('span', 'spacer'));
  const del = el('button', 'icon-btn', '🗑');
  del.title = 'カードを削除';
  del.addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteCard(card); });
  meta.append(del);
  c.append(meta);

  c.addEventListener('click', () => openCardDialog(card, card.colId));

  c.addEventListener('dragstart', (e) => {
    dragId = card.id;
    c.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  });
  c.addEventListener('dragend', () => {
    dragId = null;
    clearDropMarks();
    c.classList.remove('dragging');
  });
  return c;
}

// ---------- ドラッグ&ドロップ ----------
let dragId = null;

function clearDropMarks() {
  document.querySelectorAll('.drop-before, .drop-after, .drag-over').forEach((n) => {
    n.classList.remove('drop-before', 'drop-after', 'drag-over');
  });
}

// マウス位置から「どのカードの前に入れるか」(なければ末尾)を決める
function findDropTarget(list, y) {
  const cardEls = [...list.querySelectorAll('.card:not(.dragging)')];
  for (const ce of cardEls) {
    const r = ce.getBoundingClientRect();
    if (y < r.top + r.height / 2) return { before: ce, last: cardEls[cardEls.length - 1] };
  }
  return { before: null, last: cardEls[cardEls.length - 1] };
}

function setupDropZone(list, col) {
  const manual = !col.sort || col.sort === 'manual';
  list.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault();
    clearDropMarks();
    list.classList.add('drag-over');
    if (!manual) return; // 自動並び替え中の列では、挿入位置を示さない
    const { before, last } = findDropTarget(list, e.clientY);
    if (before) before.classList.add('drop-before');
    else if (last) last.classList.add('drop-after');
  });
  list.addEventListener('dragleave', (e) => {
    if (!list.contains(e.relatedTarget)) list.classList.remove('drag-over');
  });
  list.addEventListener('drop', (e) => {
    if (!dragId) return;
    e.preventDefault();
    // 自動並び替え中の列では、列への移動だけ行う(列内の位置は並び順で決まる)
    const before = manual ? findDropTarget(list, e.clientY).before : null;
    moveCard(dragId, list.dataset.colId, before ? before.dataset.cardId : null);
    dragId = null;
    clearDropMarks();
  });
}

// beforeId のカードの直前に入れる(null なら、その列の末尾)
function moveCard(cardId, colId, beforeId) {
  const idx = state.cards.findIndex((c) => c.id === cardId);
  const [card] = state.cards.splice(idx, 1);
  card.colId = colId;
  if (beforeId) {
    state.cards.splice(state.cards.findIndex((c) => c.id === beforeId), 0, card);
  } else {
    let lastIdx = -1;
    state.cards.forEach((c, i) => { if (c.colId === colId) lastIdx = i; });
    state.cards.splice(lastIdx + 1, 0, card);
  }
  save();
  render();
}

// ---------- カード入力ダイアログ ----------
const cardDialog = document.getElementById('cardDialog');
const cardForm = document.getElementById('cardForm');
const cardTitle = document.getElementById('cardTitle');
const cardTitleError = document.getElementById('cardTitleError');
let editing = null; // { card|null, colId }

function openCardDialog(card, colId) {
  editing = { card, colId };
  document.getElementById('cardDialogTitle').textContent = card ? 'カードを編集' : 'カードを追加';
  cardTitle.value = card ? card.title : '';
  document.getElementById('cardDesc').value = card ? card.desc : '';
  document.getElementById('cardPriority').value = card ? card.priority : '中';
  document.getElementById('cardDue').value = card ? card.due : '';
  cardTitleError.hidden = true;
  cardDialog.showModal();
  cardTitle.focus();
}

cardForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = cardTitle.value.trim();
  if (title === '') { cardTitleError.hidden = false; return; }
  const values = {
    title,
    desc: document.getElementById('cardDesc').value,
    priority: document.getElementById('cardPriority').value,
    due: document.getElementById('cardDue').value,
  };
  if (editing.card) {
    Object.assign(editing.card, values);
  } else {
    // 追加した列の末尾に入れる
    state.cards.push({ id: newId('k'), colId: editing.colId, ...values });
  }
  save();
  cardDialog.close();
  render();
});
document.getElementById('cardCancel').addEventListener('click', () => cardDialog.close());

// ---------- 列名ダイアログ ----------
const colDialog = document.getElementById('colDialog');
const colName = document.getElementById('colName');
const colNameError = document.getElementById('colNameError');
let editingCol = null;

function openColDialog(col) {
  editingCol = col;
  document.getElementById('colDialogTitle').textContent = col ? '列名を変更' : '列を追加';
  colName.value = col ? col.name : '';
  colNameError.hidden = true;
  colDialog.showModal();
  colName.focus();
}

document.getElementById('colForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = colName.value.trim();
  if (name === '') { colNameError.hidden = false; return; }
  if (editingCol) editingCol.name = name;
  else state.columns.push({ id: newId('c'), name });
  save();
  colDialog.close();
  render();
});
document.getElementById('colCancel').addEventListener('click', () => colDialog.close());

// ---------- 削除の確認 ----------
const confirmDialog = document.getElementById('confirmDialog');
const confirmMessage = document.getElementById('confirmMessage');
let onConfirm = null;

function askDelete(message, action) {
  confirmMessage.textContent = message;
  onConfirm = action;
  confirmDialog.showModal();
}
confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue === 'ok' && onConfirm) onConfirm();
  onConfirm = null;
  confirmDialog.returnValue = '';
});

function confirmDeleteCard(card) {
  askDelete('「' + card.title + '」を削除します。よろしいですか?', () => {
    state.cards = state.cards.filter((c) => c.id !== card.id);
    save();
    render();
  });
}

function confirmDeleteColumn(col) {
  askDelete('列「' + col.name + '」を削除します。列内のカードも削除されます。よろしいですか?', () => {
    state.columns = state.columns.filter((c) => c.id !== col.id);
    state.cards = state.cards.filter((c) => c.colId !== col.id);
    save();
    render();
  });
}

// ---------- 検索・絞り込み・その他 ----------
document.getElementById('search').addEventListener('input', (e) => {
  filter.text = e.target.value;
  render();
});
document.getElementById('priorityFilter').addEventListener('change', (e) => {
  filter.priority = e.target.value;
  render();
});
document.getElementById('demoError').addEventListener('click', () => showError('保存できませんでした'));
document.getElementById('reset').addEventListener('click', () => {
  state = sampleData();
  save();
  render();
});

render();
