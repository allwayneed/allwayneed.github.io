// ─── Create thread page (スレッド作成) ───

// URLパラメータで板が指定されていれば事前選択
const params = new URLSearchParams(window.location.search);
const presetGenre = params.get("genre");
if (presetGenre) {
  const select = document.getElementById("room-genre");
  for (const opt of select.options) {
    if (opt.value === presetGenre) {
      opt.selected = true;
      break;
    }
  }
}

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

  const submitBtn = document.getElementById("create-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "作成中...";

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
      const roomUrl = `/chat/${data.room.uuid}/`;

      if (isPrivate && data.room.inviteCode) {
        const resultEl = document.getElementById("create-result");
        resultEl.classList.remove("hidden");
        const fullUrl = `${roomUrl}?code=${data.room.inviteCode}`;
        resultEl.innerHTML = `
          <p>✅ スレッド「${escapeHtml(data.room.name)}」を作成しました！</p>
          <p class="hint">招待コード（参加者に共有してください）:</p>
          <div class="invite-code">${escapeHtml(data.room.inviteCode)}</div>
          <p class="hint" style="margin-top:12px;">3秒後にチャットへ移動します...</p>
        `;
        submitBtn.textContent = "スレッドを立てる";
        submitBtn.disabled = false;
        setTimeout(() => {
          window.location.href = fullUrl;
        }, 3000);
      } else {
        window.location.href = roomUrl;
      }
    } else {
      alert(data.error || "作成に失敗しました");
      submitBtn.disabled = false;
      submitBtn.textContent = "スレッドを立てる";
    }
  } catch (err) {
    alert("エラー: " + err);
    submitBtn.disabled = false;
    submitBtn.textContent = "スレッドを立てる";
  }
});

initTagline();
