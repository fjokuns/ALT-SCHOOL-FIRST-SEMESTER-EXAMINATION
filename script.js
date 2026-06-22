// Global State for Unit Toggle
let isCelsius = true;
let currentSavedWeather = null;
let currentSavedDaily = null;
let currentSavedCity = "";
let currentSavedCountry = "";

// Calculate temperature based on current unit
function formatTemp(tempC) {
  if (isCelsius) {
    return Math.round(tempC);
  } else {
    return Math.round((tempC * 9) / 5 + 32); // Convert to Fahrenheit
  }
}

// WMO Converter to icon
function getWeatherDescription(code) {
  if (code === 0)
    return { description: "Clear sky", icon: "☀️", anim: "anim-spin" };
  if (code === 1 || code === 2 || code === 3)
    return { description: "Partly cloudy", icon: "⛅", anim: "anim-bounce" };
  if (code === 45 || code === 48)
    return { description: "Foggy", icon: "🌫️", anim: "anim-bounce" };
  if (code === 51 || code === 53 || code === 55)
    return { description: "Drizzle", icon: "🌦️", anim: "anim-bounce" };
  if (code === 61 || code === 63 || code === 65)
    return { description: "Rain", icon: "🌧️", anim: "anim-bounce" };
  if (code === 71 || code === 73 || code === 75)
    return { description: "Snow", icon: "❄️", anim: "anim-bounce" };
  if (code === 80 || code === 81 || code === 82)
    return { description: "Rain showers", icon: "🌦️", anim: "anim-bounce" };
  if (code === 95)
    return { description: "Thunderstorm", icon: "⛈️", anim: "anim-bounce" };
  return { description: "Unknown", icon: "🌡️", anim: "" };
}

// Convert Date String to a day name
function getDayName(dateString, isToday) {
  if (isToday) {
    return "Today";
  }
  var date = new Date(dateString + "T00:00:00");
  var days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

// Showing and hiding functions

//Show loading message and hide everything else
function showLoading() {
  document.getElementById("error-box").classList.add("hidden");
  document.getElementById("weather-card").classList.add("hidden");
  document.getElementById("loading-box").classList.remove("hidden");
}

// Show error message and hide everything else
function showError(message) {
  document.getElementById("loading-box").classList.add("hidden");
  document.getElementById("weather-card").classList.add("hidden");
  document.getElementById("error-box").textContent = message;
  document.getElementById("error-box").classList.remove("hidden");
}

// Update display functions to use formatTemp() and animations
function displayCurrentWeather(current, cityName, country) {
  var weather = getWeatherDescription(current.weather_code);
  var unitLabel = isCelsius ? "°C" : "°F";

  var iconElement = document.getElementById("weather-icon");
  iconElement.textContent = weather.icon;
  iconElement.className = "weather-icon " + weather.anim; // Apply animation

  document.getElementById("city-name").textContent = cityName + ", " + country;
  document.getElementById("temperature").textContent =
    formatTemp(current.temperature_2m) + unitLabel;

  document.getElementById("weather-desc").textContent = weather.description;
  document.getElementById("humidity").textContent =
    current.relative_humidity_2m + "%";
  document.getElementById("wind-speed").textContent =
    current.wind_speed_10m + " km/h";
}

// Update DOM wuth 5-day forecast
function displayForecast(daily) {
  var forecastList = document.getElementById("forecast-list");
  forecastList.innerHTML = "";
  document.getElementById("uv-index").textContent = "N/A";
  for (var i = 0; i < 5; i++) {
    var weather = getWeatherDescription(daily.weather_code[i]);
    var dayName = getDayName(daily.time[i], i === 0);
    var high = formatTemp(daily.temperature_2m_max[i]);
    var low = formatTemp(daily.temperature_2m_min[i]);

    var row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML =
      '<div class="forecast-day">' +
      dayName +
      "</div>" +
      '<div class="forecast-icon"><span class="' +
      weather.anim +
      '">' +
      weather.icon +
      "</span></div>" +
      '<div class="forecast-temps">' +
      '<div class="forecast-high">' +
      high +
      "°</div>" +
      '<div class="forecast-low">' +
      low +
      "°</div>" +
      "</div>";
    forecastList.appendChild(row);
  }
}

// UV index conversion function
function getUVLabel(uvIndex) {
  if (uvIndex <= 2) {
    return "Low";
  } else if (uvIndex <= 5) {
    return "Moderate";
  } else if (uvIndex <= 7) {
    return "High";
  } else if (uvIndex <= 10) {
    return "Very High";
  } else {
    return "Extreme";
  }
}

//API FUNCTIONS

//Latitude and Longitude fetched using Geocoding Api
async function getCoordinates(city) {
  var url =
    "https://geocoding-api.open-meteo.com/v1/search?name=" +
    encodeURIComponent(city) +
    "&count=1&language=en&format=json";

  var response = await fetch(url);
  var data = await response.json();

  // city not found if we dont have results
  if (!data.results || data.results.length === 0) {
    return null;
  }
  return data.results[0];
}

// Step2: Fetch current weather using coordinate
async function getWeather(lat, lon) {
  var url =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" +
    lat +
    "&longitude=" +
    lon +
    "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
    "&timezone=auto";

  var response = await fetch(url);
  var data = await response.json();
  return data;
}

//The search function
async function handleSearch() {
  var cityInput = document.getElementById("city-input");
  var city = cityInput.value.trim();

  // Empty input error
  if (!city) {
    showError("Please enter a city name.");
    return;
  }

  // Loading while fetching data
  showLoading();

  // Step 1: Get city coordinates
  var location = await getCoordinates(city);

  // If we dont fnd city, show error and stop
  if (!location) {
    showError("City not found. Please check the spelling and try again.");
    return;
  }

  // Step 2: fetch weather using the coordinates
  var weatherData = await getWeather(location.latitude, location.longitude);
  currentSavedWeather = weatherData.current;
  currentSavedDaily = weatherData.daily;
  currentSavedCity = location.name;
  currentSavedCountry = location.country;

  updateSearchHistory(location.name);

  // Step 3: update the page with current weather
  displayCurrentWeather(weatherData.current, location.name, location.country);

  // Step 4: update the page with the 5-day forecast
  displayForecast(weatherData.daily);

  // Step 5: hide loading and show the weather card
  document.getElementById("loading-box").classList.add("hidden");
  document.getElementById("weather-card").classList.remove("hidden");
}

// Enter button should trigger search
document
  .getElementById("city-input")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

// Search button should trigger search
document
  .getElementById("search-button")
  .addEventListener("click", handleSearch);


  // --- Bonus Features ---

// Unit Toggle Event
document.getElementById("unit-toggle").addEventListener("click", function () {
  isCelsius = !isCelsius; // Flip the state
  this.textContent = isCelsius ? "°F" : "°C"; // Update button text

  // If we have data loaded, re-render it with the new math
  if (currentSavedWeather) {
    displayCurrentWeather(
      currentSavedWeather,
      currentSavedCity,
      currentSavedCountry,
    );
    displayForecast(currentSavedDaily);
  }
});

// Search History logic (localStorage)
function updateSearchHistory(city) {
  let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];

  // Remove a search if it already exists to avoid duplicates
  history = history.filter((item) => item.toLowerCase() !== city.toLowerCase());

  // Add the new search to the front
  history.unshift(city);

  // Keep only the top 5 recent searches
  if (history.length > 5) history.pop();

  localStorage.setItem("weatherHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById("history-container");
  if (!container) return;
  container.innerHTML = "";

  let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
  history.forEach((city) => {
    let btn = document.createElement("button");
    btn.className = "history-btn";
    btn.textContent = city;
    btn.onclick = () => {
      document.getElementById("city-input").value = city;
      handleSearch();
    };
    container.appendChild(btn);
  });
}
