// -------------------------
// FUNZIONI DI CARICAMENTO
// -------------------------
async function caricaDati(anno) {
    const piloti = await fetch("data/piloti.json").then(r => r.json());
    const team = await fetch("data/team.json").then(r => r.json());
    const stagioni = await fetch("data/stagioni.json").then(r => r.json());
    const gare = await fetch(`data/gare/${anno}.json`).then(r => r.json());

    // Calcolo statistiche dinamiche
    const { statsPiloti, statsTeam } = calcolaStatistiche(gare);

    // Popola le tabelle
    generaTabellaPiloti(statsPiloti, piloti, gare);
    generaTabellaTeam(statsTeam, team, gare);
    generaClassificaPiloti(statsPiloti, piloti);
}

// -------------------------
// CALCOLO STATISTICHE
// -------------------------
function calcolaStatistiche(gare) {
    const statsPiloti = {};
    const statsTeam = {};

    gare.forEach(gara => {
        gara.risultati.forEach(r => {
            // Statistiche pilota
            if (!statsPiloti[r.pilotaId]) statsPiloti[r.pilotaId] = { gare: 0, vittorie: 0, podi: 0, punti: 0 };
            statsPiloti[r.pilotaId].gare++;
            statsPiloti[r.pilotaId].punti += r.punti;
            if (r.posizione === 1) statsPiloti[r.pilotaId].vittorie++;
            if (r.posizione <= 3) statsPiloti[r.pilotaId].podi++;

            // Statistiche team
            if (!statsTeam[r.teamId]) statsTeam[r.teamId] = { gare: 0, vittorie: 0, podi: 0, punti: 0 };
            statsTeam[r.teamId].gare++;
            statsTeam[r.teamId].punti += r.punti;
            if (r.posizione === 1) statsTeam[r.teamId].vittorie++;
            if (r.posizione <= 3) statsTeam[r.teamId].podi++;
        });
    });

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
window.addEventListener("DOMContentLoaded", () => {
    // Carica anno di default o primo disponibile
    const annoDefault = selectAnno ? selectAnno.value : 2016;
    caricaDati(annoDefault);
});
