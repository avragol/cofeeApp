document.addEventListener('DOMContentLoaded', () => {
    const currentTurnElement = document.getElementById('current-turn');
    const nextTurnButton = document.getElementById('next-turn');
    const turnHistoryElement = document.getElementById('turn-history');
    const pointsElement = document.getElementById('points');
    const volunteerButtons = document.querySelectorAll('[data-volunteer]');
    const confirmPopup = document.getElementById('confirmPopup');
    const ratingPopup = document.getElementById('ratingPopup');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesButton = document.getElementById('confirmYes');
    const confirmNoButton = document.getElementById('confirmNo');
    const overlay = document.getElementById('overlay');


    function updateUI(data) {
        currentTurnElement.textContent = `התור הנוכחי: ${data.currentTurn}`;

        turnHistoryElement.innerHTML = data.history.map(entry =>
            `<li class="list-group-item d-flex justify-content-between align-items-center coffee-entry " data-entry="${entry}" style="cursor:pointer">
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

        // Add click event listeners to coffee entries
        document.querySelectorAll('.coffee-entry').forEach(entry => {
            entry.addEventListener('click', () => showRatingPopup(entry.dataset.entry));
        });
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
                hideConfirmPopup();
                resolve(true);
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
        ratingPopup.classList.remove('show');

        setTimeout(() => {
            overlay.style.display = 'none';
            confirmPopup.style.display = 'none';
            ratingPopup.style.display = 'none';
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


    function showRatingPopup(entry) {
        const [name, date] = entry.split(' - ');
        const nameText = name.replace(" (התנדב)", "");
        const [day, month, year] = date.split('.').map(Number);
        const entryDate = new Date(year, month - 1, day);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        let dateText = `ב-${date}`;
        if (entryDate.toDateString() === today.toDateString()) {
            dateText = "היום";
        } else if (entryDate.toDateString() === yesterday.toDateString()) {
            dateText = "אתמול";
        }
        const makeTranslate = name === 'חביבה' ? "הכינה" : "הכין"
        const ratingHeading = `דרג את הקפה ש${nameText} ${makeTranslate} ${dateText}`;
        ratingPopup.innerHTML = `
            <h3>${ratingHeading}</h3>           
            <div class="rating-buttons d-flex flex-wrap flex-md-nowrap container-flex">
                <button class="btn btn-danger flex-item" data-rating="1">לא משהו</button>
                <button class="btn btn-warning flex-item" data-rating="2">סבבה</button>
                <button class="btn btn-success flex-item" data-rating="3">לג'נד</button>
            </div>
        `;
        overlay.style.display = 'block';
        ratingPopup.style.display = 'block';

        setTimeout(() => {
            overlay.classList.add('show');
            ratingPopup.classList.add('show');
        }, 10);

        ratingPopup.querySelectorAll('[data-rating]').forEach(button => {
            button.addEventListener('click', () => {
                const rating = button.dataset.rating;
                submitRating(name, rating);
                hideConfirmPopup();
            });
        });
    }

    overlay.addEventListener('click', hideConfirmPopup)

    function submitRating(name, rating) {
        fetch('/api/rate-coffee', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, rating }),
        })
            .then(response => response.json())
            .then(data => updateUI(data))
            .catch(error => console.error('Error:', error));
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