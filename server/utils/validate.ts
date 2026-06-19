export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateString(
  value: unknown,
  options: { minLength?: number; maxLength?: number; fieldName: string },
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${options.fieldName} must be a string`)
  }

  const str = value.trim()

  if (options.minLength !== undefined && str.length < options.minLength) {
    throw new ValidationError(
      `${options.fieldName} must be at least ${options.minLength} characters`,
    )
  }

  if (options.maxLength !== undefined && str.length > options.maxLength) {
    throw new ValidationError(
      `${options.fieldName} must be at most ${options.maxLength} characters`,
    )
  }

  return sanitizeHtml(str)
}

export function validateNumber(
  value: unknown,
  options: { min?: number; max?: number; fieldName: string },
): number {
  const num = Number(value)
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new ValidationError(`${options.fieldName} must be a number`)
  }

  if (Number.isNaN(num)) {
    throw new ValidationError(`${options.fieldName} must be a valid number`)
  }

  if (options.min !== undefined && num < options.min) {
    throw new ValidationError(
      `${options.fieldName} must be at least ${options.min}`,
    )
  }

  if (options.max !== undefined && num > options.max) {
    throw new ValidationError(
      `${options.fieldName} must be at most ${options.max}`,
    )
  }

  return num
}

export function validateArray<T>(
  value: unknown,
  options: { minLength?: number; maxLength?: number; fieldName: string },
  itemValidator?: (item: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${options.fieldName} must be an array`)
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${options.fieldName} must contain at least ${options.minLength} items`,
    )
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${options.fieldName} must contain at most ${options.maxLength} items`,
    )
  }

  if (itemValidator) {
    return value.map((item, index) => itemValidator(item, index))
  }

  return value as T[]
}

export function validatePagination(pageStr: unknown, limitStr: unknown) {
  let page = 1
  let limit = 20

  if (pageStr !== undefined) {
    try {
      page = validateNumber(pageStr, { min: 1, fieldName: 'page' })
    } catch (_e) {
      page = 1
    }
  }

  if (limitStr !== undefined) {
    try {
      limit = validateNumber(limitStr, { min: 1, max: 100, fieldName: 'limit' })
    } catch (_e) {
      limit = 20
    }
  }

  return { page, limit, offset: (page - 1) * limit }
}

export function validateSlug(value: unknown, fieldName = 'slug'): string {
  const slug = validateString(value, { fieldName })
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ValidationError(
      `${fieldName} can only contain lowercase letters, numbers, and hyphens`,
    )
  }
  return slug
}

export function validateColor(value: unknown, fieldName = 'color'): string {
  const color = validateString(value, { fieldName })
  if (!/^#([0-9a-fA-F]{3}){1,2}$/.test(color)) {
    throw new ValidationError(`${fieldName} must be a valid hex color code`)
  }
  return color
}

// Basic XSS sanitization (strip script tags, event handlers, javascript: protocols)
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
}
