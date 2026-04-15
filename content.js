const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanText = (s) => (s || "").trim().replace(/\s+/g, " ");

async function autoScrollToLoad() {
    const total = document.body.scrollHeight;
    for (let i = 0; i < 12; i++) {
        window.scrollTo(0, (total * (i + 1)) / 12);
        await sleep(400);
    }
    window.scrollTo(0, 0);
    await sleep(500);
}

function getSectionById(id) {
    const div = document.querySelector(`div#${id}`);
    if (div) return div.closest('section') || div.parentElement;
    return document.querySelector(`section#${id}`);
}

function getSectionByKeyword(keywordRegex) {
    const sections = Array.from(document.querySelectorAll("section"));
    for (let sec of sections) {
        const h2 = sec.querySelector("h2");
        if (h2 && keywordRegex.test(h2.textContent.trim().toLowerCase())) {
            return sec;
        }
    }
    for (let sec of sections) {
        if (sec.id && keywordRegex.test(sec.id.toLowerCase())) {
            return sec;
        }
    }
    return null;
}

function getWorkExperience() {
    const section = getSectionById("experience") || getSectionByKeyword(/exper|deneyi/i);
    if (!section) return [];

    const mainUl = section.querySelector('ul');
    if (!mainUl) return [];

    const items = Array.from(mainUl.querySelectorAll(':scope > li.artdeco-list__item, :scope > li.pvs-list__paged-list-item'));
    const experiences = [];

    items.forEach(item => {
        // LinkedIn'de yeteneklerin (skills) pozisyon adlarına sızmasını engellemek için sadece başlık bloğunu seçiyoruz.
        const titleNode = item.querySelector('.t-bold span[aria-hidden="true"]');
        const subtitleNode = item.querySelector('.t-normal:not(.t-black--light) span[aria-hidden="true"], .t-normal span[aria-hidden="true"]');

        const dateNodes = Array.from(item.querySelectorAll('.t-black--light span[aria-hidden="true"], .pvs-entity__caption-wrapper[aria-hidden="true"]'))
            .map(el => cleanText(el.textContent));

        let outerTitle = cleanText(titleNode?.textContent);
        let outerSubtitle = cleanText(subtitleNode?.textContent);

        // "Yetenekler" tuzağını kır
        if (/yetenekler|skills/i.test(outerTitle)) return;

        const nestedItems = Array.from(item.querySelectorAll('.pvs-list__outer-container .pvs-list > li, ul.pvs-list > li'));

        if (nestedItems.length > 0 && nestedItems[0].textContent.trim().length > 0) {
            // ÇOKLU ROL (Aynı şirkette birden fazla pozisyon)
            nestedItems.forEach(nestedLi => {
                const innerTitleNode = nestedLi.querySelector('.t-bold span[aria-hidden="true"]');
                let innerTitle = cleanText(innerTitleNode?.textContent);

                const innerDurNodes = Array.from(nestedLi.querySelectorAll('.t-normal span[aria-hidden="true"], .t-black--light span[aria-hidden="true"]'))
                    .map(el => cleanText(el.textContent));

                // Alt öğe "Yetenekler" listesiyse atla
                if (/yetenekler|skills/i.test(innerTitle)) return;

                let innerDur = innerDurNodes.find(t => /\d{4}/.test(t) || /ay|yıl|yr|mo|halen|present|devam|mevcut/i.test(t)) || innerDurNodes[0] || "";

                if (innerTitle) {
                    experiences.push({
                        company: outerTitle,
                        position: innerTitle,
                        duration: innerDur,
                        description: "",
                        isMultiRole: true
                    });
                }
            });
        } else {
            // TEKLİ ROL
            let duration = dateNodes.find(t => /\d{4}/.test(t) || /ay|yıl|yr|mo|halen|present|devam|mevcut/i.test(t)) || "";

            let finalPosition = outerTitle;
            let finalCompany = outerSubtitle;

            // "Tam zamanlı" gibi kelimeler şirket ismine karışmışsa, onları temizle/yer değiştir
            const jobTypes = ["tam zamanlı", "yarı zamanlı", "stajyer", "full-time", "part-time", "intern", "freelance", "sözleşmeli"];

            if (finalCompany.includes("·")) {
                finalCompany = finalCompany.split("·")[0].trim();
            } else if (jobTypes.some(type => finalCompany.toLowerCase() === type || finalCompany.toLowerCase().includes(type))) {
                finalCompany = outerTitle;
                finalPosition = outerSubtitle;
            }

            if (finalPosition && !/yetenekler|skills/i.test(finalPosition)) {
                experiences.push({
                    position: finalPosition || "",
                    company: finalCompany || "",
                    duration: duration,
                    description: "",
                    isMultiRole: false
                });
            }
        }
    });

    return experiences;
}

function getEducation() {
    const section = getSectionById("education") || getSectionByKeyword(/educat|eğitim/i);
    if (!section) return [];

    const items = Array.from(section.querySelectorAll('li.artdeco-list__item, li.pvs-list__paged-list-item'));
    return items.map(item => {
        const titleNode = item.querySelector('.t-bold span[aria-hidden="true"]') || item.querySelector('.display-flex.align-items-center span[aria-hidden="true"]');
        const subtitleNode = item.querySelector('.t-normal span[aria-hidden="true"]') || item.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
        const dateNodes = Array.from(item.querySelectorAll('.t-black--light span[aria-hidden="true"], .pvs-entity__caption-wrapper[aria-hidden="true"]'))
            .map(el => cleanText(el.textContent));

        let duration = dateNodes.find(t => /\d{4}/.test(t) || /mevcut|halen|present|devam/i.test(t)) || "";

        return {
            institution: cleanText(titleNode?.textContent) || "",
            degree: cleanText(subtitleNode?.textContent) || "",
            duration: duration,
        };
    }).filter(e => e.institution);
}

function getSkills() {
    const section = getSectionById("skills") || getSectionByKeyword(/skill|yetenek/i);
    if (!section) return [];

    const skills = Array.from(section.querySelectorAll('span[aria-hidden="true"]'))
        .map(el => cleanText(el.textContent))
        .filter(t => t && t.length < 50 && !t.includes("onay") && !t.includes("endorsement") && !t.includes("Yetkinlikler") && t !== "Yetenekler" && t !== "Skills");

    return [...new Set(skills)].map(name => ({ name }));
}

function getLanguages() {
    const section = getSectionById("languages") || getSectionByKeyword(/langu|diller/i);
    if (!section) return [];

    const items = Array.from(section.querySelectorAll('li.artdeco-list__item, li.pvs-list__paged-list-item'));
    return items.map(item => {
        const lines = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
            .map(el => cleanText(el.textContent))
            .filter(t => t);

        return {
            name: lines[0] || "",
            proficiency: lines[1] || ""
        };
    }).filter(l => l.name);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type !== "EXPORT_JSON" && msg?.type !== "GET_DATA") return;

    (async () => {
        try {
            if (!window.location.href.includes("linkedin.com/in/")) {
                throw new Error("Lütfen bir LinkedIn kişi profili sayfasında (linkedin.com/in/...) olduğunuzdan emin olun.");
            }

            await autoScrollToLoad();
            const mainRegion = document.querySelector("main") || document;

            const nameEl = mainRegion.querySelector(".text-heading-xlarge") || mainRegion.querySelector("h1");
            const name = cleanText(nameEl?.textContent) || "Unknown Profile";

            const headlineEl = mainRegion.querySelector(".text-body-medium") || mainRegion.querySelector("div.text-body-medium.break-words");
            const headline = cleanText(headlineEl?.textContent) || "";

            const locEl = mainRegion.querySelector("span.text-body-small.inline.t-black--light.break-words")
                || mainRegion.querySelector('.pv-text-details__left-panel span.text-body-small')
                || mainRegion.querySelector('.mt2 span.text-body-small')
                || mainRegion.querySelector(".text-body-small.inline");
            const locText = cleanText(locEl?.textContent) || "";

            const imageEl = mainRegion.querySelector('img.pv-top-card-profile-picture__image')
                || mainRegion.querySelector(`img.evi-image[alt*="${name}"]`)
                || mainRegion.querySelector('img.evi-image')
                || mainRegion.querySelector('img[src*="profile-displayphoto-shrink"]')
                || mainRegion.querySelector('img[class*="pv-top-card"]');
            const image = imageEl ? imageEl.src : "";

            const profileData = {
                extractedAt: new Date().toISOString(),
                profileUrl: window.location.href.split('?')[0],
                basics: { name, summary: headline, location: locText, image },
                experience: getWorkExperience(),
                education: getEducation(),
                skills: getSkills(),
                languages: getLanguages()
            };

            if (msg.type === "EXPORT_JSON") {
                const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `LinkedIn_${name.replace(/\s+/g, '_')}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }

            sendResponse({ ok: true, data: profileData });
        } catch (error) {
            console.error("LinkedIn Extraction Error:", error);
            sendResponse({ ok: false, error: error.message });
        }
    })();

    return true;
});