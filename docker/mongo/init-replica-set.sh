#!/bin/bash
# This script initializes the MongoDB replica set on first startup

echo "Waiting for MongoDB to start..."
sleep 5

echo "Initializing replica set..."
mongosh --eval "
  rs.initiate({
    _id: 'rs0',
    members: [{ _id: 0, host: 'localhost:27017' }]
  })
"

echo "Replica set initialized successfully!"
