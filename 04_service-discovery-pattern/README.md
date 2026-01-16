# Service Discovery Pattern - Microservices Example

This example demonstrates the Service Discovery pattern using Node.js microservices. The pattern allows services to register themselves with a central registry and enables dynamic discovery of service locations by the API Gateway.

## Project Structure

```
04_service-discovery-pattern/
│
├── gateway/         # API Gateway service
│   └── server.js
├── order/           # Order microservice
│   └── server.js
├── user/            # User microservice
│   └── server.js
├── registery/       # Service registry
│   └── server.js
└── request.http     # Example HTTP requests
```

## Prerequisites
- Node.js (v14 or above recommended)
- npm (Node package manager)

## Installation
Install dependencies for each service:

```sh
cd 04_service-discovery-pattern/registery && npm install
cd ../gateway && npm install
cd ../order && npm install
cd ../user && npm install
```

## Running the Services
Open four separate terminals (one for each service) and run the following commands:

### 1. Start the Service Registry
```sh
cd 04_service-discovery-pattern/registery
node server.js 3000
```

### 2. Start the User Service (on port 6002)
```sh
cd 04_service-discovery-pattern/user
node server.js 6002
```

### 3. Start the Order Service (on port 6001)
```sh
cd 04_service-discovery-pattern/order
node server.js 6001
```

### 4. Start the API Gateway
```sh
cd 04_service-discovery-pattern/gateway
node server.js
```


## Running Multiple Instances for Service Discovery

To fully demonstrate the service discovery pattern, you can run two instances of each microservice (User and Order) on different ports. This shows how the registry keeps track of all available services and how the gateway can discover and use any instance.

### Example: Run 2 User and 2 Order Services

Open four separate terminals and run:

#### User Services
```sh
# Terminal 1
cd 04_service-discovery-pattern/user
node server.js 6002

# Terminal 2
cd 04_service-discovery-pattern/user
node server.js 6003
```

#### Order Services
```sh
# Terminal 3
cd 04_service-discovery-pattern/order
node server.js 6001

# Terminal 4
cd 04_service-discovery-pattern/order
node server.js 6004
```

Each instance will register itself with the registry. The API Gateway can then discover and route requests to any available instance, demonstrating dynamic service discovery.

## Testing the Services

You can use the `request.http` file or any HTTP client (like Postman or curl) to test the endpoints exposed by the API Gateway.

### Example Requests

#### Get Users
```
GET http://localhost:4000/api/users
api-key: secret123
```

#### Get Orders
```
GET http://localhost:4000/api/orders
api-key: secret123
```

### Expected Responses
- The `/api/users` endpoint will return a list of users from any available User service instance.
- The `/api/orders` endpoint will return a list of orders from any available Order service instance.
- If a service is down or not registered, you will receive an error response.

## Notes
- Each microservice registers itself with the registry on startup.
- The API Gateway dynamically discovers service locations via the registry before forwarding requests.
- Running multiple instances helps test load balancing or failover (if implemented).

## Troubleshooting
- Ensure all services are running and registered with the registry.
- Check the terminal output for errors (e.g., port already in use, missing dependencies).
- Use the correct API key (`secret123`) in your requests.

---

Happy coding!
