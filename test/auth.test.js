const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Authentication API', () => {
  let authToken;
  let testUser;

  // Clear users before each test
  beforeEach(async () => {
    await User.clear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).to.have.property('message', 'User registered successfully');
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('id');
      expect(response.body.user).to.have.property('email', userData.email);
      expect(response.body.user).to.have.property('name', userData.name);
      expect(response.body.user).to.not.have.property('password');
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body.details).to.be.an('array');
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).to.have.property('error', 'User already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const userData = {
        name: 'John Doe'
        // Missing email and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      testUser = response.body.user;
      authToken = response.body.token;
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'jane@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).to.have.property('message', 'Login successful');
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('email', loginData.email);
      expect(response.body.user).to.not.have.property('password');
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Authentication failed');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'jane@example.com',
        password: 'WrongPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Authentication failed');
      expect(response.body.message).to.include('2 attempts remaining');
    });

    it('should return 400 for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });

    it('should lock account after 3 failed attempts', async () => {
      const loginData = {
        email: 'jane@example.com',
        password: 'WrongPassword123'
      };

      // First failed attempt
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      // Second failed attempt
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      // Third failed attempt - should lock account
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      // Wait a bit to ensure account is locked
      await new Promise(res => setTimeout(res, 300));

      // Try one more time to confirm it's locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body).to.have.property('error', 'Account locked');
      expect(response.body.message).to.include('locked due to multiple failed login attempts');
    });

    it('should prevent login when account is locked', async () => {
      // Create a fresh user for this test
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Lock the account first
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      // Try to login with correct password while locked
      const correctLoginData = {
        email: 'test@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(correctLoginData)
        .expect(423);

      expect(response.body).to.have.property('error', 'Account locked');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'Password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should generate password reset token for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'bob@example.com' })
        .expect(200);

      expect(response.body).to.have.property('message', 'Password reset link sent to your email');
      expect(response.body).to.have.property('resetToken');
      expect(response.body).to.have.property('expiresIn', '1 hour');
    });

    it('should return success even for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).to.have.property('message', 'If an account with this email exists, a password reset link has been sent.');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken;

    beforeEach(async () => {
      // Create a test user
      const userData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'Password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Generate reset token
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'alice@example.com' });

      resetToken = response.body.resetToken;
    });

    it('should reset password successfully with valid token', async () => {
      const resetData = {
        email: 'alice@example.com',
        token: resetToken,
        newPassword: 'NewPassword123'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).to.have.property('message', 'Password reset successfully. You can now login with your new password.');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'NewPassword123'
        })
        .expect(200);

      expect(loginResponse.body).to.have.property('message', 'Login successful');
    });

    it('should return 400 for invalid token', async () => {
      const resetData = {
        email: 'alice@example.com',
        token: 'invalid-token',
        newPassword: 'NewPassword123'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid or expired token');
    });

    it('should return 400 for weak password', async () => {
      const resetData = {
        email: 'alice@example.com',
        token: resetToken,
        newPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const resetData = {
        email: 'alice@example.com',
        // Missing token and newPassword
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
    });

    it('should unlock account after password reset', async () => {
      // Lock the account first
      const loginData = {
        email: 'alice@example.com',
        password: 'WrongPassword123'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      // Generate a fresh reset token after locking the account
      const tokenResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'alice@example.com' })
        .expect(200);

      const freshResetToken = tokenResponse.body.resetToken;

      // Reset password
      const resetData = {
        email: 'alice@example.com',
        token: freshResetToken,
        newPassword: 'NewPassword123'
      };

      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(resetResponse.body).to.have.property('message', 'Password reset successfully. You can now login with your new password.');

      // Should be able to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'NewPassword123'
        })
        .expect(200);

      expect(loginResponse.body).to.have.property('message', 'Login successful');
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const userData = {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      testUser = response.body.user;
      authToken = response.body.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('id', testUser.id);
      expect(response.body.user).to.have.property('email', testUser.email);
      expect(response.body.user).to.have.property('name', testUser.name);
      expect(response.body.user).to.not.have.property('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).to.have.property('error', 'Access token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).to.have.property('error', 'Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const userData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      testUser = response.body.user;
      authToken = response.body.token;
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Alice Smith',
        email: 'alice.smith@example.com'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).to.have.property('message', 'Profile updated successfully');
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('name', updateData.name);
      expect(response.body.user).to.have.property('email', updateData.email);
    });

    it('should return 400 for invalid email format', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid email format');
    });

    it('should return 409 for email already in use', async () => {
      // Create another user
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'another@example.com',
          password: 'Password123'
        });

      const updateData = {
        email: 'another@example.com'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body).to.have.property('error', 'Email already exists');
    });

    it('should return 401 without token', async () => {
      const updateData = {
        name: 'New Name'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Access token required');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    beforeEach(async () => {
      // Register a test user and get auth token
      const userData = {
        name: 'Change Password User',
        email: 'changepass@example.com',
        password: 'OldPassword123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.token;
      testUser = registerResponse.body.user;
    });

    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).to.have.property('message', 'Password changed successfully');

      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'changepass@example.com',
          password: 'NewPassword123'
        })
        .expect(200);

      expect(loginResponse.body).to.have.property('token');
    });

    it('should return 401 for incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Invalid current password');
      expect(response.body).to.have.property('message', 'The current password you provided is incorrect');
    });

    it('should return 400 when new password is same as current password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'OldPassword123',
        confirmPassword: 'OldPassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Invalid new password');
      expect(response.body).to.have.property('message', 'New password must be different from your current password');
    });

    it('should return 400 for validation errors', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'weak',
        confirmPassword: 'weak'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body.details).to.be.an('array');
    });

    it('should return 400 when password confirmation does not match', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'DifferentPassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).to.have.property('error', 'Validation failed');
      expect(response.body.details).to.be.an('array');
    });

    it('should return 401 for missing authentication token', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .send(passwordData)
        .expect(401);

      expect(response.body).to.have.property('error', 'Access token required');
    });

    it('should return 403 for invalid authentication token', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', 'Bearer invalid_token')
        .send(passwordData)
        .expect(403);

      expect(response.body).to.have.property('error', 'Invalid token');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'OK');
      expect(response.body).to.have.property('message', 'Login API is running');
      expect(response.body).to.have.property('timestamp');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).to.have.property('error', 'Route not found');
    });
  });
}); 