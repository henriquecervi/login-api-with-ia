const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
  // Register a new user
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email address already exists'
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        name
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Check if account is locked
      const isLocked = await User.isAccountLocked(email);
      if (isLocked) {
        return res.status(423).json({
          error: 'Account locked',
          message: 'Your account has been locked due to multiple failed login attempts. Please wait 15 minutes or reset your password.'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        // Track failed attempt even for non-existent users
        await User.trackLoginAttempt(email, false);
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isPasswordValid = user.password ? await bcrypt.compare(password, user.password) : false;
      
      // Track login attempt
      await User.trackLoginAttempt(email, isPasswordValid);
      
      if (!isPasswordValid) {
        const updatedUser = await User.findByEmail(email);
        const remainingAttempts = 3 - updatedUser.loginAttempts;
        
        if (remainingAttempts > 0) {
          return res.status(401).json({
            error: 'Authentication failed',
            message: `Invalid email or password. ${remainingAttempts} attempts remaining.`
          });
        } else {
          return res.status(423).json({
            error: 'Account locked',
            message: 'Your account has been locked due to multiple failed login attempts. Please wait 15 minutes or reset your password.'
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json({
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      next(error);
    }
  }

  // Request password reset
  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Generate password reset token
      const userWithToken = await User.generatePasswordResetToken(email);
      
      // In a real application, you would send an email here
      // For demonstration, we'll return the token in the response
      // In production, this should be sent via email
      
      res.status(200).json({
        message: 'Password reset link sent to your email',
        resetToken: userWithToken.passwordResetToken, // Remove this in production
        expiresIn: '1 hour'
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset password with token
  async resetPassword(req, res, next) {
    try {
      const { email, token, newPassword } = req.body;

      // Verify token
      const user = await User.verifyPasswordResetToken(email, token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'The password reset token is invalid or has expired'
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Reset password
      const updatedUser = await User.resetPassword(email, token, hashedPassword);
      
      if (!updatedUser) {
        return res.status(400).json({
          error: 'Password reset failed',
          message: 'Unable to reset password. Please try again.'
        });
      }

      res.status(200).json({
        message: 'Password reset successfully. You can now login with your new password.'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user profile
  async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json({
        user: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const { name, email } = req.body;

      // Validate input
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            error: 'Invalid email format',
            message: 'Please provide a valid email address'
          });
        }
      }

      if (name && (name.length < 2 || name.length > 50)) {
        return res.status(400).json({
          error: 'Invalid name length',
          message: 'Name must be between 2 and 50 characters'
        });
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            error: 'Email already exists',
            message: 'This email address is already in use'
          });
        }
      }

      // Update user
      const updatedUser = await User.update(userId, { name, email });
      
      if (!updatedUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      // Return updated user data without password
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  }

  // Change user password
  async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          error: 'Invalid current password',
          message: 'The current password you provided is incorrect'
        });
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          error: 'Invalid new password',
          message: 'New password must be different from your current password'
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const updatedUser = await User.update(userId, { password: hashedNewPassword });
      
      if (!updatedUser) {
        return res.status(500).json({
          error: 'Update failed',
          message: 'Failed to update password'
        });
      }

      res.status(200).json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController(); 