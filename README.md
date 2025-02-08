# Messaging

[Installation](#Installation)

[Features](#Features)

## Installation
### Server side

- Clone this repository
  
- Install packages (From messaging-server folder)
   ```(shell)
    npm install
    ```
   
- Create .env file and define those properties
    ```
    FRONTEND_ADDRESS=
    SERVER_URL=
    PORT=
    JWT_SECRET=
    ```

- Start serveur with :
  ```
  npm run start
  or
  npm run watch // For hot reload. Need nodemon
  ```

### Client Side

- Clone this repository
  
- Install packages (From messaging-server folder)
   ```(shell)
    npm install
    ```
   
- Create .env file and define those properties
  ```
   VITE_SERVER_ADDRESS=
  ```

- Start or build app with :
  ```
  npm run dev
  or
  npm run build // For hot reload. Need nodemon
  ```
  
  *Note :* if you build, you will need to host the dist folder. Can be with php or nginx.

## Features
- [x] Sending and receiving messages
- [x] Status indicators
  - [x] Read receipt
  - [x] Typing indicator
- [ ] Media sharing
  - [x] Image and video support
  - [ ] Sending emoticons
- [ ] Creation and management of discussion groups 
