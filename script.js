document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
    const DEFAULT_LOCATION = { lat: 40.7128, lon: -74.0060, name: 'New York' }; // Fallback

    // DOM Elements
    const elements = {
        locationName: document.getElementById('location-name'),
        currentTime: document.getElementById('current-time'),
        currentDate: document.getElementById('current-date'),
        currentTemp: document.getElementById('current-temp'),
        weatherDescription: document.getElementById('weather-description'),
        humidity: document.getElementById('humidity'),
        windSpeed: document.getElementById('wind-speed'),
        feelsLike: document.getElementById('feels-like'),
        weatherIconLarge: document.getElementById('weather-icon-large'),
        forecastList: document.getElementById('forecast-list'),
        lastUpdated: document.getElementById('last-updated')
    };

    // State
    let state = {
        lat: null,
        lon: null,
        name: 'Detecting...',
        weatherData: null
    };

    // Weather Code Mapping (WMO Weather interpretation codes)
    const weatherCodes = {
        0: { description: 'Clear sky', icon: 'sun' },
        1: { description: 'Mainly clear', icon: 'sun' },
        2: { description: 'Partly cloudy', icon: 'cloud-sun' },
        3: { description: 'Overcast', icon: 'cloud' },
        45: { description: 'Fog', icon: 'cloud-fog' },
        48: { description: 'Depositing rime fog', icon: 'cloud-fog' },
        51: { description: 'Light drizzle', icon: 'cloud-drizzle' },
        53: { description: 'Moderate drizzle', icon: 'cloud-drizzle' },
        55: { description: 'Dense drizzle', icon: 'cloud-drizzle' },
        61: { description: 'Slight rain', icon: 'cloud-rain' },
        63: { description: 'Moderate rain', icon: 'cloud-rain' },
        65: { description: 'Heavy rain', icon: 'cloud-rain' },
        71: { description: 'Slight snow', icon: 'cloud-snow' },
        73: { description: 'Moderate snow', icon: 'cloud-snow' },
        75: { description: 'Heavy snow', icon: 'cloud-snow' },
        77: { description: 'Snow grains', icon: 'cloud-snow' },
        80: { description: 'Slight rain showers', icon: 'cloud-rain' },
        81: { description: 'Moderate rain showers', icon: 'cloud-rain' },
        82: { description: 'Violent rain showers', icon: 'cloud-rain' },
        85: { description: 'Slight snow showers', icon: 'cloud-snow' },
        86: { description: 'Heavy snow showers', icon: 'cloud-snow' },
        95: { description: 'Thunderstorm', icon: 'cloud-lightning' },
        96: { description: 'Thunderstorm with slight hail', icon: 'cloud-lightning' },
        99: { description: 'Thunderstorm with heavy hail', icon: 'cloud-lightning' }
    };

    // Initialize App
    async function init() {
        updateClock();
        setInterval(updateClock, 1000);

        try {
            await detectLocation();
        } catch (error) {
            console.error('Location detection failed:', error);
            state.lat = DEFAULT_LOCATION.lat;
            state.lon = DEFAULT_LOCATION.lon;
            state.name = DEFAULT_LOCATION.name;
        }

        fetchWeather();
        setInterval(fetchWeather, REFRESH_INTERVAL);
    }

    // Update Clock & Date
    function updateClock() {
        const now = new Date();

        // Time
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        elements.currentTime.textContent = `${hours}:${minutes}`;

        // Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.currentDate.textContent = now.toLocaleDateString('en-US', options);
    }

    // Detect Location via IP
    async function detectLocation() {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.latitude && data.longitude) {
            state.lat = data.latitude;
            state.lon = data.longitude;
            state.name = data.city || 'Your Location';
            elements.locationName.textContent = state.name;
        } else {
            throw new Error('Invalid location data');
        }
    }

    // Fetch Weather from Open-Meteo
    async function fetchWeather() {
        if (!state.lat || !state.lon) return;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

        try {
            const response = await fetch(url, { cache: 'no-store' });
            const data = await response.json();
            state.weatherData = data;
            updateUI();

            elements.lastUpdated.textContent = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Weather fetch failed:', error);
        }
    }

    // Update UI with Weather Data
    function updateUI() {
        const current = state.weatherData.current;
        const daily = state.weatherData.daily;

        // Update Current Weather
        elements.currentTemp.textContent = Math.round(current.temperature_2m);
        elements.humidity.textContent = `${current.relative_humidity_2m}%`;
        elements.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;

        const weatherInfo = weatherCodes[current.weather_code] || { description: 'Unknown', icon: 'help-circle' };
        elements.weatherDescription.textContent = weatherInfo.description;

        // Large Weather Icon
        elements.weatherIconLarge.innerHTML = `<i data-lucide="${weatherInfo.icon}"></i>`;

        // Forecast
        updateForecast(daily);

        // Re-initialize Lucide Icons
        lucide.createIcons();
    }

    // Update Forecast List
    function updateForecast(daily) {
        elements.forecastList.innerHTML = '';

        for (let i = 1; i < daily.time.length; i++) {
            const date = new Date(daily.time[i]);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const weatherInfo = weatherCodes[daily.weather_code[i]] || { description: 'Unknown', icon: 'help-circle' };
            const tempMax = Math.round(daily.temperature_2m_max[i]);
            const tempMin = Math.round(daily.temperature_2m_min[i]);

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">
                    <i data-lucide="${weatherInfo.icon}"></i>
                </div>
                <div class="forecast-temp">
                    <span class="temp-max">${tempMax}°</span>
                    <span class="temp-min">${tempMin}°</span>
                </div>
            `;
            elements.forecastList.appendChild(forecastItem);
        }
    }

    // Local Storage Fallback
    function saveToStorage() {
        localStorage.setItem('weather_state', JSON.stringify({
            lat: state.lat,
            lon: state.lon,
            name: state.name
        }));
    }

    function loadFromStorage() {
        const saved = localStorage.getItem('weather_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            state.lat = parsed.lat;
            state.lon = parsed.lon;
            state.name = parsed.name;
            elements.locationName.textContent = state.name;
        }
    }

    // Start the app
    loadFromStorage();
    init();
});
