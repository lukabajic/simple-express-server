const express = require("express");
const { createClient } = require("redis");
const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient({
  url: process.env.REDISCLOUD_URL,
});

redisClient.connect().catch(console.error);

redisClient.on("error", (err) => console.log("Redis Error:", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

app.get("/articles", async (req, res) => {
  const cacheKey = "articles";

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=2US4HJM8F2O5DW2R`
    );
    const responseData = await response.json();

    await redisClient.setEx(cacheKey, 24 * 3600, JSON.stringify(responseData));

    return res.json(responseData);
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/company/:symbol", async (req, res) => {
  const cacheKey = `cached_data_${req.params.symbol}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${req.params.symbol}&apikey=2US4HJM8F2O5DW2R`
    );
    const responseData = await response.json();

    const responseOverview = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${req.params.symbol}&apikey=2US4HJM8F2O5DW2R`
    );
    const responseDataOverview = await responseOverview.json();

    await redisClient.setEx(
      cacheKey,
      24 * 3600,
      JSON.stringify({ ...responseData, ...responseDataOverview })
    );

    return res.json({ ...responseData, ...responseDataOverview });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/top-gainers-losers", async (req, res) => {
  const cacheKey = "cached_data";

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=2US4HJM8F2O5DW2R`
    );
    const responseData = await response.json();

    await redisClient.setEx(cacheKey, 24 * 3600, JSON.stringify(responseData));

    return res.json(responseData);
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// Basic route
app.get("/", (req, res) => {
  res.send("Welcome to the Simple Express Redis App");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
