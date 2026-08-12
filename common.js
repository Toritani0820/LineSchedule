// ==========================================
// 共通初期化・LINE LIFF認証管理 (common.js)
// 更新日時: 2026/08/12 19:40
// ==========================================

async function initCommonApp() {
  try {
    await loadNavbar();

    const urlParams = new URLSearchParams(window.location.search);
    let lineUserId = urlParams.get("lineUserId");
    let lineDisplayName = "LINEユーザー";

    if (!lineUserId && typeof CONFIG !== 'undefined' && CONFIG.LIFF_ID && typeof liff !== 'undefined') {
      await liff.init({ liffId: CONFIG.LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login();
        return null;
      }
      const profile = await liff.getProfile();
      lineUserId = profile.userId;
      lineDisplayName = profile.displayName || "LINEユーザー";
    }

    if (!lineUserId) {
      updateNavigationUI("未登録", "ゲスト");
      return null;
    }

    showLoading(true);

    // --- ユーザー状態のキャッシュ確認 ---
    const cacheKey = `user_status_${lineUserId}`;
    let result = null;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        result = JSON.parse(cachedData);
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // キャッシュがない場合のみサーバーへ通信
    if (!result) {
      const url = `${CONFIG.GAS_WEB_APP_URL}?action=checkStatus&lineUserId=${encodeURIComponent(lineUserId)}`;
      const response = await fetch(url);
      const text = await response.text();
      
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("サーバーから不正なデータが返されました。");
      }

      if (result.status === "success") {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      }
    }

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
    } else {
      localStorage.removeItem('memberName');
      localStorage.removeItem('role');
      localStorage.removeItem('approvalStatus');
    }

    // ナビゲーション表示の統合更新
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
 * 権限変更時などにキャッシュを強制クリアするためのヘルパー関数
 */
function clearUserStatusCache(lineUserId) {
  if (lineUserId) {
    sessionStorage.removeItem(`user_status_${lineUserId}`);
  }
}

async function loadNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  try {
    const cacheKey = 'cached_navbar_html';
    let navbarHtml = sessionStorage.getItem(cacheKey);

    if (!navbarHtml) {
      const res = await fetch('navbar.html');
      if (!res.ok) return;
      navbarHtml = await res.text();
      sessionStorage.setItem(cacheKey, navbarHtml);
    }

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
