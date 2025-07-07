# Backend API Documentation

## Overview
This is the backend of the fullstack application built with Node.js and Express.js. It follows the Model-Controller-Service (MCS) architecture pattern.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-fullstack-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

## API Endpoints

### GET /api/items
- Description: Retrieve a list of items.
- Response: Returns an array of item objects.

### POST /api/items
- Description: Create a new item.
- Request Body: JSON object representing the item.
- Response: Returns the created item object.

## Folder Structure

- **src/**: Contains the source code for the backend.
  - **controllers/**: Contains controller classes for handling requests.
  - **models/**: Contains model classes defining data structures.
  - **services/**: Contains service classes for business logic.
  - **app.js**: Entry point for the Express application.

## Technologies Used
- Node.js
- Express.js

## License
This project is licensed under the MIT License.