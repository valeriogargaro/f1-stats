document.addEventListener("DOMContentLoaded", () => {
  const langSelect = document.getElementById("lang-select");
  const savedLang = localStorage.getItem("lang") || "it";

  if (langSelect) {
    langSelect.value = savedLang;

    langSelect.addEventListener("change", (e) => {
      const lang = e.target.value;
      localStorage.setItem("lang", lang);
      setLanguage(lang);
    });
  }

  setLanguage(savedLang);
});

async function setLanguage(lang) {
  try {
    const response = await fetch(`lingue/${lang}.json`);
    const t = await response.json();

    safeText("main-title", t.mainTitle);
    safeText("main-description", t.mainDescription);
    safeText("stats-link", t.statsLink);

    safeText("albo-piloti-h2", t.alboPiloti);
    safeText("albo-team-h2", t.alboTeam);
    safeText("classifica-h2", t.classificaPiloti);
    safePlaceholder("filtro-pilota", t.filtroPilota);

    document.documentElement.lang = lang;
  } catch (err) {
    console.error("Errore lingua:", err);
  }
}

function safeText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function safePlaceholder(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.placeholder = value;
}
