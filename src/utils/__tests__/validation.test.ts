import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired
} from '../validation'

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate required email', () => {
      expect(validateEmail('')).toEqual({
        isValid: false,
        error: 'Email is required'
      })
    })

    it('should validate email format', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid@com',
        'invalid.com',
        'invalid @example.com',
        'invalid@example',
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toEqual({
          isValid: false,
          error: 'Please enter a valid email address'
        })
      })
    })

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@example-site.com',
        'a@b.co',
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toEqual({
          isValid: true
        })
      })
    })
  })

  describe('validatePassword', () => {
    it('should validate required password', () => {
      expect(validatePassword('')).toEqual({
        isValid: false,
        error: 'Password is required'
      })
    })

    it('should validate minimum length', () => {
      expect(validatePassword('12345')).toEqual({
        isValid: false,
        error: 'Password must be at least 6 characters long'
      })
    })

    it('should require lowercase letter', () => {
      expect(validatePassword('PASSWORD123')).toEqual({
        isValid: false,
        error: 'Password must contain at least one lowercase letter'
      })
    })

    it('should require uppercase letter', () => {
      expect(validatePassword('password123')).toEqual({
        isValid: false,
        error: 'Password must contain at least one uppercase letter'
      })
    })

    it('should require number', () => {
      expect(validatePassword('Password')).toEqual({
        isValid: false,
        error: 'Password must contain at least one number'
      })
    })

    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password123',
        'MySecure1',
        'Test123Pass',
        'Abcdef1',
      ]

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toEqual({
          isValid: true
        })
      })
    })
  })

  describe('validatePasswordConfirmation', () => {
    it('should validate required confirmation', () => {
      expect(validatePasswordConfirmation('Password123', '')).toEqual({
        isValid: false,
        error: 'Please confirm your password'
      })
    })

    it('should validate password match', () => {
      expect(validatePasswordConfirmation('Password123', 'DifferentPassword')).toEqual({
        isValid: false,
        error: 'Passwords do not match'
      })
    })

    it('should accept matching passwords', () => {
      expect(validatePasswordConfirmation('Password123', 'Password123')).toEqual({
        isValid: true
      })
    })
  })

  describe('validateRequired', () => {
    it('should validate empty values', () => {
      expect(validateRequired('', 'Field')).toEqual({
        isValid: false,
        error: 'Field is required'
      })
    })

    it('should validate whitespace-only values', () => {
      expect(validateRequired('   ', 'Field')).toEqual({
        isValid: false,
        error: 'Field is required'
      })
    })

    it('should accept valid values', () => {
      expect(validateRequired('value', 'Field')).toEqual({
        isValid: true
      })
    })

    it('should handle different field names', () => {
      expect(validateRequired('', 'Username')).toEqual({
        isValid: false,
        error: 'Username is required'
      })
    })
  })
})