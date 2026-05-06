const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const homeSection = document.getElementById("home");
const resultsPanel = document.getElementById("resultsPanel");
const resultsList = document.getElementById("resultsList");
const resultsTitle = document.getElementById("resultsTitle");

let travelData = null;
const countryTimeZones = {
  Australia: "Australia/Sydney",
  Japan: "Asia/Tokyo",
  Brazil: "America/Sao_Paulo",
  Cambodia: "Asia/Phnom_Penh",
  India: "Asia/Kolkata",
  "French Polynesia": "Pacific/Tahiti"
};

async function loadRecommendations() {
  const response = await fetch("travel_recommendation_api.json");
  if (!response.ok) {
    throw new Error(`Failed to load data: ${response.status}`);
  }

  travelData = await response.json();
  console.log("Travel recommendation data loaded:", travelData);
}

function createSearchIndex(data) {
  const items = [];

  for (const country of data.countries) {
    for (const city of country.cities) {
      items.push({
        name: city.name,
        imageUrl: city.imageUrl,
        description: city.description,
        category: "city",
        country: country.name
      });
    }
  }

  for (const temple of data.temples) {
    items.push({
      name: temple.name,
      imageUrl: temple.imageUrl,
      description: temple.description,
      category: "temple"
    });
  }

  for (const beach of data.beaches) {
    items.push({
      name: beach.name,
      imageUrl: beach.imageUrl,
      description: beach.description,
      category: "beach"
    });
  }

  return items;
}

function getMatches(query, data) {
  const normalizedQuery = query.trim().toLowerCase();
  const cleanedQuery = normalizedQuery.replace(/[^a-z\s]/g, " ");
  const queryTokens = cleanedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedQuery) {
    return [];
  }

  if (queryTokens.some((token) => token === "beach" || token === "beaches")) {
    return data.beaches.map((item) => ({ ...item, category: "beach" }));
  }

  if (queryTokens.some((token) => token === "temple" || token === "temples")) {
    return data.temples.map((item) => ({ ...item, category: "temple" }));
  }

  if (queryTokens.some((token) => token === "country" || token === "countries")) {
    return data.countries.flatMap((country) =>
      country.cities.map((city) => ({
        ...city,
        category: "city",
        country: country.name
      }))
    );
  }

  const countryMatch = data.countries.find((country) =>
    country.name.toLowerCase().includes(normalizedQuery)
  );

  if (countryMatch) {
    return countryMatch.cities.map((city) => ({
      ...city,
      category: "city",
      country: countryMatch.name
    }));
  }

  const searchIndex = createSearchIndex(data);
  return searchIndex.filter((item) => {
    const searchable = `${item.name} ${item.description} ${item.country || ""} ${item.category}`;
    return searchable.toLowerCase().includes(normalizedQuery);
  });
}

function getResultLabel(query) {
  const tokens = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.some((token) => token === "beach" || token === "beaches")) {
    return "Beach Recommendations";
  }

  if (tokens.some((token) => token === "temple" || token === "temples")) {
    return "Temple Recommendations";
  }

  if (tokens.some((token) => token === "country" || token === "countries")) {
    return "Country Recommendations";
  }

  return "Search Results";
}

function escapeHtml(text) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(text).replace(/[&<>"']/g, (char) => entityMap[char]);
}

function getCountryFromItem(item) {
  if (item.country) {
    return item.country;
  }

  const parts = item.name.split(",");
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }

  return "";
}

function getCountryTime(countryName) {
  const timeZone = countryTimeZones[countryName];
  if (!timeZone) {
    return "";
  }

  const options = {
    timeZone,
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  };

  return new Date().toLocaleTimeString("en-US", options);
}

function setResultsVisibility(showResults) {
  resultsPanel.classList.toggle("hidden", !showResults);
  homeSection.classList.toggle("has-results", showResults);
}

function renderResults(items, query) {
  resultsList.innerHTML = "";
  setResultsVisibility(true);
  resultsTitle.textContent = getResultLabel(query);

  if (items.length === 0) {
    resultsList.innerHTML = `<p class="no-results">No recommendations found for "${escapeHtml(
      query
    )}". Try beach, temple, or country keywords.</p>`;
    return;
  }

  const cards = items.slice(0, 6).map((item) => {
    const countryName = getCountryFromItem(item);
    const currentCountryTime = getCountryTime(countryName);
    const timeMarkup = currentCountryTime
      ? `<p class="result-time">Current time in ${escapeHtml(countryName)}: ${escapeHtml(
          currentCountryTime
        )}</p>`
      : "";

    return `
      <article class="result-card">
        <img src="${item.imageUrl}" alt="${item.name}" />
        <div class="result-card-content">
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          ${timeMarkup}
        </div>
      </article>
    `;
  });

  resultsList.innerHTML = cards.join("");
}

function clearResults() {
  searchInput.value = "";
  resultsList.innerHTML = "";
  resultsTitle.textContent = "Recommendations";
  setResultsVisibility(false);
  searchInput.focus();
}

function runSearch() {
  if (!travelData) {
    return;
  }

  const query = searchInput.value.trim();
  if (!query) {
    resultsList.innerHTML = `<p class="no-results">Please enter a keyword to search recommendations.</p>`;
    setResultsVisibility(true);
    return;
  }

  const matches = getMatches(query, travelData);
  renderResults(matches, query);
}

searchBtn.addEventListener("click", runSearch);
clearBtn.addEventListener("click", clearResults);

loadRecommendations().catch((error) => {
  console.error(error);
  setResultsVisibility(true);
  resultsList.innerHTML =
    '<p class="no-results">Unable to load recommendations right now. Please refresh and try again.</p>';
});
