# Adsız İlan Sitesi (tasaruf_ailem)

A classified ads platform built with Node.js, Express, and PostgreSQL.

## Features

- User Authentication (Login / Register) with password hashing (bcrypt)
- Session Management
- Create, View, and Manage Classified Ads
- Image Uploads (Multer)
- PostgreSQL Database Integration

## Prerequisites

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)

## Installation & Setup

1. **Clone the repository** or extract the project files to your local machine.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Configuration**:
   - Create a PostgreSQL database for the project.
   - Update the database connection settings in `server.js` with your PostgreSQL credentials.

4. **Start the application**:
   ```bash
   npm start
   ```
   The server will start and you can access the application in your browser (check the console for the port, usually `http://localhost:3000`).

## Project Structure

- `server.js` - Main application entry point and Express server setup.
- `*.html` - Frontend views (Home, Login, Register, Profile, Add Ads, Ad Details).
- `*.css` - Stylesheets for the views.
- `uploads/` - Directory where uploaded images for ads are stored.

## License

This project is licensed under the [ISC License](LICENSE).
