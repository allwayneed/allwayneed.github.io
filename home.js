// ─── Thread list page (スレッド一覧) ───

async function loadRooms() {
  const listEl = document.getElementById("room-list");
  listEl.innerHTML = '<p class="loading">スレッドを掘削中... ⛏️</p>';

  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const data = await res.json();
    const allRooms = data.rooms || [];

    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const genreFilter = document.getElementById("genre-filter").value;

    let rooms = allRooms;
    if (genreFilter) rooms = rooms.filter((r) => r.genre === genreFilter);
    if (searchTerm) {
      rooms = rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm) ||
          (r.hashtags || []).some((t) => t.toLowerCase().includes(searchTerm)) ||
          (r.description || "").toLowerCase().includes(searchTerm)
      );
    }

    if (rooms.length === 0) {
      listEl.innerHTML = '<p class="empty">まだスレッドがない... 🌱<br>最初のスレッドを立ててみよう。</p>';
      return;
    }

    listEl.innerHTML = rooms
      .map((room) => {
        const tags = (room.hashtags || [])
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join("");
        const visibilityBadge = room.visibility === "private"
          ? `<span class="room-genre private">🔒 Private</span>`
          : `<span class="room-genre">${escapeHtml(room.genre)}</span>`;

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

document.getElementById("search-input").addEventListener("input", loadRooms);
document.getElementById("genre-filter").addEventListener("change", loadRooms);

loadRooms();
initTagline();
initFooterWisdom();
