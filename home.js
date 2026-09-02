// ─── Board list page (板一覧) ───

const GENRE_INFO = {
  general: { icon: "💬", label: "雑談" },
  tech:    { icon: "💻", label: "テック" },
  game:   { icon: "🎮", label: "ゲーム" },
  music:  { icon: "🎵", label: "音楽" },
  art:    { icon: "🎨", label: "アート" },
  study:  { icon: "📚", label: "勉強" },
  hobby:  { icon: "🌿", label: "趣味" },
  other:  { icon: "📦", label: "その他" },
};

async function loadBoards() {
  const el = document.getElementById("board-list");
  el.innerHTML = '<p class="loading">板を読み込み中...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const data = await res.json();
    const allRooms = data.rooms || [];

    // ジャンルごとに集計
    const byGenre = {};
    for (const room of allRooms) {
      const g = room.genre || "general";
      if (!byGenre[g]) byGenre[g] = [];
      byGenre[g].push(room);
    }

    // すべてのジャンルを表示（スレッド0でも表示）
    const allGenres = Object.keys(GENRE_INFO);
    // APIに存在するジャンルでGENRE_INFOにないものも追加
    for (const g of Object.keys(byGenre)) {
      if (!allGenres.includes(g)) allGenres.push(g);
    }

    el.innerHTML = allGenres
      .map((g) => {
        const info = GENRE_INFO[g] || { icon: "📋", label: g };
        const threads = byGenre[g] || [];
        const count = threads.length;
        const latest = threads[0]; // APIが最新順で返す前提
        const latestHtml = latest
          ? `<div class="board-latest">最新: ${escapeHtml(latest.name)}</div>`
          : `<div class="board-latest empty-latest">まだスレッドがない</div>`;

        return `
          <a href="/board/?genre=${encodeURIComponent(g)}" class="board-card">
            <div class="board-icon">${info.icon}</div>
            <div class="board-info">
              <div class="board-title">${info.label}</div>
              <div class="board-key">${escapeHtml(g)}</div>
              ${latestHtml}
              <div class="board-count">${count} スレッド</div>
            </div>
          </a>
        `;
      })
      .join("");
  } catch (err) {
    el.innerHTML = `<p class="empty">サーバーと通信できない... 📡<br>${escapeHtml(String(err))}</p>`;
  }
}

loadBoards();
initTagline();
initFooterWisdom();
