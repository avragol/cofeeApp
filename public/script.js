document.addEventListener('DOMContentLoaded', () => {
    const currentTurnElement = document.getElementById('current-turn');
    const nextTurnButton = document.getElementById('next-turn');
    const turnHistoryElement = document.getElementById('turn-history');
    const pointsElement = document.getElementById('points');
    const volunteerButtons = document.querySelectorAll('[data-volunteer]');

    function updateUI(data) {
        currentTurnElement.textContent = `התור הנוכחי: ${data.currentTurn}`;

        turnHistoryElement.innerHTML = data.history.map(entry =>
            `<li class="list-group-item d-flex justify-content-between align-items-center">
                ${entry}
                <span class="badge bg-primary rounded-pill">
                    <i class="bi bi-clock"></i>
                </span>
            </li>`
        ).join('');

        pointsElement.innerHTML = Object.entries(data.points).map(([name, points]) =>
            `<li class="list-group-item d-flex justify-content-between align-items-center">
                ${name}
                <span class="badge bg-success rounded-pill">${points}</span>
            </li>`
        ).join('');
    }

    function fetchCurrentTurn() {
        fetch(`${window.env.SERVER_URL}/api/current-turn`)
            .then(response => response.json())
            .then(data => updateUI(data))
            .catch(error => console.error('Error:', error));
    }

    nextTurnButton.addEventListener('click', () => {
        nextTurnButton.disabled = true;
        fetch(`${window.env.SERVER_URL}/api/next-turn`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                updateUI(data);
                nextTurnButton.disabled = false;
            })
            .catch(error => {
                console.error('Error:', error);
                nextTurnButton.disabled = false;
            });
    });

    volunteerButtons.forEach(button => {
        button.addEventListener('click', () => {
            const name = button.dataset.volunteer;
            fetch(`${window.env.SERVER_URL}/api/volunteer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            })
                .then(response => response.json())
                .then(data => updateUI(data))
                .catch(error => console.error('Error:', error));
        });
    });

    fetchCurrentTurn();
});