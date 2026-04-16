const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanText = (s) => {
    if (!s) return "";
    let cleaned = s.trim().replace(/\s+/g, " ");
    // Remove typical premium badges or tags
    cleaned = cleaned.replace(/LinkedIn Premium/gi, '')
        .replace(/Premium üyesi/gi, '')
        .replace(/Premium member/gi, '')
        .replace(/Top Voice/gi, '')
        .replace(/Verify/gi, '')
        .replace(/Onaylı/gi, '')
        .replace(/…daha fazla gör|…see more/gi, '');
    return cleaned.trim();
};

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
    const div = document.querySelector(`div#${id}, div#${id}_and_endorsements, div#${id}s`);
    if (div) return div.closest('section') || div.closest('.artdeco-card') || div.parentElement;
    return document.querySelector(`section#${id}`) || document.querySelector(`.artdeco-card#${id}`) || document.querySelector(`#${id}`);
}

function getSectionByKeyword(keywordRegex) {
    const headers = Array.from(document.querySelectorAll("h2, h3, span.pvs-header__title, .pvs-header__title, div.pvs-header__title-container span"));
    for (let header of headers) {
        let text = (header.innerText || header.textContent || "").trim().toLowerCase();
        text = text.split('\n')[0].trim();
        if (keywordRegex.test(text)) {
            let sec = header.closest('section') || header.closest('.artdeco-card') || header.closest('.pvs-list__container') || header.closest('div[data-view-name="profile-card"]');
            if (sec) return sec;
        }
    }

    const sections = Array.from(document.querySelectorAll("section, .artdeco-card, div[data-view-name='profile-card']"));
    for (let sec of sections) {
        if (sec.id && keywordRegex.test(sec.id.toLowerCase())) {
            return sec;
        }
    }
    return null;
}

function getAboutText() {
    const section = getSectionById("about") || getSectionByKeyword(/^about|^hakkında|^hakkımda/i);
    if (!section) return "";


    const textSpan = section.querySelector('div.inline-show-more-text span[aria-hidden="true"], .pv-shared-text-with-see-more span[aria-hidden="true"]');

    if (textSpan) {
        return cleanText(textSpan.textContent);
    }


    let text = section.innerText || section.textContent || "";
    let cleaned = text.split('\n').filter(line => !/^(hakkında|hakkımda|about)$/i.test(line.trim())).join(' ');

    return cleanText(cleaned.replace(/…daha fazla gör|…see more/gi, ''));
}

function getWorkExperience() {
    const section = getSectionById("experience") || getSectionByKeyword(/exper|deneyi/i);
    if (!section) return [];

    const mainUl = section.querySelector('ul.pvs-list') || section.querySelector('ul') || section.querySelector('.pvs-list');
    if (!mainUl) return [];

    const items = Array.from(mainUl.children).filter(el => el.tagName.toLowerCase() === 'li' || el.classList.contains('pvs-list__item--line-separated'));
    const experiences = [];

    items.forEach(item => {
        const titleNode = item.querySelector('.t-bold span[aria-hidden="true"], .t-bold, .display-flex.align-items-center span[aria-hidden="true"]');
        const subtitleNode = item.querySelector('.t-normal:not(.t-black--light) span[aria-hidden="true"], .t-normal span[aria-hidden="true"], .t-normal');

        const dateNodes = Array.from(item.querySelectorAll('.t-black--light span[aria-hidden="true"], .pvs-entity__caption-wrapper[aria-hidden="true"], .t-black--light'))
            .map(el => cleanText(el.textContent));

        let outerTitle = cleanText(titleNode?.textContent);
        let outerSubtitle = cleanText(subtitleNode?.textContent);

        if (/yetenekler|skills/i.test(outerTitle)) return;

        const nestedList = item.querySelector('.pvs-list__outer-container .pvs-list, ul.pvs-list');
        const nestedItems = nestedList ? Array.from(nestedList.children).filter(el => el.tagName.toLowerCase() === 'li') : [];

        if (nestedItems.length > 0 && cleanText(nestedItems[0].textContent).length > 0) {
            // ÇOKLU ROL
            nestedItems.forEach(nestedLi => {
                const innerTitleNode = nestedLi.querySelector('.t-bold span[aria-hidden="true"], .t-bold');
                let innerTitle = cleanText(innerTitleNode?.textContent);

                const innerDurNodes = Array.from(nestedLi.querySelectorAll('.t-normal span[aria-hidden="true"], .t-black--light span[aria-hidden="true"]'))
                    .map(el => cleanText(el.textContent));

                if (/yetenekler|skills/i.test(innerTitle)) return;

                let innerDur = innerDurNodes.find(t => /\d{4}/.test(t) || /ay|yıl|yr|mo|halen|present|devam|mevcut/i.test(t)) || innerDurNodes[0] || "";

                const descNode = nestedLi.querySelector('.inline-show-more-text span[aria-hidden="true"], .pv-shared-text-with-see-more span[aria-hidden="true"], div.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal');
                let desc = descNode ? cleanText(descNode.textContent).replace(/…daha fazla gör|…see more/gi, '') : "";

                if (innerTitle) {
                    experiences.push({
                        company: outerTitle,
                        position: innerTitle,
                        duration: innerDur,
                        description: desc,
                        isMultiRole: true
                    });
                }
            });
        } else {

            let duration = dateNodes.find(t => /\d{4}/.test(t) || /ay|yıl|yr|mo|halen|present|devam|mevcut/i.test(t)) || "";

            let finalPosition = outerTitle;
            let finalCompany = outerSubtitle;

            const jobTypes = ["tam zamanlı", "yarı zamanlı", "stajyer", "full-time", "part-time", "intern", "freelance", "sözleşmeli"];

            if (finalCompany.includes("·")) {
                finalCompany = finalCompany.split("·")[0].trim();
            } else if (jobTypes.some(type => finalCompany.toLowerCase() === type || finalCompany.toLowerCase().includes(type))) {
                finalCompany = outerTitle;
                finalPosition = outerSubtitle;
            }

            const descNode = item.querySelector('.inline-show-more-text span[aria-hidden="true"], .pv-shared-text-with-see-more span[aria-hidden="true"], div.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal');
            let desc = descNode ? cleanText(descNode.textContent).replace(/…daha fazla gör|…see more/gi, '') : "";

            if (finalPosition && !/yetenekler|skills/i.test(finalPosition)) {
                experiences.push({
                    position: finalPosition || "",
                    company: finalCompany || "",
                    duration: duration,
                    description: desc,
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

    const mainUl = section.querySelector('ul.pvs-list') || section.querySelector('ul') || section.querySelector('.pvs-list');
    if (!mainUl) return [];

    const items = Array.from(mainUl.children).filter(el => el.tagName.toLowerCase() === 'li' || el.classList.contains('pvs-list__item--line-separated'));
    return items.map(item => {
        const titleNode = item.querySelector('.t-bold span[aria-hidden="true"], .t-bold') || item.querySelector('.display-flex.align-items-center span[aria-hidden="true"]');
        const subtitleNode = item.querySelector('.t-normal span[aria-hidden="true"], .t-normal') || item.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
        const dateNodes = Array.from(item.querySelectorAll('.t-black--light span[aria-hidden="true"], .pvs-entity__caption-wrapper[aria-hidden="true"], .t-black--light'))
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
    const section = getSectionById("skills") || getSectionById("skills_and_endorsements") || getSectionByKeyword(/^skill|^yetenek/i);
    if (!section) return [];

    let skills = [];


    const listItems = section.querySelectorAll('ul.pvs-list > li');

    if (listItems.length > 0) {
        listItems.forEach(item => {

            const nameNode = item.querySelector('.hoverable-link-text span[aria-hidden="true"], .mr1 span[aria-hidden="true"], .t-bold span[aria-hidden="true"]');
            if (nameNode) {
                skills.push(cleanText(nameNode.textContent));
            }
        });
    } else {

        const fallbackItems = section.querySelectorAll('.pv-skill-category-entity__name-text, .t-bold');
        fallbackItems.forEach(item => {
            const text = cleanText(item.textContent);
            if (text) skills.push(text);
        });
    }

    // Daha fazla gör metinlerini silme/filtreleme
    skills = skills.filter(t => t && t.length > 1 && t.length < 50 && !/yetenek|skill|onay|endorsement|gör|see more/i.test(t));


    return [...new Set(skills)].map(name => ({ name: name.replace(/…daha fazla gör|…see more/gi, '').trim() }));
}

function getLanguages() {
    const section = getSectionById("languages") || getSectionByKeyword(/^langu|^diller/i);
    if (!section) return [];

    const langs = [];
    const listItems = section.querySelectorAll('ul.pvs-list > li');

    if (listItems.length > 0) {
        listItems.forEach(item => {

            const titleNode = item.querySelector('.t-bold span[aria-hidden="true"], .mr1 span[aria-hidden="true"]');

            const subtitleNode = item.querySelector('.t-normal:not(.t-black--light) span[aria-hidden="true"], .t-normal span[aria-hidden="true"]');

            if (titleNode) {
                langs.push({
                    name: cleanText(titleNode.textContent),
                    proficiency: subtitleNode ? cleanText(subtitleNode.textContent) : ""
                });
            }
        });
    } else {

        const items = Array.from(section.querySelectorAll('li'));
        items.forEach(item => {
            let lines = Array.from(item.querySelectorAll('span[aria-hidden="true"]')).map(s => cleanText(s.textContent)).filter(t => t);
            if (lines.length > 0 && !/diller|languages/i.test(lines[0])) {
                langs.push({
                    name: lines[0],
                    proficiency: lines.length > 1 ? lines[1] : ""
                });
            }
        });
    }


    const uniqueLangs = [];
    const seen = new Set();
    for (const l of langs) {
        if (!seen.has(l.name)) {
            seen.add(l.name);
            uniqueLangs.push(l);
        }
    }
    return uniqueLangs;
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

            let profileUrlClean = window.location.href.split('?')[0];
            if (profileUrlClean.endsWith('/')) profileUrlClean = profileUrlClean.slice(0, -1);

            const imageEl = mainRegion.querySelector('img.pv-top-card-profile-picture__image')
                || mainRegion.querySelector(`img.evi-image[alt*="${name}"]`)
                || mainRegion.querySelector('img.evi-image')
                || mainRegion.querySelector('img[src*="profile-displayphoto-shrink"]')
                || mainRegion.querySelector('img[class*="pv-top-card"]');
            const image = imageEl ? imageEl.src : "";

            const profileData = {
                extractedAt: new Date().toISOString(),
                profileUrl: profileUrlClean,
                basics: { name, summary: getAboutText() || headline, location: locText, image },
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