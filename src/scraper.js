const puppeteer = require('puppeteer');

async function scrapePrice(searchQuery) {
    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Navigate to Shopee
        await page.goto('https://shopee.ph/', {
            waitUntil: 'networkidle0'
        });

        // Handle popup if it exists
        try {
            await page.waitForSelector('.shopee-popup__close-btn', { timeout: 5000 });
            await page.click('.shopee-popup__close-btn');
        } catch (error) {
            // Popup might not exist, continue
        }

        // Wait for search bar and type search query
        await page.waitForSelector('.shopee-searchbar-input__input');
        await page.type('.shopee-searchbar-input__input', searchQuery);
        
        // Click search button
        await page.click('.shopee-searchbar__search-button');
        
        // Wait for search results
        await page.waitForSelector('.shopee-search-item-result__item', {
            timeout: 10000
        });

        // Get first product's price
        const priceData = await page.evaluate(() => {
            const firstProduct = document.querySelector('.shopee-search-item-result__item');
            if (!firstProduct) return null;

            const priceElement = firstProduct.querySelector('[data-sqe="name"] + div');
            if (!priceElement) return null;

            const priceText = priceElement.textContent;
            // Remove currency symbol and convert to number
            return {
                price: priceText.replace(/[^0-9.]/g, ''),
                productName: firstProduct.querySelector('[data-sqe="name"]')?.textContent || 'Unknown Product'
            };
        });

        await browser.close();
        return priceData;

    } catch (error) {
        console.error(`Error scraping Shopee:`, error);
        return null;
    }
}

module.exports = { scrapePrice }; 