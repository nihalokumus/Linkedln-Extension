
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

function getSectionByHeader(headerText) {
    const xpath = `//div[@id='${headerText.toLowerCase()}']/parent::section | //section[.//h2[contains(., '${headerText}')]]`;
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}


function getWorkExperience() {
    const section = getSectionByHeader("Experience") || getSectionByHeader("Deneyim");
    if (!section) return [];

    const mainUl = section.querySelector('ul');
    if (!mainUl) return [];

    const items = Array.from(mainUl.querySelectorAll(':scope > li.artdeco-list__item, :scope > li.pvs-list__paged-list-item'));
    const experiences = [];

    items.forEach(item => {
        const nestedUl = item.querySelector('ul.pvs-list, ul.artdeco-list');
        const spans = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
            .map(el => cleanText(el.textContent))
            .filter(t => t);

        if (nestedUl) {
            const companyName = spans[0] || "Bilinmiyor";
            const subItems = Array.from(nestedUl.querySelectorAll(':scope > li'));

            subItems.forEach(subItem => {
                const subSpans = Array.from(subItem.querySelectorAll('span[aria-hidden="true"]'))
                    .map(el => cleanText(el.textContent))
                    .filter(t => t);

                experiences.push({
                    company: companyName,
                    position: subSpans[0] || "",
                    duration: subSpans.find(t => t.includes(" – ") || t.includes("-")) || "",
                    description: subSpans.find(t => t.length > 50) || "",
                    isMultiRole: true
                });
            });
        } else {
            experiences.push({
                position: spans[0] || "",
                company: spans[1] || "",
                duration: spans.find(t => t.includes(" – ") || t.includes("-")) || "",
                description: spans.find(t => t.length > 50) || "",
                isMultiRole: false
            });
        }
    });

    return experiences;
}

function getEducation() {
    const section = getSectionByHeader("Education") || getSectionByHeader("Eğitim");
    if (!section) return [];

    const items = Array.from(section.querySelectorAll('li.artdeco-list__item, li.pvs-list__paged-list-item'));
    return items.map(item => {
        const lines = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
            .map(el => cleanText(el.textContent))
            .filter(t => t);

        return {
            institution: lines[0] || "",
            degree: lines[1] || "",
            duration: lines.find(t => t.includes(" – ") || t.includes("-")) || "",
        };
    }).filter(e => e.institution);
}

function getSkills() {
    const section = getSectionByHeader("Skills") || getSectionByHeader("Yetenekler");
    if (!section) return [];

    const skills = Array.from(section.querySelectorAll('span[aria-hidden="true"]'))
        .map(el => cleanText(el.textContent))
        .filter(t => t && t.length < 50 && !t.includes("onay") && !t.includes("endorsement") && !t.includes("Yetkinlikler") && t !== "Yetenekler" && t !== "Skills");

    return [...new Set(skills)].map(name => ({ name }));
}


function getLanguages() {
    const section = getSectionByHeader("Languages") || getSectionByHeader("Diller");
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
            await autoScrollToLoad();

            const name = cleanText(document.querySelector("h1")?.textContent) || "Unknown Profile";
            const headline = cleanText(document.querySelector(".text-body-medium")?.textContent) || "";
            const locText = cleanText(document.querySelector(".text-body-small.inline")?.textContent) || "";
            const image = document.querySelector('img.pv-top-card-profile-picture__image')?.src || document.querySelector('img[src*="profile-displayphoto-shrink"]')?.src || "";

            const profileData = {
                extractedAt: new Date().toISOString(),
                profileUrl: window.location.href,
                basics: {
                    name,
                    summary: headline,
                    location: locText,
                    image
                },
                experience: getWorkExperience(),
                education: getEducation(),
                skills: getSkills(),
                languages: getLanguages() // Diller veriye eklendi
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