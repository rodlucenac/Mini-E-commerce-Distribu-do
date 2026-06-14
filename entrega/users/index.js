const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());
app.use(express.json());

function ensureUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  }
}

function readUsers() {
  ensureUsersFile();
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/users/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const userRole = role || "user";

    if (userRole !== "user" && userRole !== "admin") {
      return res.status(400).json({ error: "Role inválida" });
    }

    const users = readUsers();

    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;

    const newUser = {
      id: nextId,
      name,
      email,
      passwordHash,
      role: userRole,
    };

    users.push(newUser);
    writeUsers(users);

    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const users = readUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/users/:id", validateJwt, (req, res) => {
  try {
    const requestedId = parseInt(req.params.id, 10);

    if (isNaN(requestedId)) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { userId, role } = req.user;

    if (role !== "admin" && userId !== requestedId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const users = readUsers();
    const user = users.find((u) => u.id === requestedId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

ensureUsersFile();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Users service running on port ${PORT}`);
});
