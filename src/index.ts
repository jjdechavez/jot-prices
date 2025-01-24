import { config } from "dotenv";
import express, { Request, Response } from "express";
import cron from "node-cron";
import {
  initDatabase,
  addProduct,
  addPriceHistory,
  getAllProducts,
  getPriceHistory,
} from "./database";
import { scrapePrice } from "./scraper";

config();

const app = express();
app.use(express.json());

// Initialize database
initDatabase();

interface ProductRequest {
  name: string;
  searchQuery: string;
}

// API endpoints
app.post("/products", async (req: Request, res: Response) => {
  try {
    const body = req.body as ProductRequest;
    if (!body.name || !body.searchQuery) {
      res.status(400).json({ error: "Either name or searchQuery not received" });
      return;
    }

    const { name, searchQuery } = body;
    const productId = await addProduct(name, searchQuery);

    const priceData = await scrapePrice(searchQuery);
    if (priceData) {
      await addPriceHistory(productId, parseFloat(priceData.price));
    }

    res.json({
      id: productId,
      message: "Product added successfully",
      currentPrice: priceData?.price,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/products", async (_req: Request, res: Response) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/products/:id/history", async (req: Request, res: Response) => {
  try {
    const history = await getPriceHistory(parseInt(req.params.id));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

cron.schedule(process.env.CRON_SCHEDULE || "0 * * * *", async () => {
  try {
    const products = await getAllProducts();
    for (const product of products) {
      const priceData = await scrapePrice(product.search_query);
      if (priceData) {
        await addPriceHistory(product.id, parseFloat(priceData.price));
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