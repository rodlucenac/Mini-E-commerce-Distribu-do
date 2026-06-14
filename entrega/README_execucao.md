# Mini E-commerce Distribuído — Instruções de Execução

## Requisitos

Antes de executar o projeto, tenha instalado:

* Docker
* Docker Compose

Opcionalmente, para execução manual sem Docker:

* Node.js
* npm

---

## Executando com Docker Compose

A forma recomendada de executar o projeto é usando Docker Compose.

Entre na pasta `entrega`:

```bash
cd entrega
```

Suba todos os serviços:

```bash
docker compose up --build
```

O sistema ficará disponível em:

```text
http://localhost:5000
```

O API Gateway roda na porta `5000` e deve ser usado como ponto de entrada principal.

---

## Verificando se o sistema está rodando

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

### Status dos serviços

```bash
curl http://localhost:5000/status
```

Esse comando mostra o estado atual dos serviços `users`, `products` e `orders`.

---

## Testando o fluxo principal

### 1. Criar usuário administrador

```bash
curl -X POST http://localhost:5000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@email.com","password":"123456","role":"admin"}'
```

### 2. Fazer login como administrador

```bash
curl -X POST http://localhost:5000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"123456"}'
```

Copie o token retornado na resposta.

### 3. Criar produto usando token de admin

Substitua `COLE_O_TOKEN_ADMIN_AQUI` pelo token recebido no login.

```bash
curl -X POST http://localhost:5000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_ADMIN_AQUI" \
  -d '{"name":"Notebook","price":3500,"stock":10}'
```

### 4. Listar produtos

```bash
curl http://localhost:5000/products
```

### 5. Criar usuário comum

```bash
curl -X POST http://localhost:5000/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Joao","email":"joao@email.com","password":"123456","role":"user"}'
```

### 6. Fazer login como usuário comum

```bash
curl -X POST http://localhost:5000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@email.com","password":"123456"}'
```

Copie o token retornado na resposta.

### 7. Criar pedido

Substitua `COLE_O_TOKEN_USER_AQUI` pelo token do usuário comum.

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI" \
  -d '{"productId":1,"quantity":2}'
```

### 8. Listar pedidos do usuário

```bash
curl http://localhost:5000/orders/1 \
  -H "Authorization: Bearer COLE_O_TOKEN_USER_AQUI"
```

---

## Testando a queda de um serviço

Com o projeto rodando via Docker Compose, pare o serviço de pedidos:

```bash
docker compose stop orders
```

Aguarde alguns segundos e consulte o status:

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

A resposta esperada é erro `503`, pois o serviço de pedidos está indisponível.

Para religar o serviço:

```bash
docker compose start orders
```

Verifique novamente:

```bash
curl http://localhost:5000/status
```

---

## Parando o projeto

Para parar os containers:

```bash
docker compose down
```

---

## Execução manual sem Docker

Também é possível executar os serviços manualmente. Abra um terminal para cada serviço.

### Serviço de Usuários

```bash
cd entrega/users
npm install
npm start
```

Disponível em:

```text
http://localhost:5001
```

### Serviço de Produtos

```bash
cd entrega/products
npm install
npm start
```

Disponível em:

```text
http://localhost:5002
```

### Serviço de Pedidos

```bash
cd entrega/orders
npm install
npm start
```

Disponível em:

```text
http://localhost:5003
```

### API Gateway

Depois de iniciar os três microsserviços, abra outro terminal e execute:

```bash
cd entrega/gateway
npm install
npm start
```

Disponível em:

```text
http://localhost:5000
```

Para testar:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/status
```

Use os mesmos comandos da seção Docker Compose para registrar usuários, fazer login, criar produtos e criar pedidos.
