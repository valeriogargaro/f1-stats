window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    const response = await fetch('data/piloti.json');
    const piloti = await response.json();
    
    const pilota = piloti.find(p => p.id === id);
    if (!pilota) return alert("Pilota non trovato!");
    const anni = [];
    const punti = [];
    pilota.team.forEach(stagione => {
        anni.push(stagione.anno);
        punti.push(stagione.punti);
    });
    const ctx = document.getElementById("graficoPilota");
    
    if (ctx) {
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: anni,
                datasets: [{
                    label: "Punti per stagione",
                    data: punti,
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Popola info generali
    document.getElementById('nome-pilota').textContent = `${pilota.nome} ${pilota.cognome}`;
    document.getElementById('info-generali').textContent =
        `Nato il ${pilota.dataNascita} a ${pilota.luogoNascita} - Nazionalità: ${pilota.nazionalita}.`;

    // Popola tabella statistiche
    const tbody = document.querySelector('#tabella-statistiche tbody');
    pilota.team.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = 
        `<td>${pilota.anno}</td>
        <td><a href="pilota.html?id=${pilota.pilotaId}">${pilota.pilota}</a></td>
        <td>${pilota.team}</td>`;
        tbody.appendChild(tr);
    });
});


