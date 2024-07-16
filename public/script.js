document.addEventListener('DOMContentLoaded', () => {
    const currentTurnElement = document.getElementById('current-turn');
    const nextTurnButton = document.getElementById('next-turn');
    const turnHistoryElement = document.getElementById('turn-history');
    const pointsElement = document.getElementById('points');
    const volunteerButtons = document.querySelectorAll('[data-volunteer]');
    const confirmPopup = document.getElementById('confirmPopup');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesButton = document.getElementById('confirmYes');
    const confirmNoButton = document.getElementById('confirmNo');
    const overlay = document.getElementById('overlay');

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
        fetch(`/api/current-turn`)
            .then(response => response.json())
            .then(data => updateUI(data))
            .catch(error => console.error('Error:', error));
    }

    function showConfirmPopup(name, isVolunteer = false) {
        const isMale = ['אברהם', 'שני'].includes(name);
        const verb = isMale ? 'בטוח' : 'בטוחה';
        const pronoun = isMale ? 'אתה' : 'את';

        confirmMessage.textContent = `${name}, האם ${pronoun} ${verb} ש${pronoun} רוצה לסמן ש${pronoun} מכי${isMale ? "ן" : "נה"} קפה?`;
        overlay.style.display = 'block';
        confirmPopup.style.display = 'block';

        setTimeout(() => {
            overlay.classList.add('show');
            confirmPopup.classList.add('show');
            animateSteam();
        }, 10);

        return new Promise((resolve) => {
            function handleYes() {
                fetch('/api/send-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name }),
                }).then(function () {
                    const newNote = `<p>נשלח לך מייל לאימות, אנא הקש אותו כאן</p>`
                    const newInput = `<input type='text' id='verify-code-input' />`
                    const newBtn = `<button id="confirmEmail" class="btn-3d">שלח</button>`
                    confirmPopup.innerHTML += `
                        ${newNote}
                        ${newInput}
                        ${newBtn}
                    `
                    document.getElementById('confirmEmail').addEventListener('click', function () {
                        fetch('/api/verify-code', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ code: document.getElementById('verify-code-input').value }),
                        }).then(function (res) {
                            if (res.verified) {
                                hideConfirmPopup();
                                resolve(true);
                            } else {
                                alert('worng!');
                                hideConfirmPopup();
                                resolve(false);
                            }
                        })
                    })

                }).catch(err => console.log(err));
                //hideConfirmPopup();
                //resolve(true);
            }

            function handleNo() {
                hideConfirmPopup();
                resolve(false);
            }

            confirmYesButton.addEventListener('click', handleYes, { once: true });
            confirmNoButton.addEventListener('click', handleNo, { once: true });
        });
    }

    function hideConfirmPopup() {
        overlay.classList.remove('show');
        confirmPopup.classList.remove('show');

        setTimeout(() => {
            overlay.style.display = 'none';
            confirmPopup.style.display = 'none';
        }, 300);
    }

    function animateSteam() {
        const steamPaths = document.querySelectorAll('.steam');
        steamPaths.forEach((path, index) => {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            path.style.animation = `steamAnimation 3s ease-out infinite`;
            path.style.animationDelay = `${index * 0.5}s`;
        });
    }

    nextTurnButton.addEventListener('click', () => {
        showConfirmPopup(currentTurnElement.textContent.split(': ')[1]).then((confirmed) => {
            if (confirmed) {
                nextTurnButton.disabled = true;
                fetch(`/api/next-turn`, { method: 'POST' })
                    .then(response => response.json())
                    .then(data => {
                        updateUI(data);
                        nextTurnButton.disabled = false;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        nextTurnButton.disabled = false;
                    });
            }
        });
    });

    volunteerButtons.forEach(button => {
        button.addEventListener('click', () => {
            const name = button.dataset.volunteer;
            showConfirmPopup(name, true).then((confirmed) => {
                if (confirmed) {
                    fetch(`/api/volunteer`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name }),
                    })
                        .then(response => response.json())
                        .then(data => updateUI(data))
                        .catch(error => console.error('Error:', error));
                }
            });
        });
    });

    fetchCurrentTurn();
});