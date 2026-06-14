# Mini E-commerce Distribuído

## Descrição

Este projeto implementa um mini e-commerce distribuído. Atualmente contém:

- **Serviço de Usuários** — registro, autenticação e consulta de usuários (porta 5001)
- **Serviço de Produtos** — listagem e criação de produtos com replicação em dois arquivos JSON (porta 5002)
- **Serviço de Pedidos** — criação e listagem de pedidos (porta 5003)

Os demais serviços (API Gateway, Heartbeat e Docker Compose completo) serão implementados nas próximas etapas.

---

## Serviço de Usuários

### Como rodar

```bash
cd entrega/users
npm install
npm start
```

O serviço ficará disponível em `http://localhost:5001`.

### Como testar health

```bash
curl http://localhost:5001/health
```

### Como registrar usuário comum

```bash
curl -X POST http://localhost:5001/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Joao","email":"joao@email.com","password":"123456","role":"user"}'
```

### Como registrar admin

```bash
curl -X POST http://localhost:5001/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@email.com","password":"123456","role":"admin"}'
```

### Como fazer login

```bash
curl -X POST http://localhost:5001/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","password":"123456"}'
```

### Como buscar usuário usando token

```bash
curl http://localhost:5001/users/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```

---

## Serviço de Produtos

### Como rodar o serviço de produtos

```bash
cd entrega/products
npm install
npm start
```

O serviço ficará disponível em `http://localhost:5002`.

### Testar health

```bash
curl http://localhost:5002/health
```

### Listar produtos

```bash
curl http://localhost:5002/products
```

Chamadas repetidas a este endpoint alternam entre `replica_1` e `replica_2` (round-robin). A primeira chamada retorna dados da `replica_1`, a segunda da `replica_2`, e assim por diante.

### Criar produto como admin

Use token JWT de um usuário admin criado no serviço de usuários.

```bash
curl -X POST http://localhost:5002/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_ADMIN_AQUI" \
  -d '{"name":"Notebook","price":3500,"stock":10}'
```

### Testar erro 403 com usuário comum

```bash
curl -X POST http://localhost:5002/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI" \
  -d '{"name":"Mouse","price":100,"stock":20}'
```

Deve retornar `403`.

---

## Serviço de Pedidos

### Como rodar o serviço de pedidos

```bash
cd entrega/orders
npm install
npm start
```

O serviço ficará disponível em `http://localhost:5003`.

### Testar health

```bash
curl http://localhost:5003/health
```

### Criar pedido

Use token JWT de um usuário comum ou admin.

```bash
curl -X POST http://localhost:5003/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

### Listar pedidos do usuário

```bash
curl http://localhost:5003/orders/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```

### Testar erro 403

Um usuário comum não pode listar pedidos de outro usuário. Se o usuário com id `2` tentar acessar os pedidos do usuário com id `1`, a API retorna `403`:

```bash
curl http://localhost:5003/orders/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_2_AQUI"
```

Deve retornar `403`.
