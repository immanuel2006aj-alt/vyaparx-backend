const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

/* ================== CONFIG ================== */
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBHOOK_URL = "https://vyaparx-backend.onrender.com/telegram-webhook";

/* ================== MEMORY STORE ================== */
const orders = {};

/* ================== HOME TEST ================== */
app.get("/", (req, res) => {
  res.send("Vyaparx backend is running");
});

/* ================== CREATE ORDER ================== */
app.post("/create-order", async (req, res) => {
  try {
    const orderId = "VX" + Date.now();

    orders[orderId] = { status: "PENDING" };

    const text = `🟢 New Order – Vyaparx
Order ID: ${orderId}
Coin: ${req.body.coin}
Amount: ₹${req.body.amount}

Choose an action below 👇`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: text,
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ APPROVE", callback_data: `APPROVE_${orderId}` }],
            [{ text: "❌ REJECT", callback_data: `REJECT_${orderId}` }]
          ]
        }
      })
    });

    res.json({ orderId });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Order failed" });
  }
});

/* ================== TELEGRAM WEBHOOK ================== */
app.post("/telegram-webhook", async (req, res) => {
  const cb = req.body.callback_query;
  if (!cb || !cb.data) return res.sendStatus(200);

  const [action, orderId] = cb.data.split("_");

  if (!orders[orderId]) {
    orders[orderId] = {};
  }

  orders[orderId].status =
    action === "APPROVE" ? "SUCCESS" : "FAILED";

  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }
  );

  res.sendStatus(200);
});

/* ================== ORDER STATUS ================== */
app.get("/order-status/:id", (req, res) => {
  res.json({
    status: orders[req.params.id]?.status || "UNKNOWN"
  });
});

/* ================== SET WEBHOOK ================== */
(async () => {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: WEBHOOK_URL })
    });
    console.log("✅ Telegram webhook set");
  } catch (e) {
    console.error("Webhook error:", e);
  }
})();

/* ================== START SERVER ================== */
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
