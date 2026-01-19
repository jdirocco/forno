#!/bin/bash

# Get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Creating a test shipment..."

# Create shipment
SHIPMENT=$(curl -s -X POST http://localhost:8080/api/shipments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 1,
    "driverId": 2,
    "shipmentDate": "2026-01-19",
    "notes": "Consegna del mattino - Fare attenzione ai cornetti",
    "items": [
      {
        "productId": 1,
        "quantity": 5.5,
        "notes": "Extra croccante"
      },
      {
        "productId": 2,
        "quantity": 10,
        "notes": null
      },
      {
        "productId": 3,
        "quantity": 20,
        "notes": "Ben caldi"
      }
    ]
  }')

SHIPMENT_ID=$(echo $SHIPMENT | jq -r '.id')
echo "Shipment created with ID: $SHIPMENT_ID"
echo ""
echo "Full response:"
echo $SHIPMENT | jq '.'
echo ""

# Confirm shipment (generates PDF and sends notifications)
echo "Confirming shipment (will generate PDF)..."
curl -s -X POST http://localhost:8080/api/shipments/$SHIPMENT_ID/confirm \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "Shipment confirmed! Check dev-storage/pdfs/ for the generated PDF"
