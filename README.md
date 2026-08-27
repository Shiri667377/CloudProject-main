# MedLoad

MedLoad is a cloud-based healthcare load monitoring system designed to help users compare clinic congestion and estimated waiting times and choose a suitable clinic to visit.

The project was developed as an academic cloud computing project and uses a serverless AWS architecture. It combines a React frontend with AWS authentication, API services, serverless backend functions, and DynamoDB storage.

## Features

* View current load information for active clinics
* Compare estimated waiting times, occupancy, and load scores
* Receive a recommended clinic based on current load data
* View detailed information for each clinic
* View hourly forecasts for expected clinic load
* View weekly load profiles based on historical data
* Search, sort, and filter clinics
* Automatic dashboard refresh
* Secure user authentication and authorization
* Admin panel for managing active clinics
* Simulated healthcare load data for demonstration and analysis

## Architecture

MedLoad follows a serverless architecture on AWS:

```text
React / Vite Frontend
        |
        | Authentication
        v
Amazon Cognito
        |
        | Authorized API Requests
        v
Amazon API Gateway
        |
        v
AWS Lambda
        |
        v
Amazon DynamoDB
```

The frontend is deployed using **AWS Amplify Hosting**. Backend operations are implemented as independent **AWS Lambda** functions, while **Amazon DynamoDB** stores clinic information and load measurements.

## AWS Services

* **AWS Amplify** – frontend hosting and deployment
* **Amazon Cognito** – authentication and role-based authorization
* **Amazon API Gateway** – REST API layer
* **AWS Lambda** – serverless backend logic
* **Amazon DynamoDB** – storage for clinics and load data

## Backend Functions

The backend is divided into several Lambda functions, including:

* `GetLatestLoads` – retrieves the latest load information for active clinics
* `GetClinicLatestLoad` – retrieves the latest metrics for a specific clinic
* `GetHourlyForecast` – generates an hourly load forecast
* `GetWeeklyProfile` – builds a weekly load profile from historical measurements
* `GenerateMockLoad` – generates simulated clinic load measurements
* `AdminGetClinics` – retrieves clinic information for administrators
* `AdminSetClinicActive` – enables or disables clinics
* `seedClinics` – initializes clinic data

## API Endpoints

| Method | Endpoint                           | Description                                    |
| ------ | ---------------------------------- | ---------------------------------------------- |
| `GET`  | `/loads`                           | Get the latest load data for active clinics    |
| `GET`  | `/loads/{clinicId}`                | Get the latest load data for a specific clinic |
| `GET`  | `/forecast/hourly/{clinicId}`      | Get an hourly load forecast                    |
| `GET`  | `/forecast/weekly/{clinicId}`      | Get a weekly load profile                      |
| `GET`  | `/admin/clinics`                   | Get clinics for the admin panel                |
| `PUT`  | `/admin/clinics/{clinicId}/active` | Enable or disable a clinic                     |

## Load Analysis

Each simulated clinic measurement contains operational metrics such as queue length, number of active providers, active sessions, capacity, estimated waiting time, occupancy, and an overall load score.

The system uses these indicators to make clinic loads easier to compare. Historical measurements are also used to calculate hourly and weekly load patterns.

> **Note:** The project uses simulated data for academic and demonstration purposes. It does not use real patient or medical data.

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* React Router

### Backend

* Python
* AWS Lambda
* Amazon API Gateway

### Cloud & Data

* Amazon DynamoDB
* Amazon Cognito
* AWS Amplify

## Project Structure

```text
MedLoad/
├── Frontend/
│   └── medload-frontend/
│       ├── src/
│       ├── public/
│       └── package.json
│
└── Backend/
    ├── Lambdas/
    └── Api Swagger/
```

## Running the Frontend Locally

### Prerequisites

* Node.js
* npm
* An AWS Cognito configuration
* A deployed MedLoad API

### Installation

```bash
cd medload-frontend
npm install
npm run dev
```

Before running the application, configure the Cognito settings in `src/authConfig.js` and the API base URL used by the frontend.

## Security

Authentication is handled through Amazon Cognito. Protected API calls use access tokens, while administrative functionality is restricted using role-based authorization.

Credentials, access tokens, AWS secrets, and environment-specific configuration should never be committed to the repository.

## Authors

Developed by **Shiri Weiss** and **Lior Ben Yehuda** as part of an academic cloud computing project.
