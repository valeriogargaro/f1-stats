let garePilotaGlobal = []; // Per riutilizzare i dati senza ricalcoli

// Recupera id pilota da URL
function getPilotaId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// Funzione per ottenere il sistema di punteggio corretto in base all'anno
async function getSistemaPunti(anno) {
    const regolamenti = await fetch('data/regolamenti.json').then(r => r.json());

    for (const periodo in regolamenti) {
        if (periodo.includes("-")) {
            const [inizio, fine] = periodo.split("-").map(Number);
            if (anno >= inizio && anno <= fine) return regolamenti[periodo];
        } else {
            if (Number(periodo) === anno) return regolamenti[periodo];
        }
    }
    return null;
}

// Calcolo dei punti di una singola gara per un pilota
function calcolaPuntiGara(risultato, sistemaPunti) {
    let punti = 0;

    // Punti GP principale
    if (sistemaPunti.punti && risultato.posizione <= sistemaPunti.punti.length) {
        punti += sistemaPunti.punti[risultato.posizione - 1];
    }

    // Fastest lap
    if (sistemaPunti.fastestLap?.attivo && risultato.fastestLap) {
        if (!sistemaPunti.fastestLap.soloTop10 || risultato.posizione <= 10) {
            punti += sistemaPunti.fastestLap.punti;
        }
    }

    // Sprint
    if (sistemaPunti.sprint?.attivo && risultato.sprintPosizione) {
        if (!sistemaPunti.sprint.soloTop8 || risultato.sprintPosizione <= 8) {
            punti += sistemaPunti.sprint.punti[risultato.sprintPosizione - 1];
        }
    }

    return punti;
}

// Funzione principale
async function caricaPilota() {
    const pilotaId = getPilotaId();
    if (!pilotaId) return;

    // Carica tutti i JSON necessari
    const piloti = await fetch("data/piloti.json").then(r => r.json());
    const team = await fetch("data/team.json").then(r => r.json());
    const circuiti = await fetch("data/circuiti.json").then(r => r.json());
    const stagioni = await fetch("data/stagioni.json").then(r => r.json());

    const pilota = piloti.find(p => p.id === pilotaId);
    if (!pilota) return;

    // Info base del pilota
    document.getElementById("pilota-nome").innerText =
        `${pilota.nome} ${pilota.cognome}`;
    document.getElementById("pilota-dataNascita").innerText = pilota.dataNascita;
    document.getElementById("pilota-luogoNascita").innerText = pilota.luogoNascita;
    document.getElementById("pilota-nazionalita").innerText = pilota.nazionalita;

    // Statistiche
    let stats = { gare: 0, vittorie: 0, podi: 0, punti: 0 };
    garePilotaGlobal = [];

    // Ciclo stagioni e gare
    for (const stagione of stagioni) {
        const gare = await fetch(`data/gare/${stagione.anno}.json`).then(r => r.json());
        const sistemaPunti = await getSistemaPunti(stagione.anno);

        for (const gara of gare) {
            for (const r of gara.risultati) {
                if (r.pilotaId === pilotaId) {
                    const punti = calcolaPuntiGara(r, sistemaPunti);

                    stats.gare++;
                    stats.punti += punti;
                    if (r.posizione === 1) stats.vittorie++;
                    if (r.posizione <= 3) stats.podi++;

                    const circuitoObj = circuiti.find(c => c.id === gara.circuitoId);
                    const teamObj = team.find(t => t.id === r.teamId);

                    garePilotaGlobal.push({
                        data: gara.data,
                        gp: gara.nome,
                        circuito: circuitoObj?.nome || gara.circuitoId,
                        team: teamObj?.nome || r.teamId,
                        posizione: r.posizione,
                        punti: punti
                    });
                }
            }
        }
    }

    // Mostra statistiche
    document.getElementById("stat-gare").innerText = stats.gare;
    document.getElementById("stat-vittorie").innerText = stats.vittorie;
    document.getElementById("stat-podi").innerText = stats.podi;
    document.getElementById("stat-punti").innerText = stats.punti;

    // Mostra gare nella tabella
    renderGare(garePilotaGlobal);

    // Grafico pilota
    generaGraficoPilota(stats);
}

// Funzione per visualizzare gare
function renderGare(gare) {
    const tbody = document.getElementById("tbody-gare-pilota");
    tbody.innerHTML = "";

    gare.forEach(g => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${g.data}</td>
            <td>${g.gp}</td>
            <td>${g.circuito}</td>
            <td>${g.team}</td>
            <td>${g.posizione}</td>
            <td>${g.punti}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Grafico pilota
function generaGraficoPilota(stats) {
    const ctx = document.getElementById("grafico-pilota").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Gare", "Vittorie", "Podi", "Punti"],
            datasets: [{ data: [stats.gare, stats.vittorie, stats.podi, stats.punti] }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// Filtri gare
const filtroSelect = document.getElementById("filtro-gare");
if (filtroSelect) {
    filtroSelect.addEventListener("change", () => {
        let valore = filtroSelect.value;
        let gareFiltrate = [];

        if (valore === "tutte") gareFiltrate = garePilotaGlobal;
        else if (valore === "vittorie") gareFiltrate = garePilotaGlobal.filter(g => g.posizione === 1);
        else if (valore === "podi") gareFiltrate = garePilotaGlobal.filter(g => g.posizione <= 3);

        renderGare(gareFiltrate);
    });
}

// Avvio al caricamento della pagina
window.addEventListener("DOMContentLoaded", caricaPilota);
