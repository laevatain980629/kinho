import type { WorkOrderActionSchema, ValidationResult } from './types';

export function validateActionForm(
  action: WorkOrderActionSchema,
  form: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const field of action.fields) {
    const value = form[field.name];

    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors[field.name] = `${field.label}不能为空`;
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        errors[field.name] = `请至少选择一项${field.label}`;
        continue;
      }
      // required select/engineer-select/outlet-select must be positive number
      if (field.type === 'select' || field.type === 'outlet-select' || field.type === 'engineer-select') {
        const numericValue = typeof value === 'number' || typeof value === 'string' ? Number(value) : undefined;
        if (numericValue !== undefined && !Number.isNaN(numericValue) && numericValue <= 0) {
          errors[field.name] = `请选择${field.label}`;
          continue;
        }
      }
    }

    if (field.minLength && typeof value === 'string' && value.trim().length < field.minLength) {
      errors[field.name] = `${field.label}至少需要 ${field.minLength} 个字符`;
    }

    if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
      errors[field.name] = `${field.label}不能超过 ${field.maxLength} 个字符`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
