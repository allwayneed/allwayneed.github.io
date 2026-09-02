// ─── Board page (板内スレッド一覧) ───

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

const params = new URLSearchParams(window.location.search);
const genre = params.get("genre") || "general";
const info = GENRE_INFO[genre] || { icon: "📋", label: genre };

document.getElementById("board-title").textContent = `${info.icon} ${info.label}`;
document.title = `${info.label} - 匿名スレッド`;

async function loadThreads() {
  const listEl = document.getElementById("thread-list");
  listEl.innerHTML = '<p class="loading">スレッドを掘削中... ⛏️</p>';

  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const data = await res.json();
    const allRooms = data.rooms || [];

    let threads = allRooms.filter((r) => (r.genre || "general") === genre);

    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    if (searchTerm) {
      threads = threads.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm) ||
          (r.hashtags || []).some((t) => t.toLowerCase().includes(searchTerm)) ||
          (r.description || "").toLowerCase().includes(searchTerm)
      );
    }

    if (threads.length === 0) {
      listEl.innerHTML = `
        <p class="empty">この板にはまだスレッドがない... 🌱<br>
        <a href="/create/?genre=${encodeURIComponent(genre)}">最初のスレッドを立てる</a></p>
      `;
      return;
    }

    listEl.innerHTML = threads
      .map((room) => {
        const tags = (room.hashtags || [])
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join("");
        const visibilityBadge = room.visibility === "private"
          ? `<span class="room-genre private">🔒 Private</span>`
          : "";
        const href = room.visibility === "private" ? "/join/" : `/chat/${room.uuid}/`;
        const msgCount = messageCount(room);

        return `
          <a href="${href}" class="room-card" data-uuid="${room.uuid}">
            <div class="room-name">${escapeHtml(room.name)}</div>
            ${visibilityBadge}
            <div class="room-tags">${tags}</div>
            <div class="room-desc">${escapeHtml(room.description || "")}</div>
            <div class="room-meta">
              <span>🔗 <code>/chat/${room.uuid}/</code></span>
              <span>📅 ${formatDate(room.created_at)}</span>
              ${msgCount > 0 ? `<span>💬 ${msgCount} 件</span>` : `<span>📭 新規</span>`}
            </div>
          </a>
        `;
      })
      .join("");
  } catch (err) {
    listEl.innerHTML = `<p class="empty">サーバーと通信できない... 📡<br>${escapeHtml(String(err))}</p>`;
  }
}

document.getElementById("search-input").addEventListener("input", loadThreads);

loadThreads();
initTagline();
initFooterWisdom();
