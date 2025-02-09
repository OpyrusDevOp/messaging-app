# Messaging

[Installation](#Installation)

[Usages](#Usages)

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
  
- Install packages (From messaging-client folder)
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

## Usages

### Account
First need to signin :
![signin](https://github.com/user-attachments/assets/a726406b-a233-42ca-b55d-9d001012f600)

or signup if you don't have an account
![signup](https://github.com/user-attachments/assets/92135eb0-6aa3-4977-9abc-9f1930ece5da)

### Chats
In the main page, you will have your conversations history here:
![chat_noselected](https://github.com/user-attachments/assets/601cd06b-16d8-4f0c-bf51-8e7c3a6341c9)

If you want to start a conversation with a user, just search for his username and select the correct one:
![chat_research](https://github.com/user-attachments/assets/4e201ff8-4289-4475-bd44-81c0fda02b6d)

Then you can chat, send message or files:
![chat_selected](https://github.com/user-attachments/assets/5ba2269b-70a0-46a7-aa32-063cb5abf32d)

**Notes :** Even though you will have the emoji panel, it won't be added to message. But if your system already got emoji selection it will be supported !

## Features
- [x] Sending and receiving messages
- [x] Status indicators
  - [x] Read receipt
  - [x] Typing indicator
- [ ] Media sharing
  - [x] Image and video support
  - [ ] Sending emoticons
- [ ] Creation and management of discussion groups 
