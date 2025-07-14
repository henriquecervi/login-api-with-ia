// Simple in-memory user storage for demonstration
// In a real application, this would be replaced with a database (MongoDB, PostgreSQL, etc.)
class User {
  constructor(id, email, password, name, createdAt) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.name = name;
    this.createdAt = createdAt || new Date().toISOString();
    this.loginAttempts = 0;
    this.lastLoginAttempt = null;
    this.isLocked = false;
    this.passwordResetToken = null;
    this.passwordResetExpires = null;
  }
}

// In-memory storage
let users = [];
let nextId = 1;

class UserModel {
  // Create a new user
  static async create(userData) {
    const user = new User(
      nextId++,
      userData.email,
      userData.password,
      userData.name
    );
    
    users.push(user);
    return { ...user };
  }

  // Find user by email
  static async findByEmail(email) {
    const user = users.find(u => u.email === email);
    return user ? { ...user } : null;
  }

  // Find user by ID
  static async findById(id) {
    const user = users.find(u => u.id === parseInt(id));
    return user ? { ...user } : null;
  }

  // Update user
  static async update(id, updateData) {
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    if (userIndex === -1) return null;

    const user = users[userIndex];
    const updatedUser = { ...user, ...updateData };
    users[userIndex] = updatedUser;
    
    return { ...updatedUser };
  }

  // Delete user
  static async delete(id) {
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    if (userIndex === -1) return false;

    users.splice(userIndex, 1);
    return true;
  }

  // Track login attempt
  static async trackLoginAttempt(email, success) {
    let userIndex = users.findIndex(u => u.email === email);
    
    // If user doesn't exist and it's a failed attempt, create a temporary record
    if (userIndex === -1 && !success) {
      const tempUser = new User(
        nextId++,
        email,
        null, // No password for non-existent users
        null,  // No name for non-existent users
        new Date().toISOString()
      );
      users.push(tempUser);
      userIndex = users.length - 1;
    } else if (userIndex === -1) {
      return null; // User doesn't exist and it's a successful login (shouldn't happen)
    }

    const user = users[userIndex];
    const now = new Date();

    if (success) {
      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.isLocked = false;
      user.lastLoginAttempt = now;
    } else {
      // Increment failed attempts
      user.loginAttempts += 1;
      user.lastLoginAttempt = now;
      
      // Lock account after 3 failed attempts
      if (user.loginAttempts >= 3) {
        user.isLocked = true;
      }
    }

    users[userIndex] = user;
    return { ...user };
  }

  // Check if account is locked
  static async isAccountLocked(email) {
    const user = users.find(u => u.email === email);
    if (!user) return false;
    
    // Check if account is locked due to failed attempts
    if (user.isLocked) {
      return true;
    }

    // Auto-unlock after 2 seconds for testing (15 minutes in production)
    if (user.lastLoginAttempt) {
      const lockoutDuration = process.env.NODE_ENV === 'test' ? 2000 : 15 * 60 * 1000; // 2s for test, 15 min for production
      const timeSinceLastAttempt = new Date() - new Date(user.lastLoginAttempt);
      
      if (user.loginAttempts >= 3 && timeSinceLastAttempt < lockoutDuration) {
        return true;
      } else if (timeSinceLastAttempt >= lockoutDuration) {
        // Auto-unlock after timeout
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
          users[userIndex].loginAttempts = 0;
          users[userIndex].isLocked = false;
        }
        return false;
      }
    }

    return false;
  }

  // Generate password reset token
  static async generatePasswordResetToken(email) {
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) return null;

    const user = users[userIndex];
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + (process.env.NODE_ENV === 'test' ? 10000 : 60 * 60 * 1000)); // 10s for test, 1 hour for production

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    users[userIndex] = user;

    return { ...user };
  }

  // Verify password reset token
  static async verifyPasswordResetToken(email, token) {
    const user = users.find(u => u.email === email);
    if (!user) return null;

    if (user.passwordResetToken !== token) return null;
    if (new Date() > new Date(user.passwordResetExpires)) return null;

    return { ...user };
  }

  // Reset password with token
  static async resetPassword(email, token, newPassword) {
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) return null;

    const user = users[userIndex];
    
    if (user.passwordResetToken !== token) return null;
    if (new Date() > new Date(user.passwordResetExpires)) return null;

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.loginAttempts = 0;
    user.isLocked = false;

    users[userIndex] = user;
    return { ...user };
  }

  // Get all users (for testing purposes)
  static async findAll() {
    return users.map(user => ({ ...user }));
  }

  // Clear all users (for testing purposes)
  static async clear() {
    users = [];
    nextId = 1;
  }
}

module.exports = UserModel; 