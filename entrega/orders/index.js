const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5003;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const ORDERS_FILE = path.join(__dirname, "orders.json");

app.use(cors());
app.use(express.json());

function ensureOrdersFile() {
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]", "utf-8");
  }
}

function readOrders() {
  ensureOrdersFile();
  const data = fs.readFileSync(ORDERS_FILE, "utf-8");
  return JSON.parse(data);
}

function writeOrders(orders) {
  ensureOrdersFile();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

function validateJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token ausente ou inválido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token ausente ou inválido" });
  }
}

function canAccessUserOrders(user, requestedUserId) {
  if (user.role === "admin") {
    return true;
  }
  return user.userId === requestedUserId;
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/orders", validateJwt, (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (productId === undefined || quantity === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (typeof productId !== "number" || typeof quantity !== "number") {
      return res.status(400).json({ error: "Campos numéricos inválidos" });
    }

    const orders = readOrders();
    const nextId =
      orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1;

    const newOrder = {
      id: nextId,
      userId: req.user.userId,
      productId,
      quantity,
      createdAt: new Date().toISOString(),
    };

    orders.push(newOrder);
    writeOrders(orders);

    res.status(201).json({
      message: "Pedido criado com sucesso",
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/orders/:userId", validateJwt, (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.userId, 10);

    if (isNaN(requestedUserId)) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }

    if (!canAccessUserOrders(req.user, requestedUserId)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const orders = readOrders();
    const userOrders = orders.filter((o) => o.userId === requestedUserId);

    res.status(200).json({ orders: userOrders });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

ensureOrdersFile();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Orders service running on port ${PORT}`);
});
