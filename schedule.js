let currentLineUserId = "";

document.addEventListener("DOMContentLoaded", async () => {
  initDateInputs();

  currentLineUserId = await initCommonApp();
  if (!currentLineUserId) return;

  loadEventsWithFilter();
});

function initDateInputs() {
  const today = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startEl = document.getElementById("filterStartDate");
  const endEl = document.getElementById("filterEndDate");

  if (startEl && !startEl.value) startEl.value = formatDate(today);
  if (endEl && !endEl.value) endEl.value = formatDate(oneMonthLater);
}

async function loadEventsWithFilter() {
  const startDate = document.getElementById("filterStartDate").value;
  const endDate = document.getElementById("filterEndDate").value;
  const container = document.getElementById("events-container");

  container.innerHTML = `<p class="text-muted">読み込み中...</p>`;

  try {
    let url = `${CONFIG.GAS_WEB_APP_URL}?action=getEvents`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.status === "success") {
      renderEvents(result.events);
    } else {
      container.innerHTML = `<p class="text-danger">スケジュールの取得に失敗しました: ${escapeHTML(result.message)}</p>`;
    }
  } catch (err) {
    console.error("スケジュール取得エラー:", err);
    container.innerHTML = `<p class="text-danger">通信エラーが発生しました。</p>`;
  }
}

function renderEvents(events) {
  const container = document.getElementById("events-container");
  if (!events || events.length === 0) {
    container.innerHTML = `<p class="text-muted">指定された期間のスケジュールはありません。</p>`;
    return;
  }

  let html = `<div class="list-group">`;
  events.forEach(ev => {
    html += `
      <div class="list-group-item list-group-item-action mb-2 rounded shadow-sm">
        <h6 class="fw-bold text-primary mb-1">${escapeHTML(ev.eventTitle)}</h6>
        <p class="mb-1 small text-muted">日時: ${escapeHTML(ev.startDateTime)} 〜 ${escapeHTML(ev.endDateTime)}</p>
        <p class="mb-0 small">場所: ${escapeHTML(ev.location || '未設定')} | カテゴリ: ${escapeHTML(ev.eventCategory || '未設定')}</p>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function showAppMessage(message, type = "error") {
  const msgBox = document.getElementById("app-message-box");
  if (!msgBox) return;

  msgBox.innerHTML = `<span>${escapeHTML(message)}</span>`;
  msgBox.classList.remove("d-none");
  msgBox.className = type === "success" 
    ? "mb-3 p-3 rounded small alert alert-success"
    : "mb-3 p-3 rounded small alert alert-danger";
}
