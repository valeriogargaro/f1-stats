let anniDisponibili = [];
let annoCorrente = null;

// -------------------------
// FUNZIONI DI CARICAMENTO
// -------------------------
async function caricaDati(anno) {
    const piloti = await fetch("data/piloti.json").then(r => r.json());
    const team = await fetch("data/team.json").then(r => r.json());

    // Carica gare con fallback a array vuoto se manca il file
    let gare = [];
    try {
        gare = await fetch(`data/gare/${anno}.json`).then(r => r.json());
    } catch (e) {
        console.warn(`Impossibile caricare le gare per ${anno}:`, e);
    }

    const { statsPiloti, statsTeam } = await calcolaStatistiche(gare);

    // Classifica dinamica
    generaClassificaPiloti(statsPiloti, piloti);
    generaClassificaTeam(statsTeam, team);
}

// -------------------------
// CALCOLO STATISTICHE
// -------------------------
async function calcolaStatistiche(gare) {
    // se gare non è un array, forza un array vuoto
    if (!Array.isArray(gare)) gare = [];

    const statsPiloti = {};
    const statsTeam = {};

    for (const gara of gare) {
        const regolamento = await getRegolamentoPerAnno(gara.stagione);

        // SPRINT
        if (gara.sprint && regolamento.sprint?.attivo) {
            gara.sprint.forEach(r => {
                if (!statsPiloti[r.pilotaId]) statsPiloti[r.pilotaId] = { gare:0, vittorie:0, podi:0, punti:0 };
                if (!statsTeam[r.teamId]) statsTeam[r.teamId] = { gare:0, vittorie:0, podi:0, punti:0 };

                statsPiloti[r.pilotaId].punti += calcolaPuntiSprint(r.posizione, regolamento);
                statsTeam[r.teamId].punti += calcolaPuntiSprint(r.posizione, regolamento);
            });
        }

        // GARA PRINCIPALE
        if (Array.isArray(gara.risultati)) {
            gara.risultati.forEach(r => {
                if (!statsPiloti[r.pilotaId]) statsPiloti[r.pilotaId] = { gare:0, vittorie:0, podi:0, punti:0 };
                if (!statsTeam[r.teamId]) statsTeam[r.teamId] = { gare:0, vittorie:0, podi:0, punti:0 };

                statsPiloti[r.pilotaId].gare++;
                statsTeam[r.teamId].gare++;

                const puntiTot = calcolaPuntiGP(r.posizione, regolamento) + calcolaFastestLap(r, regolamento);
                statsPiloti[r.pilotaId].punti += puntiTot;
                statsTeam[r.teamId].punti += puntiTot;

                if (r.posizione === 1) { statsPiloti[r.pilotaId].vittorie++; statsTeam[r.teamId].vittorie++; }
                if (r.posizione <= 3) { statsPiloti[r.pilotaId].podi++; statsTeam[r.teamId].podi++; }
            });
        }
    }

    return { statsPiloti, statsTeam };
}

// -------------------------
// CLASSIFICA DINAMICA
// -------------------------
function generaClassificaPiloti(statsPiloti, piloti) {
    const tbody = document.getElementById("tbody-classifica");
    if (!tbody) return;
    tbody.innerHTML = "";

    const ordinati = Object.keys(statsPiloti)
        .sort((a,b) => statsPiloti[b].punti - statsPiloti[a].punti);

    ordinati.forEach((id, index) => {
        const p = piloti.find(pl => pl.id === id);
        if (!p) return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index+1}</td>
            <td><a href="pilota.html?id=${id}">${p.nome} ${p.cognome}</a></td>
            <td>${statsPiloti[id].punti}</td>
        `;
        tbody.appendChild(tr);
    });
}

function generaClassificaTeam(statsTeam, team) {
    // opzionale: se vuoi anche classifica team dinamica
}

// -------------------------
// ALBO D'ORO
// -------------------------
async function calcolaAlboDOro(stagioni) {
    const alboOroPiloti = {};
    const alboOroTeam = {};

    for (const stagione of stagioni) {
        let gare = [];
        try {
            gare = await fetch(`data/gare/${stagione.anno}.json`).then(r => r.json());
        } catch(e) {
            console.warn(`Errore caricando le gare per l'anno ${stagione.anno}`, e);
            gare = [];
        }

        const { statsPiloti, statsTeam } = await calcolaStatistiche(gare);

        const classificaPiloti = ordinaClassifica(statsPiloti);
        const classificaTeam = ordinaClassifica(statsTeam);

        if (classificaPiloti.length > 0) {
            const vincitore = classificaPiloti[0];
            // trova il team principale del vincitore in quella stagione
            let teamId = null;
            for (const gara of gare) {
                const res = gara.risultati.find(r => r.pilotaId === vincitore.id && r.posizione === 1);
                if (res) {
                    teamId = res.teamId;
                    break;
                }
            }
            alboOroPiloti[stagione.anno] = { pilotaId: vincitore.id, teamId };
        }

        if (classificaTeam.length > 0) {
            const vincitoreTeam = classificaTeam[0];
            alboOroTeam[stagione.anno] = vincitoreTeam.id;
        }
    }

    return { alboOroPiloti, alboOroTeam };
}

async function renderAlboOroPiloti(albo) {
    const tbody = document.getElementById("tbody-albo-piloti");
    if (!tbody) return;

    // Carica i dati dei piloti e dei team
    const piloti = await fetch("data/piloti.json").then(r => r.json());
    const team = await fetch("data/team.json").then(r => r.json());

    tbody.innerHTML = "";

    Object.entries(albo)
        .sort(([a], [b]) => b - a) // anni discendente
        .forEach(([anno, { pilotaId, teamId }]) => {
            const pilota = piloti.find(p => p.id === pilotaId);
            const t = team.find(t => t.id === teamId);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${anno}</td>
                <td>${pilota ? `${pilota.nome} ${pilota.cognome}` : pilotaId}</td>
                <td>${t ? t.nome : teamId}</td>
            `;
            tbody.appendChild(tr);
        });
}

function renderAlboOroTeam(albo, team) {
    const tbody = document.getElementById("tbody-albo-team");
    if (!tbody) return;
    tbody.innerHTML = "";

    Object.entries(albo)
        .sort(([a],[b]) => b - a)
        .forEach(([anno, teamId]) => {
            const t = team.find(tm => tm.id === teamId);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${anno}</td>
                <td>${t ? t.nome : teamId}</td>
            `;
            tbody.appendChild(tr);
        });
}

// -------------------------
// UTILITY
// -------------------------
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
    if (!regolamento?.punti) return 0;
    return regolamento.punti[posizione - 1] || 0;
}

function calcolaPuntiSprint(posizione, regolamento) {
    if (!regolamento?.sprint?.attivo) return 0;
    return regolamento.sprint.punti[posizione - 1] || 0;
}

function calcolaFastestLap(risultato, regolamento) {
    if (!regolamento?.fastestLap?.attivo) return 0;
    if (!risultato.fastestLap) return 0;

    if (regolamento.fastestLap.soloTop10 && risultato.posizione > 10) return 0;
    return regolamento.fastestLap.punti;
}

function ordinaClassifica(stats) {
    return Object.entries(stats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a,b) => b.punti - a.punti);
}

// -------------------------
// SELEZIONE ANNO DINAMICA
// -------------------------
const selectAnno = document.getElementById("select-anno");
if (selectAnno) {
    selectAnno.addEventListener("change", () => {
        annoCorrente = Number(selectAnno.value);
        aggiornaTitoloClassifica();
        caricaDati(annoCorrente);
    });
}

// -------------------------
// EVENT LISTENER DOMContentLoaded
// -------------------------
window.addEventListener("DOMContentLoaded", async () => {
    const stagioni = await fetch("data/stagioni.json").then(r => r.json());
    const piloti = await fetch("data/piloti.json").then(r => r.json());
    const team = await fetch("data/team.json").then(r => r.json());

    anniDisponibili = stagioni.map(s => s.anno).sort((a,b)=>a-b);
    annoCorrente = anniDisponibili[anniDisponibili.length - 1];

    // Calcola e renderizza albo d'oro UNA SOLA VOLTA
    const { alboOroPiloti, alboOroTeam } = await calcolaAlboDOro(stagioni);
    renderAlboOroPiloti(alboOroPiloti, piloti);
    renderAlboOroTeam(alboOroTeam, team);

    // Carica classifica corrente
    aggiornaTitoloClassifica();
    caricaDati(annoCorrente);

    // Aggiorna frecce navigazione anno
    aggiornaFrecce();
});

// -------------------------
// NAVIGAZIONE ANNI
// -------------------------
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
}

function cambiaAnno(delta) {
    const index = anniDisponibili.indexOf(annoCorrente);
    const nuovoIndex = index + delta;
    if (nuovoIndex < 0 || nuovoIndex >= anniDisponibili.length) return;

    annoCorrente = anniDisponibili[nuovoIndex];
    aggiornaTitoloClassifica();
    caricaDati(annoCorrente);
    aggiornaFrecce();
}

document.getElementById("anno-prev")?.addEventListener("click", ()=> cambiaAnno(-1));
document.getElementById("anno-next")?.addEventListener("click", ()=> cambiaAnno(1));

// -------------------------
// FILTRO PILOTA
// -------------------------
function filtraPilota() {
    const input = document.getElementById("filtro-pilota");
    if (!input) return;
    const filter = input.value.toUpperCase();
    const table = document.getElementById("tbody-classifica");
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
