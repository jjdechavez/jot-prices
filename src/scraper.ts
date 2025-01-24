import puppeteer from "puppeteer";
import { setTimeout } from "node:timers/promises";
import { PriceData } from "./types";

export async function scrapePrice(searchQuery: string): Promise<PriceData | null> {
  console.log("Starting to scrape: ", searchQuery);
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--user-agent="Your Bot Name/1.0"'],
    });

    const page = await browser.newPage();

    await page.goto("https://shopee.ph/", {
      waitUntil: "networkidle0",
    });

    await setTimeout(1000);

    try {
      await page.waitForSelector(".shopee-popup__close-btn", { timeout: 5000 });
      await page.click(".shopee-popup__close-btn");
    } catch (error) {
      // Popup might not exist, continue
    }

    await page.waitForSelector(".shopee-searchbar-input__input");
    await page.type(".shopee-searchbar-input__input", searchQuery);

    await page.click(".shopee-searchbar__search-button");

    await page.waitForSelector(".shopee-search-item-result__item", {
      timeout: 10000,
    });

    const priceData = await page.evaluate(() => {
      const firstProduct = document.querySelector<HTMLElement>(
        ".shopee-search-item-result__item"
      );
      if (!firstProduct) return null;

      const priceElement = firstProduct.querySelector<HTMLElement>(
        '[data-sqe="name"] + div'
      );
      if (!priceElement) return null;

      const priceText = priceElement.textContent || "";
      return {
        price: priceText.replace(/[^0-9.]/g, ""),
        productName:
          firstProduct.querySelector<HTMLElement>('[data-sqe="name"]')
            ?.textContent || "Unknown Product",
      };
    });

    await browser.close();
    return priceData;
  } catch (error) {
    console.error(`Error scraping Shopee:`, error);
    return null;
  }
} 