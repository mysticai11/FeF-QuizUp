// Existing variables and functions
let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let userAnswers = [];
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
let isDarkMode = localStorage.getItem('isDarkMode') === 'true';
let isMuted = localStorage.getItem('isMuted') === 'true';
let playerLevel = parseInt(localStorage.getItem('playerLevel')) || 1;
let playerXP = parseInt(localStorage.getItem('playerXP')) || 0;
let audio = new Audio('path/to/your/background-music.mp3');
let correctSound = new Audio('media/correct-sound.mp3');
let incorrectSound = new Audio('media/incorrect-sound.mp3');
let selectedAvatar = null;
audio.loop = true;

const categories = {
    entertainment: ['Movies', 'Anime', 'HarryPotter', 'Comics'],
    academics: ['ComputerScience', 'Science', 'GeneralKnowledge', 'Aptitude']
};

function showAlert(message) {
    const alertElement = document.getElementById('customAlert');
    alertElement.textContent = message;
    alertElement.style.display = 'block';
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    const icon = document.querySelector('#darkModeToggle i');
    icon.className = isDarkMode ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('isDarkMode', isDarkMode);
    if (isDarkMode) {
        document.body.style.background = '#0f172a';
        document.body.style.color = '#f8fafc';
    } else {
        document.body.style.background = '#f0f4f8';
        document.body.style.color = '#2d3748';
    }
}

function toggleMute() {
    isMuted = !isMuted;
    audio.muted = isMuted;
    correctSound.muted = isMuted;
    incorrectSound.muted = isMuted;
    const icon = document.querySelector('#muteToggle i');
    icon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    localStorage.setItem('isMuted', isMuted);
}

function showHome() {
    document.getElementById('welcomeContainer').classList.remove('hidden');
    document.getElementById('categoryContainer').classList.add('hidden');
    document.getElementById('quiz').classList.add('hidden');
    document.getElementById('scoreContainer').classList.add('hidden');
    document.getElementById('reviewContainer').classList.add('hidden');
    document.getElementById('leaderboardContainer').classList.add('hidden');
}

function showCategories() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
      showAlert('Please enter your name before starting the quiz!');
      return;
    }
    if (!selectedAvatar) {
      showAlert('Please select an avatar before starting the quiz!');
      return;
    }
    document.getElementById('welcomeContainer').classList.add('hidden');
    document.getElementById('categoryContainer').classList.remove('hidden');

    const entertainmentGrid = document.getElementById('entertainmentGrid');
    const academicsGrid = document.getElementById('academicsGrid');

    entertainmentGrid.innerHTML = '';
    academicsGrid.innerHTML = '';

    categories.entertainment.forEach(category => {
        const card = createCategoryCard(category);
        entertainmentGrid.appendChild(card);
    });

    categories.academics.forEach(category => {
        const card = createCategoryCard(category);
        academicsGrid.appendChild(card);
    });
}

function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.onclick = () => startQuiz(category);
    card.innerHTML = `
        <img src="media/${category.toLowerCase()}.gif" alt="${category}" loading="lazy">
        <h3>${category}</h3>
    `;
    return card;
}

function navigateTo(page) {
    history.pushState({ page: page }, '', `#${page}`);
    switch(page) {
        case 'home':
            showHome();
            break;
        case 'categories':
            showCategories();
            break;
        case 'leaderboard':
            showLeaderboard();
            break;
    }
}

async function startQuiz(category) {
    showLoadingAnimation();
    const fetchSuccessful = await fetchQuestions(category);
    hideLoadingAnimation();
    if (fetchSuccessful) {
        document.getElementById('categoryContainer').classList.add('hidden');
        document.getElementById('quiz').classList.remove('hidden');
        showQuestion();
    } else {
        showAlert('Failed to fetch questions. Please try again.');
        showCategories();
    }
}

async function fetchQuestions(category) {
    let apiUrl;
    switch (category) {
        case 'Movies':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=11&type=multiple';
            break;
        case 'Anime':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=31&type=multiple';
            break;
        case 'HarryPotter':
            apiUrl = 'https://hp-api.onrender.com/api/spells';
            break;
        case 'Comics':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=29&type=multiple';
            break;
        case 'ComputerScience':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=18&type=multiple';
            break;
        case 'Science':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=17&type=multiple';
            break;
        case 'G.K':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=9&type=multiple';
            break;
        case 'Aptitude':
            apiUrl = 'https://opentdb.com/api.php?amount=10&category=19&type=multiple';
            break;
        default:
            showAlert('Category not found!');
            return false;
    }
        
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to load questions: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        // Rest of the function...
        
        if (category === 'HarryPotter') {
            questions = data.slice(0, 10).map(spell => ({
                question: `What is the effect of the spell "${spell.name}"?`,
                answers: shuffle([
                    spell.description,
                    'Disarms an opponent',
                    'Creates a shield charm',
                    'Reduces an object to pieces'
                ]),
                correct: spell.description
            }));
        } else {
            questions = data.results.map(question => ({
                question: decodeHtml(question.question),
                answers: shuffle([
                    ...question.incorrect_answers.map(decodeHtml),
                    decodeHtml(question.correct_answer)
                ]),
                correct: decodeHtml(question.correct_answer)
            }));
        }
        
        // Ensure valid questions
        questions = questions.filter(q =>
            q.question && q.correct && q.answers &&
            q.answers.length === 4 &&
            new Set(q.answers).size === 4
        );
        
        if (questions.length < 5) {
            throw new Error('Not enough valid questions');
        }
        
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        return true;
    } catch (error) {
        console.error('Error fetching questions:', error);
        showAlert('Failed to fetch questions. Please try again.');
        return false;
    }
}

function decodeHtml(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function showQuestion() {
    const questionContainer = document.getElementById("questionContainer");
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = `<div class="progress" style="width: ${(currentQuestionIndex / questions.length) * 100}%"></div>`;
        
    const question = questions[currentQuestionIndex];
        
    questionContainer.innerHTML = `
        ${progressBar.outerHTML}
        <div class="question-content">
            <h3>${question.question}</h3>
            <ul>
                ${question.answers.map((answer, index) => `
                    <li>
                        <button 
                            class="option-button" 
                            onclick="checkAnswer('${answer.replace(/'/g, "\\'")}')"
                            style="animation: fadeIn 0.3s ease ${index * 0.1}s forwards">
                            ${answer}
                        </button>
                    </li>`).join('')}
            </ul>
        </div>
    `;
        
    document.getElementById("currentQuestionNumber").textContent = currentQuestionIndex + 1;
    document.getElementById("totalQuestions").textContent = questions.length;
}

function checkAnswer(selectedAnswer) {
    const question = questions[currentQuestionIndex];
    userAnswers.push({ 
        question: question.question, 
        selected: selectedAnswer, 
        correct: question.correct 
    });
        
    const buttons = document.querySelectorAll(".option-button");
    const isCorrect = selectedAnswer === question.correct;
        
    buttons.forEach(button => {
        const buttonAnswer = button.textContent.trim();
        if (buttonAnswer === question.correct) {
            button.classList.add("correct");
        } else if (buttonAnswer === selectedAnswer) {
            button.classList.add("incorrect");
        }
        button.disabled = true;
    });
    
    const feedbackMessage = document.getElementById("feedbackMessage");
    feedbackMessage.textContent = isCorrect ? "Correct! Well done!" : `Incorrect. The correct answer is: ${question.correct}`;
    feedbackMessage.className = `feedback-message ${isCorrect ? 'correct' : 'incorrect'} show`;
    
    // Play sound effect
    if (isCorrect) {
        if (!isMuted) correctSound.play();
        score++;
    } else {
        if (!isMuted) incorrectSound.play();
    }
    
    setTimeout(() => {
        feedbackMessage.classList.remove("show");
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            showQuestion();
        } else {
            showScore();
        }
    }, 2000);
    }
    
    function showScore() {
        document.getElementById('quiz').classList.add('hidden');
        document.getElementById('scoreContainer').classList.remove('hidden');
                    
        const finalScore = document.getElementById("finalScore");
        const percentage = (score / questions.length) * 100;
        finalScore.innerHTML = `
            <h3>Your Final Score: ${score} out of ${questions.length}</h3>
            <p>Percentage: ${percentage.toFixed(1)}%</p>
        `;
                    
        updatePlayerProgress();
        updateLeaderboard();
        displayLevelInfo();
    }
    
    function updatePlayerProgress() {
        const xpGained = score * 10; // 10 XP per correct answer
        playerXP += xpGained;
                    
        while (playerXP >= playerLevel * 100) { // Level up when XP reaches level * 100
            playerXP -= playerLevel * 100;
            playerLevel++;
        }
                    
        localStorage.setItem('playerLevel', playerLevel);
        localStorage.setItem('playerXP', playerXP);
    }
    
    function displayLevelInfo() {
        const levelInfo = document.getElementById('levelInfo');
        levelInfo.innerHTML = `
            <h3>Level: ${playerLevel}</h3>
            <p>XP: ${playerXP} / ${playerLevel * 100}</p>
            <div class="xp-bar">
                <div class="xp-progress" style="width: ${(playerXP / (playerLevel * 100)) * 100}%"></div>
            </div>
        `;
    }
    
    function updateLeaderboard() {
        const playerName = document.getElementById('playerName').value.trim();
        const newEntry = { 
            name: playerName, 
            score: score,
            total: questions.length,
            percentage: ((score / questions.length) * 100).toFixed(1),
            level: playerLevel,
            avatar: selectedAvatar.src
        };
                    
        leaderboard.push(newEntry);
        leaderboard.sort((a, b) => (b.score/b.total) - (a.score/a.total));
        leaderboard = leaderboard.slice(0, 10); // Keep only top 10
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    }
    
    function showLeaderboard() {
        document.getElementById('scoreContainer').classList.add('hidden');
        document.getElementById('leaderboardContainer').classList.remove('hidden');
        displayLeaderboard();
    }
    
    function displayLeaderboard() {
        const leaderboardList = document.getElementById("leaderboardList");
        leaderboardList.innerHTML = leaderboard.map((entry, index) => `
          <div class="leaderboard-entry" style="animation: fadeIn 0.3s ease ${index * 0.1}s forwards">
            <span>${index + 1}. ${entry.name} <img src="${entry.avatar}" alt="Avatar" class="leaderboard-avatar"></span>
            <span>${entry.score}/${entry.total} (${entry.percentage}%) - Level ${entry.level}</span>
          </div>
        `).join('');
    
        // Display the selected avatar
        document.getElementById('selected-avatar').innerHTML = `
          <img src="${selectedAvatar.src}" alt="Avatar" class="selected-avatar">
        `;
    }
    
    function clearLeaderboard() {
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'confirm-dialog';
        confirmDialog.innerHTML = `
            <div class="confirm-dialog-content">
                <p>Are you sure you want to clear the leaderboard?</p>
                <div class="button-group">
                    <button onclick="confirmClearLeaderboard(true)">Yes</button>
                    <button onclick="confirmClearLeaderboard(false)">No</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmDialog);
    }
    
    function confirmClearLeaderboard(confirmed) {
        if (confirmed) {
            leaderboard = [];
            localStorage.removeItem('leaderboard');
            displayLeaderboard();
            showAlert('Leaderboard cleared!');
            document.querySelector('.confirm-dialog').remove();
            document.getElementById('leaderboardList').innerHTML = '';
        } else {
            document.querySelector('.confirm-dialog').remove();
        }
    }
    
    function reviewAnswers() {
        document.getElementById('scoreContainer').classList.add('hidden');
        document.getElementById('reviewContainer').classList.remove('hidden');
                    
        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = userAnswers.map((answer, index) => `
            <div class="review-item ${answer.selected === answer.correct ? 'correct' : 'incorrect'}">
                <h4>Question ${index + 1}</h4>
                <p><strong>Q:</strong> ${answer.question}</p>
                <div class="review-answer ${answer.selected === answer.correct ? 'correct' : 'incorrect'} selected">
                    <strong>Your answer:</strong> ${answer.selected}
                </div>
                ${answer.selected !== answer.correct ? `
                    <div class="review-answer correct">
                        <strong>Correct answer:</strong> ${answer.correct}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    function playAgain() {
        currentQuestionIndex = 0;
        score = 0;
        questions = [];
        userAnswers = [];
        document.getElementById('reviewList').innerHTML = '';
        showCategories();
    }
    
    function showLoadingAnimation() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loadingOverlay);
    }
    
    function hideLoadingAnimation() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        showHome();
                    
        document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
        document.getElementById('muteToggle').addEventListener('click', toggleMute);
                    
        // Initialize particles.js
        particlesJS.load('particles-js', 'particles.json', function() {
            console.log('particles.js loaded - callback');
        });
                    
        // Start playing background music when the page loads
        audio.play();
    });
    
    // Handle browser navigation
    window.onpopstate = function(event) {
        if (event.state) {
            switch(event.state.page) {
                case 'home':
                    showHome();
                    break;
                case 'categories':
                    showCategories();
                    break;
                case 'leaderboard':
                    showLeaderboard();
                    break;
            }
        }
    };
    
    function navigateTo(page) {
        switch(page) {
            case 'home':
                showHome();
                break;
            case 'leaderboard':
                showLeaderboard();
                break;
            // Add more cases as needed
        }
    }
    
    // Add event listeners to the avatars
    document.querySelectorAll('.avatar').forEach(avatar => {
        avatar.addEventListener('click', () => {
            // Remove the selected class from all avatars
            document.querySelectorAll('.avatar').forEach(a => a.classList.remove('selected'));
            // Add the selected class to the clicked avatar
            avatar.classList.add('selected');
            // Update the selectedAvatar variable
            selectedAvatar = avatar;
        });
    });