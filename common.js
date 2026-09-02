// ─── Shared helpers for all pages ───
const API_BASE = "https://my-api.allwayneed.workers.dev";

// ジャンル表示名
const GENRE_LABELS = {
  general: "💬 雑談",
  tech: "💻 テック",
  game: "🎮 ゲーム",
  music: "🎵 音楽",
  art: "🎨 アート",
  study: "📚 勉強",
  hobby: "🌿 趣味",
  other: "📦 その他",
};

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

function messageCount(room) {
  return room.messages ? room.messages.length : 0;
}

// ─── ユーザーID（ブラウザに保存、1人1ID） ───
function getUserId() {
  let id = localStorage.getItem("anon-user-id");
  if (!id) {
    id = "ID:" + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem("anon-user-id", id);
  }
  return id;
}

// ─── 遊び心: ランダムタグライン ───
const TAGLINES = [
  "匿名だから正直になれる場所",
  "名前は適当でいい。中身で勝負。",
  "書きたいことを書け。それがルールだ。",
  "誰かが見てる。たぶん。",
  "匿名の住人たちが集う場所",
  "ここでの発言は現実には影響しません（たぶん）",
  "チャットは文化。匿名は様式。",
];

const WISDOMS = [
  "「匿名だからこそ、本音が出る」 — 名無しの住人",
  "「チャットは育つ。君の書き込みが肥料になる」",
  "「ログインしない自由こそが真の自由」",
  "「誰も信用しない。だから誰も裏切らない」",
  "「BANがない世界は楽園か無法地帯か」 — 結論: 両方",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function initTagline() {
  const el = document.getElementById("tagline");
  if (!el) return;
  el.textContent = "≫ " + pickRandom(TAGLINES);
  setInterval(() => {
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = "≫ " + pickRandom(TAGLINES);
      el.style.opacity = "1";
    }, 300);
  }, 15000);
}

function initFooterWisdom() {
  const el = document.getElementById("footer-wisdom");
  if (el) el.textContent = pickRandom(WISDOMS);
}
