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

app.use(cors());
app.use(express.json());

async function forwardRequest(req, res, serviceUrl, path) {
  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const config = {
      method: req.method,
      url: `${serviceUrl}${path}`,
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

app.post("/users/register", (req, res) => {
  forwardRequest(req, res, USERS_SERVICE_URL, "/users/register");
});

app.post("/users/login", (req, res) => {
  forwardRequest(req, res, USERS_SERVICE_URL, "/users/login");
});

app.get("/users/:id", (req, res) => {
  forwardRequest(req, res, USERS_SERVICE_URL, `/users/${req.params.id}`);
});

app.get("/products", (req, res) => {
  forwardRequest(req, res, PRODUCTS_SERVICE_URL, "/products");
});

app.get("/products/:id", (req, res) => {
  forwardRequest(req, res, PRODUCTS_SERVICE_URL, `/products/${req.params.id}`);
});

app.post("/products", (req, res) => {
  forwardRequest(req, res, PRODUCTS_SERVICE_URL, "/products");
});

app.post("/orders", (req, res) => {
  forwardRequest(req, res, ORDERS_SERVICE_URL, "/orders");
});

app.get("/orders/:userId", (req, res) => {
  forwardRequest(
    req,
    res,
    ORDERS_SERVICE_URL,
    `/orders/${req.params.userId}`
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Gateway service running on port ${PORT}`);
});
