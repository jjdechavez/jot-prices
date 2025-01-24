require("dotenv").config();
const express = require("express");
const cron = require("node-cron");
const {
  initDatabase,
  addProduct,
  addPriceHistory,
  getAllProducts,
  getPriceHistory,
} = require("./database");
const { scrapePrice } = require("./scraper");

const app = express();
app.use(express.json());

// Initialize database
initDatabase();

// API endpoints
app.post("/products", async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.searchQuery) {
      res
        .status(400)
        .json({ error: "Either name or searchQuery not recieved" });

      return
    }
    const { name, searchQuery } = req.body;
    const productId = await addProduct(name, searchQuery);

    // Immediately get initial price
    const priceData = await scrapePrice(searchQuery);
    if (priceData) {
      await addPriceHistory(productId, priceData.price);
    }

    res.json({
      id: productId,
      message: "Product added successfully",
      currentPrice: priceData?.price,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get price history for a specific product
app.get("/products/:id/history", async (req, res) => {
  try {
    const history = await getPriceHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule price updates using env variable
cron.schedule(process.env.CRON_SCHEDULE || "0 * * * *", async () => {
  try {
    const products = await getAllProducts();
    for (const product of products) {
      const priceData = await scrapePrice(product.search_query);
      if (priceData) {
        await addPriceHistory(product.id, priceData.price);
        console.log(`Added new price for ${product.name}: ₱${priceData.price}`);
      }
    }
  } catch (error) {
    console.error("Error updating prices:", error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
