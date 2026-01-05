/**
 * Dhan Stock Master Fetcher (503-safe, production-grade)
 */

const fs = require("fs");
const axios = require("axios");

const API_URL = "https://ow-scanx-analytics.dhan.co/customscan/fetchdt";

const BASE_PAYLOAD = {
  sort: "Mcap",
  sorder: "desc",
  count: 50,
  params: [
    { field: "OgInst", op: "", val: "ES" },
    { field: "Exch", op: "", val: "NSE" }
  ],
  fields: [
    "Sym",
    "DispSym",
    "Isin",
    "Seg",
    "Inst",
    "LotSize",
    "TickSize",
    "Sid",
    "Seosym",
    "Exch"
  ]
};

const HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "Origin": "https://dhan.co",
  "Referer": "https://dhan.co/all-stocks-list/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchPage(pgno, retries = 3) {
  try {
    const payload = { data: { ...BASE_PAYLOAD, pgno } };

    const res = await axios.post(API_URL, payload, {
      headers: HEADERS,
      timeout: 20000
    });

    return res.data?.data || [];
  } catch (err) {
    if (retries > 0) {
      const wait = (4 - retries) * 2000;
      console.warn(
        `⚠️  Page ${pgno} failed (${err.response?.status || "ERR"}). Retrying in ${wait}ms`
      );
      await sleep(wait);
      return fetchPage(pgno, retries - 1);
    }
    throw err;
  }
}

(async () => {
  const stocksMap = new Map();
  let pgno = 1;

  console.log("🔹 Starting Dhan Stock Master fetch");

  while (true) {
    console.log(`📄 Fetching page ${pgno}`);

    let records;
    try {
      records = await fetchPage(pgno);
    } catch (err) {
      console.error(`❌ Hard fail at page ${pgno}. Stopping.`);
      break;
    }

    if (!records.length) {
      console.log("🛑 No more data. Done.");
      break;
    }

    for (const item of records) {
      if (item.Seg !== "E") continue;
      if (!item.Sym || !item.DispSym) continue;

      const symbol = item.Sym.toUpperCase();

      if (!stocksMap.has(symbol)) {
        stocksMap.set(symbol, {
          symbol,
          company_name: item.DispSym.trim(),
          exchange: item.Exch || "NSE",
          isin: item.Isin || null,
          segment: item.Seg,
          instrument: item.Inst || "EQUITY",
          lot_size: item.LotSize ?? null,
          tick_size: item.TickSize ?? null,
          dhan_id: item.Sid ?? null,
          slug: item.Seosym ?? null
        });
      }
    }

    console.log(`📦 Total stocks collected: ${stocksMap.size}`);

    pgno++;
    await sleep(1200); // 👈 critical to avoid 503
  }

  fs.writeFileSync(
    "dhan_stock_master_NSE.json",
    JSON.stringify([...stocksMap.values()], null, 2)
  );

  console.log(
    `✅ DONE: ${stocksMap.size} stocks saved to dhan_stock_master_NSE.json`
  );
})();
