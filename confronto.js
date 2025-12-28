/*************************
 * STATO GLOBALE PAGINA
 *************************/
const state = {
    pilotaA: null,
    pilotaB: null,
    annoStart: null,
    annoEnd: null
};

let piloti = [];
let stagioni = [];
let chartConfronto = null;

/*************************
 * BOOTSTRAP
 *************************/
window.addEventListener("DOMContentLoaded", async () => {
    piloti = await fetch("data/piloti.json").then(r => r.json());
    stagioni = await fetch("data/stagioni.json").then(r => r.json());

    const anni = stagioni.map(s => s.anno).sort((a, b) => a - b);
    state.annoStart = anni[0];
    state.annoEnd = anni[anni.length - 1];

    popolaSelectAnni("annoA-start", anni);
    popolaSelectAnni("annoA-end", anni, true);

    popolaSelectAnni("annoB-start", anni);
    popolaSelectAnni("annoB-end", anni, true);

    setupAutocomplete("A");
    setupAutocomplete("B");

    inizializzaGrafico();

    [
    "annoA-start",
    "annoA-end",
    "annoB-start",
    "annoB-end"
    ].forEach(id => {
        document.getElementById(id)?.addEventListener("change", () => {
            state.annoStart = Number(document.getElementById("annoA-start").value);
            state.annoEnd = Number(document.getElementById("annoA-end").value);

            if (state.annoStart > state.annoEnd) return;

            aggiornaConfronto();
        });
});
});

/*************************
 * FUNZIONI DATI
 *************************/
async function caricaGareIntervallo(annoStart, annoEnd) {
    const gareTotali = [];

    for (let anno = annoStart; anno <= annoEnd; anno++) {
        try {
            const gare = await fetch(`data/gare/${anno}.json`).then(r => r.json());
            gareTotali.push(...gare);
        } catch (e) {
            console.warn(`Gare ${anno} non disponibili`);
        }
    }
    return gareTotali;
}

async function calcolaStatsPilota(pilotaId, annoStart, annoEnd) {
    const gare = await caricaGareIntervallo(annoStart, annoEnd);

    const stats = {
        pilotaId,
        gare: 0,
        punti: 0,
        vittorie: 0,
        podi: 0
    };

    for (const gara of gare) {
        const regolamento = await getRegolamentoPerAnno(gara.stagione);

        // GARA PRINCIPALE
        (gara.risultati || []).forEach(r => {
            if (r.pilotaId !== pilotaId) return;

            stats.gare++;
            stats.punti += calcolaPuntiGP(r.posizione, regolamento);
            stats.punti += calcolaFastestLap(r, regolamento);

            if (r.posizione === 1) stats.vittorie++;
            if (r.posizione <= 3) stats.podi++;
        });

        // SPRINT
        if (gara.sprint && regolamento.sprint?.attivo) {
            gara.sprint.forEach(r => {
                if (r.pilotaId !== pilotaId) return;
                stats.punti += calcolaPuntiSprint(r.posizione, regolamento);
            });
        }
    }

    return stats;
}

/*************************
 * CONFRONTO
 *************************/
async function aggiornaConfronto() {
    if (!state.pilotaA || !state.pilotaB) return;

    const statsA = await calcolaStatsPilota(
        state.pilotaA,
        state.annoStart,
        state.annoEnd
    );

    const statsB = await calcolaStatsPilota(
        state.pilotaB,
        state.annoStart,
        state.annoEnd
    );

    aggiornaGrafico(statsA, statsB);
}

/*************************
 * GRAFICO (PIRAMIDE)
 *************************/
function inizializzaGrafico() {
    const canvas = document.getElementById("graficoConfronto");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    chartConfronto = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Gare", "Punti", "Vittorie", "Podi"],
            datasets: []
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    stacked: false
                }
            },
            plugins: {
                legend: {
                    position: "top"
                },
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: "line",
                            xMin: 0,
                            xMax: 0,
                            borderColor: "#555",
                            borderWidth: 2,
                            borderDash: [4, 4]
                        }
                    }
                }
            }
        }
    });
}

const metricsCount = 4;
const baseHeight = 120;
const perMetric = 60;

document.getElementById("graficoConfronto").height =
    baseHeight + metricsCount * perMetric;


function aggiornaGrafico(statsA, statsB) {
    const pilotaA = piloti.find(p => p.id === statsA.pilotaId);
    const pilotaB = piloti.find(p => p.id === statsB.pilotaId);

    const valoriA = [statsA.gare, statsA.punti, statsA.vittorie, statsA.podi];
    const valoriB = [statsB.gare, statsB.punti, statsB.vittorie, statsB.podi];

    const maxValue = Math.max(...valoriA, ...valoriB);

    chartConfronto.options.scales.x.min = -maxValue;
    chartConfronto.options.scales.x.max = maxValue;

    chartConfronto.data.datasets = [
        {
            label: pilotaA ? `${pilotaA.nome} ${pilotaA.cognome}` : "Pilota A",
            data: valoriA.map(v => -v),
            backgroundColor: "rgba(54, 162, 235, 0.7)"
        },
        {
            label: pilotaB ? `${pilotaB.nome} ${pilotaB.cognome}` : "Pilota B",
            data: valoriB,
            backgroundColor: "rgba(255, 99, 132, 0.7)"
        }
    ];

    chartConfronto.update();
}

/*************************
 * REGOLAMENTI
 *************************/
async function getRegolamentoPerAnno(anno) {
    const regolamenti = await fetch("data/regolamenti.json").then(r => r.json());

    for (const periodo in regolamenti) {
        if (periodo.includes("-")) {
            const [inizio, fine] = periodo.split("-").map(Number);
            if (anno >= inizio && anno <= fine) return regolamenti[periodo];
        } else if (Number(periodo) === anno) {
            return regolamenti[periodo];
        }
    }
    return null;
}

function calcolaPuntiGP(posizione, regolamento) {
    return regolamento?.punti?.[posizione - 1] || 0;
}

function calcolaPuntiSprint(posizione, regolamento) {
    return regolamento?.sprint?.punti?.[posizione - 1] || 0;
}

function calcolaFastestLap(risultato, regolamento) {
    if (!regolamento?.fastestLap?.attivo || !risultato.fastestLap) return 0;
    if (regolamento.fastestLap.soloTop10 && risultato.posizione > 10) return 0;
    return regolamento.fastestLap.punti;
}

/*************************
 * AUTOCOMPLETE
 *************************/
function setupAutocomplete(lettera) {
    const input = document.getElementById(`pilota${lettera}-input`);
    const suggestions = document.getElementById(`pilota${lettera}-suggestions`);

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase().trim();
        suggestions.innerHTML = "";

        if (query.length < 1) return;

        piloti
            .filter(p =>
                `${p.nome} ${p.cognome}`.toLowerCase().includes(query)
            )
            .slice(0, 8)
            .forEach(pilota => {
                const li = document.createElement("li");
                li.textContent = `${pilota.nome} ${pilota.cognome}`;
                li.classList.add("suggestion-item");

                li.addEventListener("click", () => {
                    input.value = `${pilota.nome} ${pilota.cognome}`;
                    suggestions.innerHTML = "";

                    if (lettera === "A") state.pilotaA = pilota.id;
                    if (lettera === "B") state.pilotaB = pilota.id;

                    aggiornaConfronto();
                });

                suggestions.appendChild(li);
            });
    });

    document.addEventListener("click", e => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.innerHTML = "";
        }
    });
}

function popolaSelectAnni(selectId, anni, selezionaUltimo = false) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = "";

    anni.forEach(anno => {
        const opt = document.createElement("option");
        opt.value = anno;
        opt.textContent = anno;
        select.appendChild(opt);
    });

    select.value = selezionaUltimo ? anni[anni.length - 1] : anni[0];
}
