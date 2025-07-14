# Login API with JavaScript

A RESTful authentication API built with Node.js, Express, and JWT. Features user registration, login, profile management, account security, and comprehensive testing with Mocha and Supertest. Includes automated CI/CD with GitHub Actions and test reporting.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 🛡️ **Password Hashing** - Bcrypt password encryption
- ✅ **Input Validation** - Express-validator for request validation
- 🚀 **Rate Limiting** - Protection against brute force attacks
- 🔒 **Account Locking** - Automatic account lockout after 3 failed login attempts
- 🔑 **Password Reset** - Secure password reset via email tokens
- 🧪 **Comprehensive Testing** - Mocha + Supertest test suite
- 📊 **Test Reporting** - Allure HTML reports and NYC coverage reports
- 🔄 **CI/CD Pipeline** - Automated testing with GitHub Actions
- 🌐 **GitHub Pages** - Live test reports and coverage dashboard
- 📚 **API Documentation** - Interactive Swagger/OpenAPI documentation
- 🔒 **Security Headers** - Helmet for security middleware
- 📝 **Error Handling** - Centralized error management
- 🏥 **Health Check** - API health monitoring endpoint

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login user | No |
| `POST` | `/api/auth/forgot-password` | Request password reset | No |
| `POST` | `/api/auth/reset-password` | Reset password with token | No |
| `GET` | `/api/auth/profile` | Get user profile | Yes |
| `PUT` | `/api/auth/profile` | Update user profile | Yes |
| `GET` | `/health` | Health check | No |

## Security Features

### Account Locking
- **3 Failed Attempts**: Account is automatically locked after 3 consecutive failed login attempts
- **15-Minute Lockout**: Locked accounts are automatically unlocked after 15 minutes
- **Attempt Tracking**: Shows remaining attempts before lockout
- **Manual Unlock**: Password reset automatically unlocks the account

### Password Reset
- **Email-Based**: Secure password reset via email tokens
- **1-Hour Expiry**: Reset tokens expire after 1 hour
- **Security**: Doesn't reveal if email exists (prevents user enumeration)
- **Strong Validation**: New passwords must meet security requirements

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd login-api-with-ia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   BCRYPT_ROUNDS=12
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access API Documentation**
   - Open your browser and go to: `http://localhost:3000/api-docs`
   - Interactive Swagger UI with all endpoints documented
   - Test endpoints directly from the browser

6. **Run tests**
   ```bash
   # Run all tests
   npm test
   
   # Run tests in watch mode
   npm run test:watch
   ```

## API Documentation

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User

**POST** `/api/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Failed Login Response (401):**
```json
{
  "error": "Authentication failed",
  "message": "Invalid email or password. 2 attempts remaining."
}
```

**Account Locked Response (423):**
```json
{
  "error": "Account locked",
  "message": "Your account has been locked due to multiple failed login attempts. Please wait 15 minutes or reset your password."
}
```

### Request Password Reset

**POST** `/api/auth/forgot-password`

Request a password reset link via email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset link sent to your email",
  "resetToken": "abc123def456", // Remove in production
  "expiresIn": "1 hour"
}
```

### Reset Password

**POST** `/api/auth/reset-password`

Reset password using the token from email.

**Request Body:**
```json
{
  "email": "john@example.com",
  "token": "abc123def456",
  "newPassword": "NewPassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully. You can now login with your new password."
}
```

### Get User Profile

**GET** `/api/auth/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update User Profile

**PUT** `/api/auth/profile`

Update current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "John Smith",
    "email": "john.smith@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Validation Rules

### Registration
- **Email**: Must be a valid email format
- **Password**: Minimum 6 characters, must contain uppercase, lowercase, and number
- **Name**: 2-50 characters

### Login
- **Email**: Must be a valid email format
- **Password**: Required

### Password Reset
- **Email**: Must be a valid email format
- **Token**: Required (from email)
- **New Password**: Minimum 6 characters, must contain uppercase, lowercase, and number

### Profile Update
- **Email**: Must be a valid email format (if provided)
- **Name**: 2-50 characters (if provided)

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Please provide a valid email address",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "error": "Authentication failed",
  "message": "Invalid email or password. 2 attempts remaining."
}
```

### Account Locked Error (423)
```json
{
  "error": "Account locked",
  "message": "Your account has been locked due to multiple failed login attempts. Please wait 15 minutes or reset your password."
}
```

### Authorization Error (403)
```json
{
  "error": "Invalid token",
  "message": "The provided authentication token is invalid"
}
```

### Not Found Error (404)
```json
{
  "error": "Route not found",
  "message": "Cannot GET /api/nonexistent"
}
```

## Security Implementation

### Account Locking Logic
1. **Attempt Tracking**: Each failed login increments a counter
2. **Lockout Threshold**: Account locks after 3 failed attempts
3. **Auto-Unlock**: Account unlocks after 15 minutes of inactivity
4. **Manual Unlock**: Password reset immediately unlocks account
5. **Attempt Reset**: Successful login resets attempt counter

### Password Reset Flow
1. **Request Reset**: User requests password reset via email
2. **Token Generation**: System generates secure token with 1-hour expiry
3. **Email Delivery**: Token sent to user's email (simulated in demo)
4. **Token Verification**: User provides token and new password
5. **Password Update**: System validates token and updates password
6. **Account Unlock**: Reset automatically unlocks locked accounts

## Testing

The project includes comprehensive tests covering:

- ✅ User registration (success and validation)
- ✅ User login (success and authentication)
- ✅ Account locking (3 failed attempts)
- ✅ Account auto-unlock (15-minute timeout)
- ✅ Password reset (request and confirm)
- ✅ Profile management (get and update)
- ✅ JWT token validation
- ✅ Input validation
- ✅ Error handling
- ✅ Health check endpoint

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx mocha test/auth.test.js
```

### Test Reports

The project generates detailed test reports:

- **Allure Reports**: Professional HTML test reports with detailed results and trends
- **NYC Coverage Reports**: Code coverage analysis with line-by-line details
- **GitHub Pages**: Live reports available at `https://yourusername.github.io/login-api-with-ia/`

### CI/CD Pipeline

The project includes automated CI/CD with GitHub Actions:

- **Automated Testing**: Runs on every push and pull request
- **Test Reports**: Generates and uploads test artifacts
- **Coverage Reports**: Tracks code coverage metrics
- **GitHub Pages**: Automatically deploys reports to GitHub Pages
- **Artifact Storage**: Stores reports for 90 days

## Project Structure

```
login-api-with-ia/
├── src/
│   ├── controllers/
│   │   └── authController.js    # Authentication logic
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication
│   │   └── errorHandler.js     # Error handling
│   ├── models/
│   │   └── User.js             # User data model with security features
│   ├── routes/
│   │   └── auth.js             # Authentication routes
│   └── server.js               # Main server file
├── test/
│   └── auth.test.js            # Comprehensive test suite
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD pipeline
├── package.json
├── env.example
└── README.md
```

## CI/CD and Reporting

### GitHub Actions Workflow

The project uses GitHub Actions for continuous integration:

1. **Trigger**: Runs on push to main and pull requests
2. **Environment**: Ubuntu latest with Node.js 18
3. **Steps**:
   - Install dependencies
   - Run tests with Allure
   - Generate coverage reports
   - Upload test artifacts
   - Deploy reports to GitHub Pages (main branch only)

### Test Reports Access

- **GitHub Actions**: Download artifacts from Actions tab
- **GitHub Pages**: View live reports at `https://yourusername.github.io/login-api-with-ia/`
- **Local**: Reports generated in `allure-report/` and `coverage/` directories

### Report Types

- **Allure**: Professional HTML test reports with pass/fail status, trends, and detailed insights
- **NYC Coverage**: Code coverage with branch and line coverage metrics
- **Landing Page**: Custom index page with navigation to all reports

## Security Features

- **Password Hashing**: Bcrypt with configurable salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **Account Locking**: Automatic lockout after failed attempts
- **Password Reset**: Secure email-based password recovery
- **Security Headers**: Helmet middleware for security
- **Input Validation**: Comprehensive request validation
- **CORS**: Cross-origin resource sharing configuration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration time | 24h |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details. 