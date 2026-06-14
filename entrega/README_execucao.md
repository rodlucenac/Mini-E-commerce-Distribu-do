# Mini E-commerce Distribuído — Primeira Parte

## Descrição

Esta é a primeira parte do projeto **mini-ecommerce-distribuido**. Neste momento, o projeto contém apenas o **Serviço de Usuários**, responsável por registro, autenticação e consulta de usuários.

Os demais serviços (Produtos, Pedidos, API Gateway, Heartbeat e Docker Compose completo) serão implementados nas próximas etapas.

## Como rodar

```bash
cd entrega/users
npm install
npm start
```

O serviço ficará disponível em `http://localhost:5001`.

## Como testar health

```bash
curl http://localhost:5001/health
```

## Como registrar usuário comum

```bash
curl -X POST http://localhost:5001/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Joao","email":"joao@email.com","password":"123456","role":"user"}'
```

## Como registrar admin

```bash
curl -X POST http://localhost:5001/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@email.com","password":"123456","role":"admin"}'
```

## Como fazer login

```bash
curl -X POST http://localhost:5001/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","password":"123456"}'
```

## Como buscar usuário usando token

```bash
curl http://localhost:5001/users/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```
