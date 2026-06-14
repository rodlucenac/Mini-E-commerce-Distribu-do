# Mini E-commerce Distribuído

## Descrição

Este projeto implementa um mini e-commerce distribuído com microsserviços:

| Serviço | Porta | Função |
|---|---|---|
| API Gateway | 5000 | Ponto único de entrada com heartbeat |
| Usuários | 5001 | Registro, login e consulta de usuários |
| Produtos | 5002 | Listagem e criação de produtos (2 réplicas JSON) |
| Pedidos | 5003 | Criação e listagem de pedidos |

O cliente deve usar preferencialmente o **Gateway na porta 5000**.

O gateway monitora a saúde dos microsserviços a cada 5 segundos via `GET /health`. Após 2 falhas consecutivas, bloqueia as rotas do serviço indisponível com `503`. O endpoint `GET /status` mostra o estado atual de cada serviço.

---

## Executando com Docker Compose

Forma recomendada de subir toda a infraestrutura:

```bash
cd entrega
docker compose up --build
```

O sistema ficará disponível em `http://localhost:5000`.

Internamente, o gateway se comunica com:

- `http://users:5001`
- `http://products:5002`
- `http://orders:5003`

### Health do Gateway

```bash
curl http://localhost:5000/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "gateway"
}
```

### Status dos serviços monitorados

```bash
curl http://localhost:5000/status
```

Resposta esperada:

```json
{
  "gateway": "ok",
  "services": {
    "users": {
      "available": true,
      "failures": 0,
      "url": "http://users:5001"
    },
    "products": {
      "available": true,
      "failures": 0,
      "url": "http://products:5002"
    },
    "orders": {
      "available": true,
      "failures": 0,
      "url": "http://orders:5003"
    }
  }
}
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

Chamadas repetidas alternam entre `replica_1` e `replica_2` (round-robin).

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

Simule a queda do serviço de pedidos:

```bash
docker compose stop orders
```

Aguarde cerca de 10 segundos e verifique o status:

```bash
curl http://localhost:5000/status
```

O serviço `orders` deve aparecer com `"available": false`.

Teste uma rota de pedidos (deve retornar `503`):

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

Resposta esperada:

```json
{
  "error": "Serviço indisponível no momento"
}
```

Confirme que os outros serviços continuam funcionando:

```bash
curl http://localhost:5000/products
```

Para restaurar o serviço de pedidos:

```bash
docker compose start orders
```

Aguarde alguns segundos e verifique:

```bash
curl http://localhost:5000/status
```

---

## Execução manual (sem Docker)

### Serviço de Usuários

```bash
cd entrega/users
npm install
npm start
```

Disponível em `http://localhost:5001`.

```bash
curl http://localhost:5001/health
```

### Serviço de Produtos

```bash
cd entrega/products
npm install
npm start
```

Disponível em `http://localhost:5002`.

```bash
curl http://localhost:5002/health
```

### Serviço de Pedidos

```bash
cd entrega/orders
npm install
npm start
```

Disponível em `http://localhost:5003`.

```bash
curl http://localhost:5003/health
```

### API Gateway

Com os três serviços rodando, inicie o gateway:

```bash
cd entrega/gateway
npm install
npm start
```

Disponível em `http://localhost:5000`.

```bash
curl http://localhost:5000/health
curl http://localhost:5000/status
```

Use os mesmos exemplos de `curl` da seção Docker Compose, trocando apenas a necessidade de subir os serviços manualmente em terminais separados.

### Testar heartbeat manualmente

Pare o terminal do serviço `orders`. Aguarde cerca de 10 segundos e verifique:

```bash
curl http://localhost:5000/status
```

Teste uma rota de pedidos:

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

Deve retornar `503`. Os endpoints de `users` e `products` continuam funcionando.
