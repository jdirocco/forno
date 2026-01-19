#!/bin/bash

# Get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token obtained, creating test data..."

# Create Shops
echo "Creating shops..."
curl -s -X POST http://localhost:8080/api/shops \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SHOP001",
    "name": "Panetteria Centro",
    "address": "Via Roma 123",
    "city": "Milano",
    "province": "MI",
    "zipCode": "20100",
    "email": "centro@bakery.com",
    "phone": "+39 02 1234567",
    "whatsappNumber": "+393331234567",
    "contactPerson": "Mario Rossi",
    "active": true
  }' | jq -r '.id' > /tmp/shop1_id.txt

curl -s -X POST http://localhost:8080/api/shops \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SHOP002",
    "name": "Forno San Giuseppe",
    "address": "Corso Vittorio Emanuele 45",
    "city": "Roma",
    "province": "RM",
    "zipCode": "00100",
    "email": "sangiuseppe@bakery.com",
    "phone": "+39 06 9876543",
    "whatsappNumber": "+393339876543",
    "contactPerson": "Giuseppe Verdi",
    "active": true
  }' | jq -r '.id' > /tmp/shop2_id.txt

# Create Products
echo "Creating products..."
curl -s -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PANE001",
    "name": "Pane Casareccio",
    "description": "Pane tradizionale fatto in casa",
    "category": "BREAD",
    "unitPrice": 3.50,
    "unit": "kg",
    "active": true
  }' | jq -r '.id' > /tmp/product1_id.txt

curl -s -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PANE002",
    "name": "Baguette",
    "description": "Baguette francese croccante",
    "category": "BREAD",
    "unitPrice": 2.00,
    "unit": "pz",
    "active": true
  }' | jq -r '.id' > /tmp/product2_id.txt

curl -s -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PAST001",
    "name": "Cornetti Classici",
    "description": "Cornetti freschi al burro",
    "category": "PASTRY",
    "unitPrice": 1.50,
    "unit": "pz",
    "active": true
  }' | jq -r '.id' > /tmp/product3_id.txt

curl -s -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PIZZA001",
    "name": "Pizza Margherita",
    "description": "Pizza margherita classica",
    "category": "PIZZA",
    "unitPrice": 5.00,
    "unit": "pz",
    "active": true
  }' | jq -r '.id' > /tmp/product4_id.txt

echo "Test data created successfully!"
echo ""
echo "Shop IDs created: $(cat /tmp/shop1_id.txt), $(cat /tmp/shop2_id.txt)"
echo "Product IDs created: $(cat /tmp/product1_id.txt), $(cat /tmp/product2_id.txt), $(cat /tmp/product3_id.txt), $(cat /tmp/product4_id.txt)"
