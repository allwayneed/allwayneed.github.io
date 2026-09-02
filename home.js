// ─── Chat list page (チャット一覧) ───

let allRooms = [];

async function loadRooms() {
  const listEl = document.getElementById("room-list");
  listEl.innerHTML = '<p class="loading">チャットを読み込み中... 📡</p>';

  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const data = await res.json();
    allRooms = data.rooms || [];
    renderRooms();
  } catch (err) {
    listEl.innerHTML = `<p class="empty">サーバーと通信できない... 📡<br>${escapeHtml(String(err))}</p>`;
  }
}

function renderRooms() {
  const listEl = document.getElementById("room-list");
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  const genreFilter = document.getElementById("genre-filter").value;

  let rooms = allRooms;

  if (genreFilter) {
    rooms = rooms.filter((r) => (r.genre || "general") === genreFilter);
  }

  if (searchTerm) {
    rooms = rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm) ||
        (r.hashtags || []).some((t) => t.toLowerCase().includes(searchTerm)) ||
        (r.description || "").toLowerCase().includes(searchTerm)
    );
  }

  if (rooms.length === 0) {
    listEl.innerHTML = `
      <p class="empty">チャットがない... 🌱<br>
      <a href="/create/">最初のチャットを作る</a></p>
    `;
    return;
  }

  listEl.innerHTML = rooms
    .map((room) => {
      const genreInfo = GENRE_LABELS[room.genre] || room.genre || "general";
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
          <div class="room-tags"><span class="tag">${escapeHtml(genreInfo)}</span> ${visibilityBadge} ${tags}</div>
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
}

document.getElementById("search-input").addEventListener("input", renderRooms);
document.getElementById("genre-filter").addEventListener("change", renderRooms);

loadRooms();
initTagline();
initFooterWisdom();
