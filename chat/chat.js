// ─── Chat page (チャット) ───

let currentRoom = null;
let currentInviteCode = null;
let pollTimer = null;

function resolveUuidAndCode() {
  const saved = sessionStorage.getItem('chat-redirect');
  let path, search;

  if (saved) {
    sessionStorage.removeItem('chat-redirect');
    const [p, s] = saved.split('?');
    path = p;
    search = s || '';
  } else {
    path = window.location.pathname;
    search = window.location.search.replace(/^\?/, '');
  }

  const parts = path.split('/').filter(Boolean);
  const uuid = parts.length >= 2 ? parts[1] : null;
  const params = new URLSearchParams(search);
  const code = params.get('code');

  if (uuid) {
    let correctUrl = `/chat/${uuid}/`;
    if (code) correctUrl += `?code=${encodeURIComponent(code)}`;
    if (window.location.pathname + window.location.search !== correctUrl) {
      history.replaceState({}, '', correctUrl);
    }
  }

  return { uuid, code };
}

async function init() {
  const { uuid, code } = resolveUuidAndCode();

  if (!uuid) {
    document.getElementById("chat-title").textContent = "チャットが見つかりません";
    document.getElementById("chat-messages").innerHTML =
      '<p class="empty">UUIDが指定されていません。<a href="/">チャット一覧へ</a></p>';
    return;
  }

  currentRoom = uuid;
  currentInviteCode = code;

  // 名前欄に前回の名前を復元
  const savedName = localStorage.getItem("anon-name");
  if (savedName) document.getElementById("chat-name").value = savedName;

  openRoom(uuid, code);
}

async function openRoom(uuid, inviteCode) {
  let url = `${API_BASE}/api/rooms/${uuid}`;
  if (inviteCode) url += `?code=${encodeURIComponent(inviteCode)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      document.getElementById("chat-title").textContent = "アクセスできません";
      document.getElementById("chat-messages").innerHTML = `
        <p class="empty">${escapeHtml(data.error || "エラーが発生しました")}<br>
        <a href="/join/">招待コードで参加する</a> / <a href="/">チャット一覧へ</a></p>
      `;
      return;
    }

    const room = data.room;
    document.getElementById("chat-title").textContent = room.name;

    const genreInfo = GENRE_LABELS[room.genre] || room.genre || "general";
    const metaParts = [
      `<span class="tag">${escapeHtml(genreInfo)}</span>`,
      ...(room.hashtags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`),
      room.visibility === "private"
        ? '<span style="color: var(--danger);">🔒 Private</span>'
        : '<span style="color: var(--text-muted);">🌐 Public</span>',
    ];
    document.getElementById("chat-meta").innerHTML = metaParts.join(" ");

    let shareUrl = `${window.location.origin}/chat/${uuid}/`;
    if (inviteCode) shareUrl += `?code=${encodeURIComponent(inviteCode)}`;
    document.getElementById("chat-share").innerHTML = `
      <span class="share-box">
        <input type="text" value="${shareUrl}" readonly class="share-input" onclick="this.select()">
        <button class="copy-btn" onclick="copyToClipboard('${shareUrl}')">コピー</button>
      </span>
    `;

    renderMessages(room.messages || []);

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => pollMessages(uuid, inviteCode), 5000);
  } catch (err) {
    document.getElementById("chat-title").textContent = "エラー";
    document.getElementById("chat-messages").innerHTML = `<p class="empty">${escapeHtml(String(err))}</p>`;
  }
}

function renderMessages(messages) {
  const el = document.getElementById("chat-messages");
  if (!messages || messages.length === 0) {
    el.innerHTML = '<p class="empty">まだ誰も書き込んでない。<br>最初のメッセージを送ろう！ ✍️</p>';
    return;
  }
  el.innerHTML = messages
    .map(
      (m) => {
        const displayName = m.name || "無名A";
        const id = m.userId || "ID:??????";
        return `
        <div class="message">
          <div class="msg-name">${escapeHtml(displayName)} <span class="msg-id">${escapeHtml(id)}</span></div>
          <div class="msg-content">${escapeHtml(m.content)}</div>
          <div class="msg-time">${formatTime(m.timestamp)}</div>
        </div>
      `;
      }
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

document.getElementById("chat-send").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const name = document.getElementById("chat-name").value.trim() || "無名A";
  const content = document.getElementById("chat-input").value.trim();
  if (!content || !currentRoom) return;

  // 名前を保存
  localStorage.setItem("anon-name", name);

  const userId = getUserId();

  const btn = document.getElementById("chat-send");
  btn.disabled = true;

  let url = `${API_BASE}/api/rooms/${currentRoom}/message`;
  if (currentInviteCode) url += `?code=${encodeURIComponent(currentInviteCode)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content, id: userId }),
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

init();
