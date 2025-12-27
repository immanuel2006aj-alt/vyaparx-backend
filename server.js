const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Temporary in-memory storage (OK for MVP)
const orders = {};

function generateOrderId() {
  return "VX" + Math.floor(100000 + Math.random() * 900000);
}

// CREATE ORDER
app.post("/create-order", async (req, res) => {
  const orderId = generateOrderId();

  orders[orderId] = {
    ...req.body,
    status: "PENDING"
  };

  const message = `
🟢 New Order – Vyaparx
Order ID: ${orderId}

👤 Name: ${req.body.name}
📱 Mobile: ${req.body.mobile}

💰 Coin: ${req.body.coin}
💵 Amount: ₹${req.body.amount}
📦 You Get: ${req.body.youGet}

🏦 Wallet: ${req.body.wallet}
🔐 UTR: ${req.body.utr}
`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ APPROVE", callback_data: `APPROVE_${orderId}` },
          { text: "❌ REJECT", callback_data: `REJECT_${orderId}` }
        ]]
      }
    })
  });

  res.json({ orderId });
});

// TELEGRAM CALLBACK
app.post("/telegram-webhook", (req, res) => {
  const cb = req.body.callback_query;
  if (!cb) return res.sendStatus(200);

  const [action, orderId] = cb.data.split("_");
  if (!orders[orderId]) return res.sendStatus(200);

  orders[orderId].status =
    action === "APPROVE" ? "SUCCESS" : "FAILED";

  res.sendStatus(200);
});

// CHECK ORDER STATUS
app.get("/order-status/:id", (req, res) => {
  const order = orders[req.params.id];
  if (!order) return res.json({ status: "UNKNOWN" });
  res.json({ status: order.status });
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
