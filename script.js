// Funzione per caricare i dati dal JSON
async function caricaDati() {
    const response = await fetch('data/champions.json');
    const data = await response.json();

    // Popola la tabella dei piloti
    const tbodyPiloti = document.getElementById('tbody-piloti');
    data.piloti.forEach(pilota => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${pilota.anno}</td><td>${pilota.nome}</td><td>${pilota.team}</td>`;
        tbodyPiloti.appendChild(tr);
    });

    // Popola la tabella dei team
    const tbodyTeam = document.getElementById('tbody-team');
    data.team.forEach(team => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${team.anno}</td><td>${team.team}</td>`;
        tbodyTeam.appendChild(tr);
    });
    
    // Popola la classifica piloti
    const tbodyClassifica = document.getElementById('tbody-classifica');
    data.classifiche.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.posizione}</td><td>${c.pilota}</td><td>${c.punti}</td>`;
        tbodyClassifica.appendChild(tr);
    });
};

// Chiama la funzione al caricamento della pagina
window.addEventListener('DOMContentLoaded', () => {
    caricaDati();
});

function ordinaTabella(tabellaId, colonnaIndex) {
    const table = document.getElementById(tabellaId);
    let switching = true;
    let dir = "asc";
    
    while (switching) {
        switching = false;
        const rows = table.rows;
        for (let i = 1; i < rows.length - 1; i++) {
            let shouldSwitch = false;
            let x = rows[i].getElementsByTagName("TD")[colonnaIndex];
            let y = rows[i + 1].getElementsByTagName("TD")[colonnaIndex];
            
            if (dir === "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir === "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        } else if (dir === "asc") {
            dir = "desc";
            switching = true;
        }
    }
}

function filtraPilota() {
    const input = document.getElementById("filtro-pilota"); // input
    const filter = input.value.toUpperCase();
    const table = document.getElementById("tbody-piloti"); // tbody
    const rows = table.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const td = rows[i].getElementsByTagName("td")[1]; // colonna pilota
        if (td) {
            const txtValue = td.textContent || td.innerText;
            rows[i].style.display = txtValue.toUpperCase().includes(filter) ? "" : "none";
        }
    }
}

fetch('data/stats_piloti.json')
  .then(response => response.json())
  .then(stats => {
    const tbody = document.getElementById('tbody-stats-piloti');

    stats.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.titoli}</td>
        <td>${p.vittorie}</td>
        <td>${p.podi}</td>
        <td>${p.pole}</td>
      `;
      tbody.appendChild(tr);
    
    const pilotaPiuVincente = stats.reduce((max, p) =>
    p.vittorie > max.vittorie ? p : max
    );

    document.getElementById("record-vittorie").innerText =
        `Pilota più vincente: ${pilotaPiuVincente.nome} (${pilotaPiuVincente.vittorie} vittorie)`;


    console.log("Pilota più vincente:", pilotaPiuVincente.nome);
    });
  });
