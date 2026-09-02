// ─── Join via invite code page ───

document.getElementById("join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  if (!code) return;

  const submitBtn = document.getElementById("join-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "検索中...";

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
    resultEl.classList.remove("hidden");

    if (found) {
      resultEl.innerHTML = `<p>✅ ルーム「${escapeHtml(found.name)}」が見つかりました！移動します...</p>`;
      window.location.href = `/chat/${found.uuid}/?code=${encodeURIComponent(code)}`;
    } else {
      resultEl.innerHTML = `<p style="color: var(--danger);">❌ 招待コードに一致するルームが見つかりませんでした。</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = "参加する";
    }
  } catch (err) {
    alert("エラー: " + err);
    submitBtn.disabled = false;
    submitBtn.textContent = "参加する";
  }
});
