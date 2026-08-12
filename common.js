<!--
// ==========================================
// 共通初期化・LINE LIFF認証管理 (common.js)
// 更新日時: 2026/08/12 19:49
// ==========================================
-->

async function initCommonApp() {
  try {
    await loadNavbar();

    const urlParams = new URLSearchParams(window.location.search);
    let lineUserId = urlParams.get("lineUserId");
    let lineDisplayName = "LINEユーザー";

    if (!lineUserId && typeof CONFIG !== 'undefined' && CONFIG.LIFF_ID && typeof liff !== 'undefined') {
      try {
        await liff.init({ liffId: CONFIG.LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          lineUserId = profile.userId;
          lineDisplayName = profile.displayName || "LINEユーザー";
        } else {
          liff.login();
          return null;
        }
      } catch (liffErr) {
        console.warn("LIFF初期化エラー（ブラウザ直接アクセスの可能性）:", liffErr);
      }
    }

    if (!lineUserId) {
      updateNavigationUI("未登録", "ゲスト");
      return null;
    }

    showLoading(true);

    const url = `${CONFIG.GAS_WEB_APP_URL}?action=checkStatus&lineUserId=${encodeURIComponent(lineUserId)}`;
    const response = await fetch(url);
    const text = await response.text();
    const result = JSON.parse(text);

    showLoading(false);

    let memberName = lineDisplayName;
    let roleDisplay = "未登録";

    if (result.status === "success" && result.registered) {
      memberName = result.memberName || lineDisplayName;
      const approvalStatus = result.approvalStatus || "未登録";

      if (approvalStatus === "承認済") {
        roleDisplay = result.role || "閲覧者";
      } else if (approvalStatus === "申請中" || approvalStatus === "承認待ち") {
        roleDisplay = "承認待ち";
      } else {
        roleDisplay = approvalStatus;
      }

      localStorage.setItem('lineUserId', lineUserId);
      localStorage.setItem('memberName', memberName);
      localStorage.setItem('role', roleDisplay);
      localStorage.setItem('approvalStatus', approvalStatus);
    }

    // 共通関数として定義されたUI更新を実行
    updateNavigationUI(roleDisplay, memberName);

    return lineUserId;

  } catch (err) {
    console.error("共通初期化エラー:", err);
    showLoading(false);
    updateNavigationUI("未登録", "エラー");
    return null;
  }
}

/**
 * ナビゲーションバーのUI（ユーザー名・権限バッジ・管理メニュー）を更新する関数
 */
function updateNavigationUI(currentRole, memberName) {
  const roleStr = String(currentRole || "").trim();
  const nameStr = String(memberName || "").trim();

  const nameEl = document.getElementById("nav-member-name");
  const roleEl = document.getElementById("nav-role");
  if (nameEl) nameEl.textContent = nameStr || "ユーザー";
  
  if (roleEl) {
    roleEl.textContent = roleStr || "閲覧者";
    roleEl.className = "badge ms-2";
    switch (roleStr) {
      case "システム管理者": roleEl.classList.add("bg-danger"); break;
      case "運用管理者": roleEl.classList.add("bg-warning", "text-dark"); break;
      case "世帯管理者": roleEl.classList.add("bg-primary"); break;
      case "予定回答者": roleEl.classList.add("bg-success"); break;
      default: roleEl.classList.add("bg-secondary"); break;
    }
  }

  const adminMenu = document.getElementById("nav-admin-menu");
  const userMaintItem = document.getElementById("menu-item-user-maintenance");

  if (!adminMenu) return;

  const isGlobalAdmin = ["システム管理者", "運用管理者"].includes(roleStr);
  const isHouseholdAdmin = (roleStr === "世帯管理者");

  if (isGlobalAdmin || isHouseholdAdmin) {
    adminMenu.classList.remove("d-none");
    if (userMaintItem) {
      if (isGlobalAdmin) userMaintItem.classList.remove("d-none");
      else userMaintItem.classList.add("d-none");
    }
  } else {
    adminMenu.classList.add("d-none");
  }
}

async function loadNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  try {
    const res = await fetch('navbar.html');
    if (!res.ok) return;
    const navbarHtml = await res.text();
    container.innerHTML = navbarHtml;

    const togglerBtn = document.getElementById('nav-toggler-btn');
    const navbarCollapse = document.getElementById('navbarNav');

    if (togglerBtn && navbarCollapse) {
      const newTogglerBtn = togglerBtn.cloneNode(true);
      togglerBtn.parentNode.replaceChild(newTogglerBtn, togglerBtn);

      newTogglerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        navbarCollapse.style.removeProperty('height');
        navbarCollapse.style.removeProperty('overflow');

        const isExpanded = navbarCollapse.classList.contains('show');
        if (isExpanded) {
          navbarCollapse.classList.remove('show');
        } else {
          navbarCollapse.classList.add('show');
        }
      });
    }
  } catch (err) {
    console.error("navbar.html の読み込みに失敗しました:", err);
  }
}

function showLoading(show) {
  let overlay = document.getElementById('common-loading-overlay');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'common-loading-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 255, 255, 0.7); z-index: 9999;
        display: flex; justify-content: center; align-items: center;
        font-weight: bold; color: #333;
      `;
      overlay.innerHTML = `<div><div class="spinner-border text-primary me-2" role="status"></div>データ読み込み中...</div>`;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  } else {
    if (overlay) overlay.style.display = 'none';
  }
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
