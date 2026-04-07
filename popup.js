document.addEventListener('DOMContentLoaded', function () {

  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const mainView = document.getElementById('mainView');
  const statusEl = document.getElementById('status');


  const goToRegister = document.getElementById('goToRegister');
  const goToLogin = document.getElementById('goToLogin');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const exportBtn = document.getElementById('exportBtn');
  const saveDbBtn = document.getElementById('saveDbBtn');


  goToRegister.addEventListener('click', () => {
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
    statusEl.textContent = "";
  });

  goToLogin.addEventListener('click', () => {
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
    statusEl.textContent = "";
  });


  loginBtn.addEventListener('click', () => {

    loginView.classList.add('hidden');
    mainView.classList.remove('hidden');
    statusEl.textContent = "Giriş yapıldı. LinkedIn sekmesinde işlem yapabilirsiniz.";
    statusEl.style.color = "#333";
  });

  logoutBtn.addEventListener('click', () => {
    mainView.classList.add('hidden');
    loginView.classList.remove('hidden');
    statusEl.textContent = "";
  });


  exportBtn.addEventListener("click", async () => {
    statusEl.textContent = "Hazırlanıyor...";
    statusEl.style.color = "blue";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      statusEl.textContent = "Aktif sekme bulunamadı.";
      statusEl.style.color = "red";
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "EXPORT_JSON" }, (res) => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = "Bu sayfada çalışmıyor. LinkedIn sayfasında mısın?";
        statusEl.style.color = "red";
        return;
      }

      if (!res?.ok) {
        statusEl.textContent = res?.error || "Bir hata oldu.";
        statusEl.style.color = "red";
        return;
      }

      statusEl.textContent = "İndirme tamamlandı!";
      statusEl.style.color = "green";
    });
  });


  saveDbBtn.addEventListener('click', () => {
    statusEl.textContent = "Veritabanı altyapısı henüz kurulmadı...";
    statusEl.style.color = "red";
  });
});