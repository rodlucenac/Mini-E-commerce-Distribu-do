const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL || "http://localhost:5001";
const PRODUCTS_SERVICE_URL =
  process.env.PRODUCTS_SERVICE_URL || "http://localhost:5002";
const ORDERS_SERVICE_URL =
  process.env.ORDERS_SERVICE_URL || "http://localhost:5003";

const serviceStatus = {
  users: {
    name: "users",
    url: USERS_SERVICE_URL,
    available: true,
    failures: 0,
  },
  products: {
    name: "products",
    url: PRODUCTS_SERVICE_URL,
    available: true,
    failures: 0,
  },
  orders: {
    name: "orders",
    url: ORDERS_SERVICE_URL,
    available: true,
    failures: 0,
  },
};

app.use(cors());
app.use(express.json());

async function checkServiceHealth(serviceKey) {
  const service = serviceStatus[serviceKey];

  try {
    const response = await axios.get(`${service.url}/health`, {
      timeout: 2000,
    });

    if (response.status === 200) {
      if (!service.available) {
        console.log(
          `[${new Date().toISOString()}] Serviço ${service.name} recuperado`
        );
      }

      service.available = true;
      service.failures = 0;
      return;
    }

    throw new Error("Health check failed");
  } catch (error) {
    service.failures += 1;

    if (service.failures >= 2 && service.available) {
      service.available = false;
      console.log(
        `[${new Date().toISOString()}] Serviço ${service.name} indisponível após 2 falhas consecutivas`
      );
    }
  }
}

async function forwardRequest(req, res, serviceKey, path) {
  const service = serviceStatus[serviceKey];

  if (!service.available) {
    return res.status(503).json({
      error: "Serviço indisponível no momento",
    });
  }

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const config = {
      method: req.method,
      url: `${service.url}${path}`,
      headers,
      validateStatus: () => true,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      config.data = req.body;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(502).json({ error: "Erro ao comunicar com o serviço interno" });
  }
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "gateway" });
});

app.get("/status", (req, res) => {
  const services = {};

  for (const key of Object.keys(serviceStatus)) {
    const service = serviceStatus[key];
    services[key] = {
      available: service.available,
      failures: service.failures,
      url: service.url,
    };
  }

  res.status(200).json({
    gateway: "ok",
    services,
  });
});

app.post("/users/register", (req, res) => {
  forwardRequest(req, res, "users", "/users/register");
});

app.post("/users/login", (req, res) => {
  forwardRequest(req, res, "users", "/users/login");
});

app.get("/users/:id", (req, res) => {
  forwardRequest(req, res, "users", `/users/${req.params.id}`);
});

app.get("/products", (req, res) => {
  forwardRequest(req, res, "products", "/products");
});

app.get("/products/:id", (req, res) => {
  forwardRequest(req, res, "products", `/products/${req.params.id}`);
});

app.post("/products", (req, res) => {
  forwardRequest(req, res, "products", "/products");
});

app.post("/orders", (req, res) => {
  forwardRequest(req, res, "orders", "/orders");
});

app.get("/orders/:userId", (req, res) => {
  forwardRequest(req, res, "orders", `/orders/${req.params.userId}`);
});

Object.keys(serviceStatus).forEach(checkServiceHealth);

setInterval(() => {
  Object.keys(serviceStatus).forEach(checkServiceHealth);
}, 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Gateway service running on port ${PORT}`);
});
