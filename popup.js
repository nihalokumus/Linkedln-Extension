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
  const loginEmail = document.getElementById('loginEmail');
  const loginPass = document.getElementById('loginPass');

  const exportBtn = document.getElementById('exportBtn');
  const saveDbBtn = document.getElementById('saveDbBtn');

  // Sayfa yüklendiğinde token kontrolü yap
  chrome.storage.local.get(['accessToken', 'refreshToken'], (result) => {
    if (result.accessToken) {
      loginView.classList.add('hidden');
      mainView.classList.remove('hidden');
      statusEl.textContent = "Giriş yapıldı. LinkedIn sekmesinde işlem yapabilirsiniz.";
      statusEl.style.color = "#333";
    }
  });

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

  loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPass.value.trim();

    if (!email || !password) {
      statusEl.textContent = "Lütfen e-posta ve şifrenizi girin.";
      statusEl.style.color = "red";
      return;
    }

    statusEl.textContent = "Giriş yapılıyor...";
    statusEl.style.color = "blue";

    try {
      const response = await fetch("https://test.talentrove.app/api/jwt/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      }

      const data = await response.json();

      chrome.storage.local.set({
        accessToken: data.access,
        refreshToken: data.refresh
      }, () => {
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
        statusEl.textContent = "Giriş yapıldı. LinkedIn sekmesinde işlem yapabilirsiniz.";
        statusEl.style.color = "#333";
      });

    } catch (error) {
      if (error.message.includes('fetch')) {
        statusEl.textContent = "Bağlantı hatası! Sunucuya erişilemiyor. Lütfen eklentiyi yeniden yükleyin.";
      } else {
        statusEl.textContent = error.message;
      }
      statusEl.style.color = "red";
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['accessToken', 'refreshToken'], () => {
      mainView.classList.add('hidden');
      loginView.classList.remove('hidden');
      loginEmail.value = "";
      loginPass.value = "";
      statusEl.textContent = "Çıkış yapıldı.";
      statusEl.style.color = "#333";
    });
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
        statusEl.textContent = res?.error || "Veri çekilirken bir hata oldu.";
        statusEl.style.color = "red";
        return;
      }

      statusEl.textContent = "Veritabanına kaydediliyor...";
      const profileData = res.data;

      // KESİN VE SAĞLAM TARİH FORMATLAYICI
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        dateStr = dateStr.trim().toLowerCase();

        if (dateStr === "halen" || dateStr === "present" || dateStr === "bugün" || dateStr.includes("mevcut") || dateStr.includes("devam")) {
          return "";
        }

        const months = {
          'oca': '01', 'şub': '02', 'sub': '02', 'mar': '03', 'nis': '04', 'may': '05',
          'haz': '06', 'tem': '07', 'ağu': '08', 'agu': '08', 'eyl': '09', 'eki': '10',
          'kas': '11', 'ara': '12',
          'jan': '01', 'feb': '02', 'apr': '04', 'jun': '06', 'jul': '07', 'aug': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };

        // Türkçe karakterli Regex ile "Eylül 2022" gibi formatları yakala
        const match = dateStr.match(/([a-zçğıöşü]+)\s+(\d{4})/i);
        if (match) {
          const monthText = match[1].substring(0, 3);
          const month = months[monthText] || '01';
          const year = match[2];
          return `${year}-${month}-01`;
        }

        // Sadece "2023" gibi bir yıl varsa yakala
        const yearMatch = dateStr.match(/(\d{4})/);
        if (yearMatch) {
          return `${yearMatch[1]}-01-01`;
        }
        return "";
      };

      let generatedEmail = "";
      if (profileData.profileUrl) {
        const handle = profileData.profileUrl.split('/in/')[1]?.replace(/\/.*/, "") || "";
        if (handle) generatedEmail = `${handle}@linkedin.local`;
      }

      const payload = {
        override: true,
        basics: {
          email: generatedEmail,
          name: profileData.basics.name || "",
          summary: profileData.basics.summary || "",
          image: profileData.basics.image || "",
          profiles: [{ url: profileData.profileUrl || "" }],
          location: { address: profileData.basics.location || "", city: "", country: "" }
        },
        skills: profileData.skills || [],
        languages: (profileData.languages || []).map(l => ({
          language: l.name || "",
          fluency: l.proficiency || ""
        })),
        education: (profileData.education || []).map(e => {
          const edDateParts = e.duration ? e.duration.split(/[-–—]/) : [];
          return {
            institution: e.institution || "",
            area: e.degree || "",
            studyType: e.degree || "",
            startDate: formatDate(edDateParts[0] ? edDateParts[0].trim() : ""),
            endDate: formatDate(edDateParts[1] ? edDateParts[1].replace(/·.*/, '').trim() : ""),
            score: ""
          };
        }),
        work: (profileData.experience || []).map(w => {
          const dateParts = w.duration ? w.duration.split(/[-–—]/) : [];
          let sd = formatDate(dateParts[0] ? dateParts[0].trim() : "");
          let ed = formatDate(dateParts[1] ? dateParts[1].replace(/·.*/, '').trim() : "");

          let companyClean = (w.company || "").split('·')[0].trim();
          let positionClean = (w.position || "").split('·')[0].trim();

          return {
            name: companyClean,
            position: positionClean,
            startDate: sd ? sd : "1901-01-01",
            endDate: ed,
            summary: w.description || ""
          };
        })
      };

      try {
        const result = await chrome.storage.local.get(['accessToken', 'refreshToken']);
        if (!result.accessToken) throw new Error("Lütfen önce giriş yapın.");

        let token = result.accessToken;

        async function attemptSave(accessToken) {
          return await fetch("https://test.talentrove.app/api/save_employee_data/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + accessToken
            },
            body: JSON.stringify(payload)
          });
        }

        let response = await attemptSave(token);

        if (response.status === 401 && result.refreshToken) {
          const refreshRes = await fetch("https://test.talentrove.app/api/jwt/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: result.refreshToken })
          });

          if (!refreshRes.ok) throw new Error("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");

          const refreshData = await refreshRes.json();
          token = refreshData.access;
          await chrome.storage.local.set({ accessToken: token });
          response = await attemptSave(token);
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API hatası: ${response.status} - ${errText}`);
        }

        statusEl.textContent = "Başarıyla kaydedildi!";
        statusEl.style.color = "green";
      } catch (error) {
        console.error(error);
        if (error.message.includes("Oturumunuzun süresi doldu") || error.message.includes("giriş yapın")) {
          chrome.storage.local.remove(['accessToken', 'refreshToken'], () => {
            mainView.classList.add('hidden');
            loginView.classList.remove('hidden');
            loginEmail.value = "";
            loginPass.value = "";
          });
        }
        statusEl.textContent = "Kaydetme başarısız: " + error.message;
        statusEl.style.color = "red";
      }
    });
  });
});