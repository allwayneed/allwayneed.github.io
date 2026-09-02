// ─── Chat Room App ───
const API_BASE = "https://my-api.allwayneed.workers.dev";

let currentRoom = null;
let currentInviteCode = null;
let pollTimer = null;

// ─── Navigation ───
const pages = ["home", "create", "join", "chat"];
const navMap = { "nav-home": "home", "nav-create": "create", "nav-join": "join" };

function showPage(pageName) {
  pages.forEach((p) => {
    document.getElementById(`page-${p}`).classList.toggle("active", p === pageName);
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", navMap[btn.id] === pageName);
  });
  if (pageName === "home") loadRooms();
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (navMap[btn.id]) showPage(navMap[btn.id]);
  });
});

document.getElementById("back-btn").addEventListener("click", () => {
  if (pollTimer) clearInterval(pollTimer);
  showPage("home");
});

// ─── Room List ───
async function loadRooms() {
  const listEl = document.getElementById("room-list");
  listEl.innerHTML = '<p class="loading">読み込み中...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const data = await res.json();
    const allRooms = data.rooms || [];

    // フィルター適用
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
      listEl.innerHTML = '<p class="empty">ルームがありません。「ルーム作成」から作ってみよう！</p>';
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
        return `
          <div class="room-card" data-uuid="${room.uuid}" data-visibility="${room.visibility}">
            <div class="room-name">${escapeHtml(room.name)}</div>
            ${visibilityBadge}
            <div class="room-tags">${tags}</div>
            <div class="room-desc">${escapeHtml(room.description || "")}</div>
            <div class="room-meta">
              <span>💬 ${room.messages ? 0 : 0} messages</span>
              <span>📅 ${formatDate(room.created_at)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    // クリックでルームを開く
    document.querySelectorAll(".room-card").forEach((card) => {
      card.addEventListener("click", () => {
        const uuid = card.dataset.uuid;
        const isPrivate = card.dataset.visibility === "private";
        if (isPrivate) {
          const code = prompt("プライベートルームです。招待コードを入力してください:");
          if (code) openRoom(uuid, code.toUpperCase());
        } else {
          openRoom(uuid);
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p class="empty">エラーが発生しました: ${escapeHtml(String(err))}</p>`;
  }
}

document.getElementById("search-input").addEventListener("input", loadRooms);
document.getElementById("genre-filter").addEventListener("change", loadRooms);

// ─── Open Chat Room ───
async function openRoom(uuid, inviteCode = null) {
  currentRoom = uuid;
  currentInviteCode = inviteCode;

  let url = `${API_BASE}/api/rooms/${uuid}`;
  if (inviteCode) url += `?code=${encodeURIComponent(inviteCode)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "ルームにアクセスできません");
      return;
    }

    const room = data.room;
    document.getElementById("chat-title").textContent = room.name;
    const metaParts = [
      `<span class="tag">${escapeHtml(room.genre)}</span>`,
      ...(room.hashtags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`),
      room.visibility === "private" ? '<span style="color: var(--danger);">🔒 Private</span>' : "",
    ].filter(Boolean);
    document.getElementById("chat-meta").innerHTML = metaParts.join(" ");

    renderMessages(room.messages || []);
    showPage("chat");

    // ポーリング開始（5秒ごと）
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => pollMessages(uuid, inviteCode), 5000);
  } catch (err) {
    alert("エラー: " + err);
  }
}

function renderMessages(messages) {
  const el = document.getElementById("chat-messages");
  if (!messages || messages.length === 0) {
    el.innerHTML = '<p class="empty">メッセージがありません。最初のメッセージを送ろう！</p>';
    return;
  }
  el.innerHTML = messages
    .map(
      (m) => `
      <div class="message">
        <div class="msg-name">${escapeHtml(m.name)}</div>
        <div class="msg-content">${escapeHtml(m.content)}</div>
        <div class="msg-time">${formatTime(m.timestamp)}</div>
      </div>
    `
    )
    .join("");
  el.scrollTop = el.scrollHeight;
}

async function pollMessages(uuid, inviteCode) {
  let url = `${API_BASE}/api/rooms/${uuid}`;
  if (inviteCode) url += `?code=${encodeURIComponent(inviteCode)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.room) {
      renderMessages(data.room.messages || []);
    }
  } catch (err) {
    // silent fail
  }
}

// ─── Send Message ───
document.getElementById("chat-send").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const name = document.getElementById("chat-name").value.trim() || "anonymous";
  const content = document.getElementById("chat-input").value.trim();
  if (!content) return;

  const btn = document.getElementById("chat-send");
  btn.disabled = true;

  let url = `${API_BASE}/api/rooms/${currentRoom}/message`;
  if (currentInviteCode) url += `?code=${encodeURIComponent(currentInviteCode)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("chat-input").value = "";
      renderMessages(data.room.messages || []);
    } else {
      alert(data.error || "送信に失敗しました");
    }
  } catch (err) {
    alert("エラー: " + err);
  } finally {
    btn.disabled = false;
  }
}

// ─── Create Room ───
document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("room-name").value.trim();
  const genre = document.getElementById("room-genre").value;
  const hashtagsRaw = document.getElementById("room-hashtags").value.trim();
  const description = document.getElementById("room-description").value.trim();
  const isPrivate = document.getElementById("room-private").checked;

  const hashtags = hashtagsRaw
    ? hashtagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  try {
    const res = await fetch(`${API_BASE}/api/create/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        genre,
        hashtags,
        description,
        visibility: isPrivate ? "private" : "public",
      }),
    });
    const data = await res.json();

    if (res.ok) {
      const resultEl = document.getElementById("create-result");
      resultEl.classList.remove("hidden");

      if (isPrivate && data.room.inviteCode) {
        resultEl.innerHTML = `
          <p>✅ ルーム「${escapeHtml(data.room.name)}」を作成しました！</p>
          <p class="hint">招待コード（参加者に共有してください）:</p>
          <div class="invite-code">${escapeHtml(data.room.inviteCode)}</div>
          <button class="copy-btn" onclick="copyToClipboard('${data.room.inviteCode}')">📋 コードをコピー</button>
          <p class="hint" style="margin-top:8px;">UUID: <code>${data.room.uuid}</code></p>
        `;
      } else {
        resultEl.innerHTML = `
          <p>✅ ルーム「${escapeHtml(data.room.name)}」を作成しました！</p>
          <p class="hint">UUID: <code>${data.room.uuid}</code></p>
        `;
      }

      // フォームリセット
      document.getElementById("create-form").reset();
    } else {
      alert(data.error || "作成に失敗しました");
    }
  } catch (err) {
    alert("エラー: " + err);
  }
});

// ─── Join via Invite Code ───
document.getElementById("join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  if (!code) return;

  // すべてのルーム（private含む）を取得してコードと照合
  try {
    const res = await fetch(`${API_BASE}/api/rooms?all=true`);
    const data = await res.json();
    const rooms = data.rooms || [];

    // 招待コードでルームを探す — ただしAPIはコードを隠すので、
    // 別アプローチ: 各プライベートルームにコードでアクセス試行
    // 効率的ではないが、簡易実装として全ルームに試行
    let found = null;
    for (const room of rooms) {
      if (room.visibility !== "private") continue;
      const tryRes = await fetch(`${API_BASE}/api/rooms/${room.uuid}?code=${encodeURIComponent(code)}`);
      if (tryRes.ok) {
        found = room;
        break;
      }
    }

    const resultEl = document.getElementById("join-result");

    if (found) {
      resultEl.classList.remove("hidden");
      resultEl.innerHTML = `
        <p>✅ ルーム「${escapeHtml(found.name)}」にアクセスできます！</p>
        <button class="btn-primary" onclick="openRoom('${found.uuid}', '${code}')">ルームを開く</button>
      `;
    } else {
      resultEl.classList.remove("hidden");
      resultEl.innerHTML = `<p style="color: var(--danger);">❌ 招待コードに一致するルームが見つかりませんでした。</p>`;
    }
  } catch (err) {
    alert("エラー: " + err);
  }
});

// ─── Helpers ───
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("コピーしました: " + text);
  });
}

// ─── Init ───
loadRooms();
