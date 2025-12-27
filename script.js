let anniDisponibili = [];
let annoCorrente = null;

// -------------------------
// FUNZIONI DI CARICAMENTO
// -------------------------
async function caricaDati(anno) {
    const piloti = await fetch("data/piloti.json").then(r => r.json());
    const team = await fetch("data/team.json").then(r => r.json());
    const stagioni = await fetch("data/stagioni.json").then(r => r.json());
    const gare = await fetch(`data/gare/${anno}.json`).then(r => r.json());
    

    // Calcolo statistiche dinamiche
    const { statsPiloti, statsTeam } = await calcolaStatistiche(gare);

    // Popola le tabelle
    generaTabellaPiloti(statsPiloti, piloti, gare);
    generaTabellaTeam(statsTeam, team, gare);
    generaClassificaPiloti(statsPiloti, piloti);
}

// -------------------------
// CALCOLO STATISTICHE
// -------------------------
async function calcolaStatistiche(gare) {
    const statsPiloti = {};
    const statsTeam = {};

    for (const gara of gare) {
        const regolamento = await getRegolamentoPerAnno(gara.stagione);

        // ---------- SPRINT ----------
        if (gara.sprint && regolamento.sprint?.attivo) {
            gara.sprint.forEach(r => {
                if (!statsPiloti[r.pilotaId]) {
                    statsPiloti[r.pilotaId] = { gare:0, vittorie:0, podi:0, punti:0 };
                }
                if (!statsTeam[r.teamId]) {
                    statsTeam[r.teamId] = { gare:0, vittorie:0, podi:0, punti:0 };
                }

                const puntiSprint = calcolaPuntiSprint(r.posizione, regolamento);
                statsPiloti[r.pilotaId].punti += puntiSprint;
                statsTeam[r.teamId].punti += puntiSprint;
            });
        }

        // ---------- GARA PRINCIPALE ----------
        gara.risultati.forEach(r => {
            if (!statsPiloti[r.pilotaId]) {
                statsPiloti[r.pilotaId] = { gare:0, vittorie:0, podi:0, punti:0 };
            }
            if (!statsTeam[r.teamId]) {
                statsTeam[r.teamId] = { gare:0, vittorie:0, podi:0, punti:0 };
            }

            statsPiloti[r.pilotaId].gare++;
            statsTeam[r.teamId].gare++;

            const puntiGP = calcolaPuntiGP(r.posizione, regolamento);
            const puntiFL = calcolaFastestLap(r, regolamento);

            const puntiTotali = puntiGP + puntiFL;

            statsPiloti[r.pilotaId].punti += puntiTotali;
            statsTeam[r.teamId].punti += puntiTotali;

            if (r.posizione === 1) {
                statsPiloti[r.pilotaId].vittorie++;
                statsTeam[r.teamId].vittorie++;
            }
            if (r.posizione <= 3) {
                statsPiloti[r.pilotaId].podi++;
                statsTeam[r.teamId].podi++;
            }
        });
    }

    return { statsPiloti, statsTeam };
}

// -------------------------
// GENERA TABELLE
// -------------------------
function generaTabellaPiloti(statsPiloti, piloti) {
    const tbody = document.getElementById("tbody-piloti");
    if (!tbody) return;
    tbody.innerHTML = "";

    Object.keys(statsPiloti).forEach(id => {
        const haVinto = statsPiloti[id].vittorie > 0;
        if (!haVinto) return;
        const p = piloti.find(pil => pil.id === id);
        if (!p) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${statsPiloti[id].gare}</td>
            <td><a href="pilota.html?id=${id}">${p.nome} ${p.cognome}</a></td>
            <td>${statsPiloti[id].punti}</td>
        `;
        tbody.appendChild(tr);
    });
}

function generaTabellaTeam(statsTeam, team) {
    const tbody = document.getElementById("tbody-team");
    if (!tbody) return;
    tbody.innerHTML = "";

    Object.keys(statsTeam).forEach(id => {
        if (statsTeam[id].vittorie === 0) return;
        const t = team.find(team => team.id === id);
        if (!t) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${t.nome}</td>
            <td>${statsTeam[id].punti}</td>
            <td>${statsTeam[id].vittorie}</td>
        `;
        tbody.appendChild(tr);
    });
}

function generaClassificaPiloti(statsPiloti, piloti) {
    const tbody = document.getElementById("tbody-classifica");
    if (!tbody) return;
    tbody.innerHTML = "";

    const ordinati = Object.keys(statsPiloti).sort((a, b) => statsPiloti[b].punti - statsPiloti[a].punti);
    ordinati.forEach((id, index) => {
        const p = piloti.find(pil => pil.id === id);
        if (!p) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><a href="pilota.html?id=${id}">${p.nome} ${p.cognome}</a></td>
            <td>${statsPiloti[id].punti}</td>
        `;
        tbody.appendChild(tr);
    });
}

// -------------------------
// ORDINAMENTO TABELLE
// -------------------------
function ordinaTabella(tabellaId, colonnaIndex) {
    const table = document.getElementById(tabellaId);
    if (!table) return;

    let switching = true;
    let dir = "asc";

    while (switching) {
        switching = false;
        const rows = table.rows;
        for (let i = 1; i < rows.length - 1; i++) {
            let shouldSwitch = false;
            const x = rows[i].getElementsByTagName("TD")[colonnaIndex];
            const y = rows[i + 1].getElementsByTagName("TD")[colonnaIndex];

            if (dir === "asc" && x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) shouldSwitch = true;
            if (dir === "desc" && x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) shouldSwitch = true;

            if (shouldSwitch) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
                break;
            }
        }
        if (!switching && dir === "asc") {
            dir = "desc";
            switching = true;
        }
    }
}

// -------------------------
// FILTRO PILOTA
// -------------------------
function filtraPilota() {
    const input = document.getElementById("filtro-pilota");
    if (!input) return;
    const filter = input.value.toUpperCase();
    const table = document.getElementById("tbody-piloti");
    if (!table) return;

    const rows = table.getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
        const td = rows[i].getElementsByTagName("td")[1];
        if (td) {
            const txt = td.textContent || td.innerText;
            rows[i].style.display = txt.toUpperCase().includes(filter) ? "" : "none";
        }
    }
}

// -------------------------
// SELEZIONE ANNO DINAMICA
// -------------------------
const selectAnno = document.getElementById("select-anno");
if (selectAnno) {
    selectAnno.addEventListener("change", () => {
        const anno = selectAnno.value;
        caricaDati(anno);
    });
}

// -------------------------
// EVENT LISTENER
// -------------------------
window.addEventListener("DOMContentLoaded", async () => {
    const stagioni = await fetch("data/stagioni.json").then(r => r.json());

    anniDisponibili = stagioni
        .map(s => s.anno)
        .sort((a, b) => a - b);

    // ✅ ultimo anno disponibile
    annoCorrente = anniDisponibili[anniDisponibili.length - 1];

    aggiornaTitoloClassifica();

    // per ora carichi solo l’anno corretto
    caricaDati(annoCorrente);
    aggiornaFrecce();
});

function aggiornaTitoloClassifica() {
    const titolo = document.getElementById("titolo-classifica");
    if (!titolo) return;

    titolo.innerText = `Classifica piloti (${annoCorrente})`;
}

function aggiornaFrecce() {
    const prevBtn = document.getElementById("anno-prev");
    const nextBtn = document.getElementById("anno-next");

    if (!prevBtn || !nextBtn) return;

    const minAnno = Math.min(...anniDisponibili);
    const maxAnno = Math.max(...anniDisponibili);

    prevBtn.style.visibility = annoCorrente === minAnno ? "hidden" : "visible";
    nextBtn.style.visibility = annoCorrente === maxAnno ? "hidden" : "visible";
};

function cambiaAnno(delta) {
    const index = anniDisponibili.indexOf(annoCorrente);
    const nuovoIndex = index + delta;

    if (nuovoIndex < 0 || nuovoIndex >= anniDisponibili.length) return;

    annoCorrente = anniDisponibili[nuovoIndex];
    aggiornaTitoloClassifica();
    caricaDati(annoCorrente);
    aggiornaFrecce();
}

document.getElementById("anno-prev")?.addEventListener("click", () => {
    cambiaAnno(-1);
});

document.getElementById("anno-next")?.addEventListener("click", () => {
    cambiaAnno(1);
});

async function getRegolamentoPerAnno(anno) {
    const regolamenti = await fetch("data/regolamenti.json").then(r => r.json());

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

function calcolaPuntiGP(posizione, regolamento) {
    if (!regolamento.punti) return 0;
    return regolamento.punti[posizione - 1] || 0;
}

function calcolaPuntiSprint(posizione, regolamento) {
    if (!regolamento.sprint?.attivo) return 0;
    return regolamento.sprint.punti[posizione - 1] || 0;
}

function calcolaFastestLap(risultato, regolamento) {
    if (!regolamento.fastestLap?.attivo) return 0;
    if (!risultato.fastestLap) return 0;

    if (
        regolamento.fastestLap.soloTop10 &&
        risultato.posizione > 10
    ) return 0;

    return regolamento.fastestLap.punti;
}

function ordinaClassifica(stats) {
    return Object.entries(stats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.punti - a.punti);
}

async function calcolaAlboDOro(stagioni) {
    const alboOroPiloti = {};
    const alboOroTeam = {};

    for (const stagione of stagioni) {
        const gare = await fetch(`data/${stagione.anno}.json`).then(r => r.json());

        const { statsPiloti, statsTeam } = await calcolaStatistiche(gare);

        const classificaPiloti = ordinaClassifica(statsPiloti);
        const classificaTeam = ordinaClassifica(statsTeam);

        if (classificaPiloti.length > 0) {
            alboOroPiloti[stagione.anno] = classificaPiloti[0].id;
        }

        if (classificaTeam.length > 0) {
            alboOroTeam[stagione.anno] = classificaTeam[0].id;
        }
    }

    return { alboOroPiloti, alboOroTeam };
}
