# Voter Management System

A complete voter management system with React frontend and Node.js backend using MongoDB.

## Features

- ✅ View all voter records
- 🔍 Search by name, district, voter number
- 📊 Dashboard with statistics
- 👤 Admin authentication
- 📤 Excel file upload (.xlsx) with duplicate detection
- ✏️ Edit records
- 🗑️ Delete records
- 📱 Responsive design
- 🔒 Secure API with JWT

## Tech Stack

### Frontend
- React 18
- XLSX for Excel parsing
- CSS3 with modern design
- Axios for API calls

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- XLSX for Excel processing

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)

### Backend Setup
```bash
cd server
npm install
cp .env.example .env  # Edit with your values
npm run dev