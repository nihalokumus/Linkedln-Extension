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


  saveDbBtn.addEventListener('click', async () => {
    statusEl.textContent = "Veriler çekiliyor, lütfen bekleyin...";
    statusEl.style.color = "blue";
  
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    if (!tab?.id) {
      statusEl.textContent = "Aktif sekme bulunamadı.";
      statusEl.style.color = "red";
      return;
    }
  
    chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" }, async (res) => {
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

      statusEl.textContent = "Veritabanına kaydediliyor...";
      const profileData = res.data;

      const payload = {
        override: false,
        basics: {
          email: "",
          name: profileData.basics.name || "",
          summary: profileData.basics.summary || "",
          image: profileData.basics.image || "",
          profiles: [
            {
              url: profileData.profileUrl || ""
            }
          ],
          location: {
            address: profileData.basics.location || "",
            city: "",
            country: ""
          }
        },
        skills: profileData.skills || [],
        languages: (profileData.languages || []).map(l => ({
          language: l.name || "",
          fluency: l.proficiency || ""
        })),
        education: (profileData.education || []).map(e => ({
          institution: e.institution || "",
          area: e.degree || "",
          studyType: e.degree || "",
          startDate: e.duration ? e.duration.split('-')[0]?.trim() || "" : "",
          endDate: e.duration ? e.duration.split('-')[1]?.replace(/·.*/, '')?.trim() || "" : "",
          score: ""
        })),
        work: (profileData.experience || []).map(w => ({
          name: w.company || "",
          position: w.position || "",
          startDate: w.duration ? w.duration.split('-')[0]?.trim() || "" : "",
          endDate: w.duration ? w.duration.split('-')[1]?.replace(/·.*/, '')?.trim() || "" : "",
          summary: w.description || ""
        }))
      };

      try {
          const response = await fetch("https://test.talentrove.app/api/save_employee_data/", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc1NTYyNzQ5LCJpYXQiOjE3NzU1NTkxNDksImp0aSI6ImY5NzZkODZmNTQ3MjRlNmVhZmVhNjM5YjY3YzNkOWJjIiwidXNlcl9pZCI6MTA3fQ.zsoNrh95veJQAE7fnlAJK2k1wYNzlhU6Hr4Zf480ENw"
              },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              const errText = await response.text();
              throw new Error(`API hatası: ${response.status} - ${errText}`);
          }

          statusEl.textContent = "Başarıyla kaydedildi!";
          statusEl.style.color = "green";
      } catch (error) {
          console.error(error);
          statusEl.textContent = "Kaydetme başarısız!";
          statusEl.style.color = "red";
      }
    });
  });
});