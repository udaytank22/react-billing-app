# Simple Ledger App (Khata)

A privacy-first, offline-first ledger application for small businesses.

## Features

- **100% Offline**: All data stays on your device using SQLite.
- **Privacy First**: No analytics, no ads, no cloud sync, and no unnecessary permissions.
- **Customer Management**: Add and search customers easily.
- **Transaction Ledger**: Track credits (Got) and debits (Gave) for each customer.
- **Business Reports**: Get a quick overview of your net balance and customer-wise summaries.
- **Export & Backup**: Export your data to CSV or create a local database backup.

## Tech Stack

- React Native CLI
- TypeScript
- SQLite (react-native-sqlite-storage)
- React Navigation
- Date-fns

## Getting Started

### Prerequisites

- Node.js
- React Native Development Environment (Android Studio / Xcode)

### Installation

1. Clone the repository.
2. Run `npm install`.
3. For iOS: `cd ios && pod install && cd ..`.

### Running the App

- **Android**: `npx react-native run-android`
- **iOS**: `npx react-native run-ios`

## Privacy Policy

Your data is yours. This app does not collect, store, or transmit any of your personal or business data to any external servers. Backups are stored locally on your device or in your chosen cloud storage (via manual share).
