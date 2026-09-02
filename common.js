// ─── Shared helpers for all pages ───
const API_BASE = "https://my-api.allwayneed.workers.dev";

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

// ─── 遊び心: ランダムタグライン ───
const TAGLINES = [
  "匿名だから正直になれる場所",
  "ログイン不要・BANなし・自己責任",
  "名前は適当でいい。中身で勝負。",
  "書きたいことを書け。それがルールだ。",
  "誰かが見てる。たぶん。",
  "匿名の住人たちが集う場所",
  "ここでの発言は現実には影響しません（たぶん）",
];

const WISDOMS = [
  "「匿名だからこそ、本音が出る」 — 名無しの住人",
  "「スレッドは育つ。君の書き込みが肥料になる」",
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
