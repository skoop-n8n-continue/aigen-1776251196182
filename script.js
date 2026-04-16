document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const RSS_FEED_URL = 'https://static.espncricinfo.com/rss/livescores.xml';
    const CORS_PROXY = 'https://api.cors.lol/?url=';
    const REFRESH_INTERVAL = 60000; // 60 seconds
    const LIVE_MATCH_ROTATION_INTERVAL = 10000; // 10 seconds per match

    // DOM Elements
    const elements = {
        clock: document.getElementById('clock'),
        date: document.getElementById('date'),
        liveContainer: document.getElementById('live-match-container'),
        matchesList: document.getElementById('matches-list'),
        ticker: document.getElementById('ticker')
    };

    // State
    let state = {
        matches: [],
        currentIndex: 0,
        rotationTimer: null
    };

    // Initialize
    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        fetchData();
        setInterval(fetchData, REFRESH_INTERVAL);

        // Start Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Clock & Date
    function updateClock() {
        const now = new Date();
        elements.clock.textContent = now.toLocaleTimeString('en-US', { hour12: false });

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.date.textContent = now.toLocaleDateString('en-US', options);
    }

    // Fetch Data from RSS
    async function fetchData() {
        try {
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(RSS_FEED_URL)}`, { cache: 'no-store' });
            const data = await response.json();

            if (data.contents) {
                parseXML(data.contents);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showError();
        }
    }

    // Parse XML String
    function parseXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const items = xmlDoc.getElementsByTagName("item");

        const newMatches = [];
        for (let i = 0; i < items.length; i++) {
            const titleElement = items[i].getElementsByTagName("title")[0];
            const descriptionElement = items[i].getElementsByTagName("description")[0];

            if (!titleElement) continue;

            const title = titleElement.textContent;
            const description = descriptionElement ? descriptionElement.textContent : "";

            newMatches.push({
                title: title.trim(),
                description: description.trim(),
                isLive: title.includes('*') || title.match(/\d+\//)
            });
        }

        state.matches = newMatches;
        updateUI();
    }

    // Update UI
    function updateUI() {
        if (state.matches.length === 0) {
            showNoMatches();
            return;
        }

        // Update Side List
        elements.matchesList.innerHTML = '';
        state.matches.forEach((match, index) => {
            const div = document.createElement('div');
            div.className = `match-item ${index === state.currentIndex ? 'active' : ''}`;
            div.innerHTML = `
                <div class="match-item-title">
                    ${match.isLive ? '<span class="live-indicator"></span>' : ''}
                    ${match.title}
                </div>
            `;
            elements.matchesList.appendChild(div);
        });

        // Update Ticker with all matches
        const tickerText = state.matches.map(m => m.title).join(' • ');
        elements.ticker.textContent = tickerText + ' • ' + tickerText;

        // Start/Restart Rotation for Live Card
        startRotation();
    }

    // Rotate through matches on the main card
    function startRotation() {
        if (state.rotationTimer) clearInterval(state.rotationTimer);

        if (state.matches.length > 0) {
            displayMatch(state.currentIndex % state.matches.length);

            state.rotationTimer = setInterval(() => {
                state.currentIndex = (state.currentIndex + 1) % state.matches.length;
                displayMatch(state.currentIndex);
            }, LIVE_MATCH_ROTATION_INTERVAL);
        }
    }

    // Display a specific match on the main card
    function displayMatch(index) {
        const match = state.matches[index];
        if (!match) return;

        // Update active state in sidebar
        const matchItems = elements.matchesList.querySelectorAll('.match-item');
        matchItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
                // Scroll into view if needed
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });

        let teamA = "Team A";
        let teamB = "Team B";
        let score = "";

        if (match.title.includes(' v ')) {
            const parts = match.title.split(' v ');
            let partA = parts[0];
            let partB = parts[1];
            let scoreA = "";
            let scoreB = "";

            // Regex for score extraction: matches "Team Name 123/4" or "Team Name 123"
            const scoreRegex = /(.*?)\s(\d+\/\d+.*|\d+\s.*)/;

            const matchA = partA.match(scoreRegex);
            if (matchA) {
                teamA = matchA[1];
                scoreA = matchA[2];
            } else {
                teamA = partA;
            }

            const matchB = partB.match(scoreRegex);
            if (matchB) {
                teamB = matchB[1];
                scoreB = matchB[2];
            } else {
                teamB = partB;
            }

            score = scoreA || scoreB;
        }

        elements.liveContainer.innerHTML = `
            <div class="match-info-header">
                <div class="series-name">CRICKET LIVE</div>
            </div>
            <div class="teams-display">
                <div class="team">
                    <div class="team-name">${teamA.replace('*', '').trim()}</div>
                </div>
                <div class="vs-badge">
                    <div class="vs-text">VS</div>
                    ${score ? `<div class="vs-score">${score.replace('*', '').trim()}</div>` : ''}
                </div>
                <div class="team">
                    <div class="team-name">${teamB.trim()}</div>
                </div>
            </div>
            <div class="match-status">
                ${match.isLive ? 'MATCH IN PROGRESS' : 'UPCOMING MATCH'}
            </div>
        `;
    }

    function showError() {
        elements.liveContainer.innerHTML = `
            <div class="loading-state">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--accent);"></i>
                <p>Unable to fetch live scores. Please check connection.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function showNoMatches() {
        elements.liveContainer.innerHTML = `
            <div class="loading-state">
                <i data-lucide="calendar-off" style="width: 48px; height: 48px; color: var(--secondary);"></i>
                <p>No matches found at the moment.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    init();
});
