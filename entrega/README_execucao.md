# Mini E-commerce Distribuído

## Descrição

Este projeto implementa um mini e-commerce distribuído. Atualmente contém:

- **Serviço de Usuários** — registro, autenticação e consulta de usuários (porta 5001)
- **Serviço de Produtos** — listagem e criação de produtos com replicação em dois arquivos JSON (porta 5002)
- **Serviço de Pedidos** — criação e listagem de pedidos (porta 5003)
- **API Gateway** — ponto único de entrada do cliente com heartbeat (porta 5000)

O sistema pode ser executado manualmente (serviço a serviço) ou com **Docker Compose**, subindo toda a infraestrutura de uma vez.

O relatório final será adicionado na próxima etapa.

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

---

## API Gateway

### Como rodar o gateway

Antes de rodar o gateway, os três serviços precisam estar rodando:

```bash
cd entrega/users
npm install
npm start
```

Em outro terminal:

```bash
cd entrega/products
npm install
npm start
```

Em outro terminal:

```bash
cd entrega/orders
npm install
npm start
```

Depois, em outro terminal:

```bash
cd entrega/gateway
npm install
npm start
```

O gateway ficará disponível em `http://localhost:5000`.

### Testar health do gateway

```bash
curl http://localhost:5000/health
```

### Usar o sistema pelo Gateway

A partir de agora, o cliente deve usar preferencialmente a porta `5000`. O gateway encaminha as requisições para os microsserviços internos e repassa status HTTP e corpo JSON das respostas.

#### Criar admin pelo gateway

```bash
curl -X POST http://localhost:5000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@email.com","password":"123456","role":"admin"}'
```

#### Login pelo gateway

```bash
curl -X POST http://localhost:5000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"123456"}'
```

#### Criar produto pelo gateway

```bash
curl -X POST http://localhost:5000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_ADMIN_AQUI" \
  -d '{"name":"Notebook","price":3500,"stock":10}'
```

#### Listar produtos pelo gateway

```bash
curl http://localhost:5000/products
```

#### Criar pedido pelo gateway

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

#### Listar pedidos pelo gateway

```bash
curl http://localhost:5000/orders/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```

---

## Heartbeat no API Gateway

O gateway verifica `/health` dos serviços a cada 5 segundos. Após 2 falhas consecutivas, marca o serviço como indisponível. Rotas daquele serviço passam a retornar `503`. Quando o serviço volta, o gateway registra recuperação e libera as rotas novamente.

### Ver status dos serviços

```bash
curl http://localhost:5000/status
```

### Simular queda do Serviço de Pedidos

Se estiver rodando manualmente, pare o terminal do serviço `orders`.

Depois teste:

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

Deve retornar:

```json
{
  "error": "Serviço indisponível no momento"
}
```

Com status `503`.

### Confirmar que os outros serviços continuam funcionando

```bash
curl http://localhost:5000/products
```

E também:

```bash
curl http://localhost:5000/health
```

---

## Executando com Docker Compose

Para subir toda a infraestrutura de uma vez:

```bash
cd entrega
docker compose up --build
```

O sistema ficará disponível no Gateway em `http://localhost:5000`.

Os microsserviços internos usam os nomes dos containers:

- `http://users:5001`
- `http://products:5002`
- `http://orders:5003`

### Health do Gateway

```bash
curl http://localhost:5000/health
```

### Status dos serviços monitorados

```bash
curl http://localhost:5000/status
```

### Criar admin

```bash
curl -X POST http://localhost:5000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@email.com","password":"123456","role":"admin"}'
```

### Login admin

```bash
curl -X POST http://localhost:5000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"123456"}'
```

### Criar produto com token admin

```bash
curl -X POST http://localhost:5000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_ADMIN_AQUI" \
  -d '{"name":"Notebook","price":3500,"stock":10}'
```

### Listar produtos

```bash
curl http://localhost:5000/products
```

### Criar usuário comum

```bash
curl -X POST http://localhost:5000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Joao","email":"joao@email.com","password":"123456","role":"user"}'
```

### Login usuário comum

```bash
curl -X POST http://localhost:5000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","password":"123456"}'
```

### Criar pedido

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

### Listar pedidos

```bash
curl http://localhost:5000/orders/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI"
```

### Testar heartbeat com Docker

Com Docker Compose, é possível simular queda do serviço de pedidos:

```bash
docker compose stop orders
```

Aguarde cerca de 10 segundos e verifique o status:

```bash
curl http://localhost:5000/status
```

Depois teste uma rota de pedidos:

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

Deve retornar `503`.

Os outros serviços devem continuar funcionando:

```bash
curl http://localhost:5000/products
```

Para subir o serviço de pedidos novamente:

```bash
docker compose start orders
```

Aguarde alguns segundos e verifique:

```bash
curl http://localhost:5000/status
```
