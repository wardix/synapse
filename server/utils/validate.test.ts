import { describe, expect, it } from 'bun:test'
import {
  sanitizeHtml,
  ValidationError,
  validateArray,
  validateColor,
  validateNumber,
  validatePagination,
  validateSlug,
  validateString,
} from './validate'

describe('Validation Utils', () => {
  describe('validateString', () => {
    it('should validate and trim valid strings', () => {
      expect(validateString(' hello ', { fieldName: 'test' })).toBe('hello')
    })

    it('should throw on non-strings', () => {
      expect(() => validateString(123, { fieldName: 'test' })).toThrow(
        ValidationError,
      )
    })

    it('should enforce minLength', () => {
      expect(() =>
        validateString('ab', { minLength: 3, fieldName: 'test' }),
      ).toThrow(ValidationError)
    })

    it('should enforce maxLength', () => {
      expect(() =>
        validateString('abcd', { maxLength: 3, fieldName: 'test' }),
      ).toThrow(ValidationError)
    })

    it('should sanitize html', () => {
      expect(
        validateString('<script>alert(1)</script>hello', { fieldName: 'test' }),
      ).toBe('hello')
    })
  })

  describe('validateNumber', () => {
    it('should validate valid numbers', () => {
      expect(validateNumber(123, { fieldName: 'test' })).toBe(123)
      expect(validateNumber('456', { fieldName: 'test' })).toBe(456)
    })

    it('should throw on invalid numbers', () => {
      expect(() => validateNumber('abc', { fieldName: 'test' })).toThrow(
        ValidationError,
      )
    })

    it('should enforce min and max', () => {
      expect(() => validateNumber(5, { min: 10, fieldName: 'test' })).toThrow(
        ValidationError,
      )
      expect(() => validateNumber(15, { max: 10, fieldName: 'test' })).toThrow(
        ValidationError,
      )
    })
  })

  describe('validateArray', () => {
    it('should validate valid arrays', () => {
      expect(validateArray([1, 2], { fieldName: 'test' })).toEqual([1, 2])
    })

    it('should throw on non-arrays', () => {
      expect(() => validateArray('not-array', { fieldName: 'test' })).toThrow(
        ValidationError,
      )
    })

    it('should enforce length constraints', () => {
      expect(() =>
        validateArray([1], { minLength: 2, fieldName: 'test' }),
      ).toThrow(ValidationError)
      expect(() =>
        validateArray([1, 2, 3], { maxLength: 2, fieldName: 'test' }),
      ).toThrow(ValidationError)
    })

    it('should use itemValidator', () => {
      expect(
        validateArray(['1', '2'], { fieldName: 'test' }, (item) =>
          validateNumber(item, { fieldName: 'item' }),
        ),
      ).toEqual([1, 2])
    })
  })

  describe('validatePagination', () => {
    it('should return defaults for undefined', () => {
      expect(validatePagination(undefined, undefined)).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      })
    })

    it('should parse valid values', () => {
      expect(validatePagination('2', '10')).toEqual({
        page: 2,
        limit: 10,
        offset: 10,
      })
    })

    it('should fallback to defaults on invalid input', () => {
      expect(validatePagination('abc', '150')).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      }) // 150 > max limit
    })
  })

  describe('validateSlug', () => {
    it('should allow valid slugs', () => {
      expect(validateSlug('my-slug-123')).toBe('my-slug-123')
    })

    it('should reject invalid slugs', () => {
      expect(() => validateSlug('My Slug')).toThrow(ValidationError)
      expect(() => validateSlug('slug_with_underscores')).toThrow(
        ValidationError,
      )
    })
  })

  describe('validateColor', () => {
    it('should allow valid hex colors', () => {
      expect(validateColor('#fff')).toBe('#fff')
      expect(validateColor('#1A2b3C')).toBe('#1A2b3C')
    })

    it('should reject invalid colors', () => {
      expect(() => validateColor('red')).toThrow(ValidationError)
      expect(() => validateColor('#12345')).toThrow(ValidationError)
    })
  })

  describe('sanitizeHtml', () => {
    it('should strip script tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>Hello')).toBe('Hello')
    })

    it('should strip event handlers', () => {
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe(
        '<img src="x" "alert(1)">',
      )
    })
  })
})
