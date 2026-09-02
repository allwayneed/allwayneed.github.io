// ─── Chat Room App with SPA Routing ───
const API_BASE = "https://my-api.allwayneed.workers.dev";

let currentRoom = null;
let currentInviteCode = null;
let pollTimer = null;

// ─── SPA Routing ───
// /chat/<UUID>/ → チャットルームを開く
// /chat/<UUID>/?code=XXX → プライベートルームを開く
// / → ルーム一覧
// /create → ルーム作成
// /join → 招待コード参加

function parseRoute() {
  // 404.html リダイレクトからのパスを確認
  let path = sessionStorage.getItem('spa-redirect');
  let fromRedirect = false;
  if (path) {
    sessionStorage.removeItem('spa-redirect');
    fromRedirect = true;
  } else {
    path = window.location.pathname + window.location.search;
  }

  const cleanPath = path.split('?')[0].replace(/\/+/g, '/').replace(/\/$/, '');
  const search = path.includes('?') ? path.split('?')[1] : '';
  const params = new URLSearchParams(search);

  return { path: cleanPath, params, fromRedirect };
}

function getRouteInfo() {
  const { path, params } = parseRoute();
  const parts = path.split('/').filter(Boolean);

  // /chat/<UUID>
  if (parts.length >= 2 && parts[0] === 'chat') {
    return {
      page: 'chat',
      uuid: parts[1],
      code: params.get('code'),
    };
  }

  // /create
  if (parts[0] === 'create') return { page: 'create' };

  // /join
  if (parts[0] === 'join') return { page: 'join' };

  // /
  return { page: 'home' };
}

function buildUrl(page, uuid, code) {
  if (page === 'chat' && uuid) {
    let url = `/chat/${uuid}/`;
    if (code) url += `?code=${encodeURIComponent(code)}`;
    return url;
  } else if (page === 'create') {
    return '/create/';
  } else if (page === 'join') {
    return '/join/';
  }
  return '/';
}

function navigateTo(page, uuid = null, code = null) {
  const url = buildUrl(page, uuid, code);
  history.pushState({ page, uuid, code }, '', url);
}

function handleRoute() {
  const { path, params, fromRedirect } = parseRoute();
  const parts = path.split('/').filter(Boolean);

  let route;
  if (parts.length >= 2 && parts[0] === 'chat') {
    route = { page: 'chat', uuid: parts[1], code: params.get('code') };
  } else if (parts[0] === 'create') {
    route = { page: 'create' };
  } else if (parts[0] === 'join') {
    route = { page: 'join' };
  } else {
    route = { page: 'home' };
  }

  // 404.html からリダイレクトされた場合、URLを正しいパスに復元
  if (fromRedirect) {
    const correctUrl = buildUrl(route.page, route.uuid, route.code);
    history.replaceState(
      { page: route.page, uuid: route.uuid, code: route.code },
      '',
      correctUrl
    );
  }

  if (route.page === 'chat' && route.uuid) {
    openRoom(route.uuid, route.code);
  } else {
    showPage(route.page);
  }
}

// ブラウザの戻る/進むボタン対応
window.addEventListener('popstate', () => {
  if (pollTimer) clearInterval(pollTimer);
  handleRoute();
});

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
    const page = navMap[btn.id];
    if (!page) return;
    if (pollTimer) clearInterval(pollTimer);
    navigateTo(page);
    showPage(page);
  });
});

document.getElementById("back-btn").addEventListener("click", () => {
  if (pollTimer) clearInterval(pollTimer);
  history.back();
});

// ─── Room List ───
async function loadRooms() {
  const listEl = document.getElementById("room-list");
  listEl.innerHTML = '<p class="loading">読み込み中...</p>';

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
        const link = `/chat/${room.uuid}/`;
        return `
          <div class="room-card" data-uuid="${room.uuid}" data-visibility="${room.visibility}">
            <div class="room-name">${escapeHtml(room.name)}</div>
            ${visibilityBadge}
            <div class="room-tags">${tags}</div>
            <div class="room-desc">${escapeHtml(room.description || "")}</div>
            <div class="room-meta">
              <span>🔗 <code>${link}</code></span>
              <span>📅 ${formatDate(room.created_at)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".room-card").forEach((card) => {
      card.addEventListener("click", () => {
        const uuid = card.dataset.uuid;
        const isPrivate = card.dataset.visibility === "private";
        if (isPrivate) {
          const code = prompt("プライベートルームです。招待コードを入力してください:");
          if (code) {
            const upperCode = code.toUpperCase();
            navigateTo("chat", uuid, upperCode);
            openRoom(uuid, upperCode);
          }
        } else {
          navigateTo("chat", uuid);
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
      showPage("home");
      return;
    }

    const room = data.room;
    document.getElementById("chat-title").textContent = room.name;

    const metaParts = [
      `<span class="tag">${escapeHtml(room.genre)}</span>`,
      ...(room.hashtags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`),
      room.visibility === "private" ? '<span style="color: var(--danger);">🔒 Private</span>' : '<span style="color: var(--accent);">🌐 Public</span>',
    ];
    document.getElementById("chat-meta").innerHTML = metaParts.join(" ");

    // 共有URL表示
    let shareUrl = `${window.location.origin}/chat/${uuid}/`;
    if (inviteCode) shareUrl += `?code=${encodeURIComponent(inviteCode)}`;
    document.getElementById("chat-share").innerHTML = `
      <span class="share-box">
        🔗 <input type="text" value="${shareUrl}" readonly class="share-input" onclick="this.select()">
        <button class="copy-btn" onclick="copyToClipboard('${shareUrl}')">コピー</button>
      </span>
    `;

    renderMessages(room.messages || []);
    showPage("chat");

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

      const roomUrl = `${window.location.origin}/chat/${data.room.uuid}/`;
      let inviteUrl = roomUrl;
      if (isPrivate && data.room.inviteCode) {
        inviteUrl = `${roomUrl}?code=${data.room.inviteCode}`;
        resultEl.innerHTML = `
          <p>✅ ルーム「${escapeHtml(data.room.name)}」を作成しました！</p>
          <p class="hint">招待コード（参加者に共有してください）:</p>
          <div class="invite-code">${escapeHtml(data.room.inviteCode)}</div>
          <p class="hint" style="margin-top:12px;">🔗 共有URL:</p>
          <div class="share-row">
            <input type="text" value="${inviteUrl}" readonly class="share-input" onclick="this.select()">
            <button class="copy-btn" onclick="copyToClipboard('${inviteUrl}')">コピー</button>
          </div>
          <p class="hint" style="margin-top:8px;">UUID: <code>${data.room.uuid}</code></p>
          <button class="btn-primary" style="margin-top:12px;" onclick="navigateTo('chat', '${data.room.uuid}', '${data.room.inviteCode}'); openRoom('${data.room.uuid}', '${data.room.inviteCode}');">ルームを開く</button>
        `;
      } else {
        resultEl.innerHTML = `
          <p>✅ ルーム「${escapeHtml(data.room.name)}」を作成しました！</p>
          <p class="hint" style="margin-top:8px;">🔗 共有URL:</p>
          <div class="share-row">
            <input type="text" value="${roomUrl}" readonly class="share-input" onclick="this.select()">
            <button class="copy-btn" onclick="copyToClipboard('${roomUrl}')">コピー</button>
          </div>
          <p class="hint" style="margin-top:8px;">UUID: <code>${data.room.uuid}</code></p>
          <button class="btn-primary" style="margin-top:12px;" onclick="navigateTo('chat', '${data.room.uuid}'); openRoom('${data.room.uuid}');">ルームを開く</button>
        `;
      }

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

  try {
    const res = await fetch(`${API_BASE}/api/rooms?all=true`);
    const data = await res.json();
    const rooms = data.rooms || [];

    let found = null;
    for (const room of rooms) {
      if (room.visibility !== "private") continue;
      const tryRes = await fetch(`${API_BASE}/api/rooms/${room.uuid}?code=${encodeURIComponent(code)}`);
      if (tryRes.ok) {
        const tryData = await tryRes.json();
        found = tryData.room;
        break;
      }
    }

    const resultEl = document.getElementById("join-result");

    if (found) {
      resultEl.classList.remove("hidden");
      resultEl.innerHTML = `
        <p>✅ ルーム「${escapeHtml(found.name)}」にアクセスできます！</p>
        <button class="btn-primary" onclick="navigateTo('chat', '${found.uuid}', '${code}'); openRoom('${found.uuid}', '${code}');">ルームを開く</button>
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

// ─── Init: handle route on page load ───
handleRoute();
