const statusEl = document.getElementById("status");
const btn = document.getElementById("exportBtn");

btn.addEventListener("click", async () => {
  statusEl.textContent = "Hazırlanıyor...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    statusEl.textContent = "Aktif sekme bulunamadı.";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "EXPORT_JSON" }, (res) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent =
        "Bu sayfada çalışmıyor. LinkedIn sayfasında mısın?";
      return;
    }

    if (!res?.ok) {
      statusEl.textContent = res?.error || "Bir hata oldu.";
      return;
    }

    statusEl.textContent = "İndirme tamamlandı ";
  });
});