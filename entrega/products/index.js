const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5002;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

const REPLICA_FILES = {
  1: path.join(__dirname, "products_replica_1.json"),
  2: path.join(__dirname, "products_replica_2.json"),
};

let currentReplica = 1;

app.use(cors());
app.use(express.json());

function ensureReplicaFiles() {
  for (const filePath of Object.values(REPLICA_FILES)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf-8");
    }
  }
}

function readReplica(replicaNum) {
  ensureReplicaFiles();
  const data = fs.readFileSync(REPLICA_FILES[replicaNum], "utf-8");
  return JSON.parse(data);
}

function writeReplica(replicaNum, products) {
  ensureReplicaFiles();
  fs.writeFileSync(
    REPLICA_FILES[replicaNum],
    JSON.stringify(products, null, 2),
    "utf-8"
  );
}

function writeBothReplicas(products) {
  writeReplica(1, products);
  writeReplica(2, products);
}

function getRoundRobinReplica() {
  const replica = currentReplica;
  currentReplica = currentReplica === 1 ? 2 : 1;
  return replica;
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

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/products", (req, res) => {
  try {
    const replicaNum = getRoundRobinReplica();
    const products = readReplica(replicaNum);

    res.status(200).json({
      replica: `replica_${replicaNum}`,
      products,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/products/:id", (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);

    if (isNaN(productId)) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const replicaNum = getRoundRobinReplica();
    const products = readReplica(replicaNum);
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.status(200).json({
      replica: `replica_${replicaNum}`,
      product,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/products", validateJwt, requireAdmin, (req, res) => {
  try {
    const { name, price, stock } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (typeof price !== "number" || typeof stock !== "number") {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const products = readReplica(1);
    const nextId =
      products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;

    const newProduct = {
      id: nextId,
      name,
      price,
      stock,
    };

    products.push(newProduct);
    writeBothReplicas(products);

    res.status(201).json({
      message: "Produto criado com sucesso",
      product: newProduct,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

ensureReplicaFiles();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Products service running on port ${PORT}`);
});
