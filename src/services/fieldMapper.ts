// Field mapper service - extracts Shopify data based on JSON path mappings

import type { ShopifyOrder } from '../types/shopify';
import type { ZaloFieldMapping } from './db';

export class FieldMapperService {
  /**
   * Extract value from Shopify order using JSON path notation
   * Supported patterns:
   * - Simple: "customer.first_name"
   * - Array: "line_items[0].title"
   * - Array concat: "line_items[].title || \" x\" || line_items[].quantity"
   * - Multiple fields: "first_name || \" \" || last_name"
   * - With currency: "total_price || \" \" || currency"
   */
  static extractValue(order: ShopifyOrder, path: string): string | null {
    if (!path || path.trim() === '') {
      return null;
    }

    // Handle concatenation patterns (|| operator)
    if (path.includes('||')) {
      const parts = path.split('||').map(p => p.trim());
      let result = '';

      for (const part of parts) {
        // Remove quotes from string literals
        if ((part.startsWith('"') && part.endsWith('"')) ||
            (part.startsWith("'") && part.endsWith("'"))) {
          result += part.slice(1, -1);
        } else {
          // Extract field value
          const value = this.extractFieldValue(order, part);
          if (value !== null) {
            result += value;
          }
        }
      }

      return result || null;
    }

    // Simple field extraction
    return this.extractFieldValue(order, path);
  }

  /**
   * Extract a single field value from the order object
   */
  private static extractFieldValue(order: any, path: string): string | null {
    // Handle array notation like "line_items[].title"
    if (path.includes('[].')) {
      const [arrayPath, fieldPath] = path.split('[].');
      const array = this.getNestedValue(order, arrayPath);

      if (Array.isArray(array) && array.length > 0) {
        const values = array.map(item => this.getNestedValue(item, fieldPath));
        // Join array values with comma for lists
        return values.filter(v => v !== null && v !== undefined).join(', ');
      }
      return null;
    }

    // Handle indexed array like "line_items[0].title"
    if (path.match(/\[\d+\]/)) {
      const match = path.match(/(.+)\[(\d+)\]\.?(.+)?/);
      if (match) {
        const [, arrayPath, indexStr, fieldPath] = match;
        const array = this.getNestedValue(order, arrayPath);
        const index = parseInt(indexStr, 10);

        if (Array.isArray(array) && array[index]) {
          if (fieldPath) {
            return String(this.getNestedValue(array[index], fieldPath) ?? '');
          }
          return String(array[index] ?? '');
        }
      }
      return null;
    }

    // Simple nested path
    const value = this.getNestedValue(order, path);
    return value !== null && value !== undefined ? String(value) : null;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Build template data from Shopify order using field mappings
   */
  static buildTemplateData(
    order: ShopifyOrder,
    mappings: ZaloFieldMapping[]
  ): Record<string, string> {
    const templateData: Record<string, string> = {};

    for (const mapping of mappings) {
      const value = this.extractValue(order, mapping.shopify_json_path);

      // Use default value if extraction failed and field is required
      if ((value === null || value === '') && mapping.is_required && mapping.default_value) {
        templateData[mapping.zalo_field_name] = mapping.default_value;
      } else if (value !== null) {
        templateData[mapping.zalo_field_name] = value;
      } else if (mapping.is_required) {
        // Required field with no value and no default - use empty string
        templateData[mapping.zalo_field_name] = '';
      }
    }

    return templateData;
  }

  /**
   * Validate that all required fields are present
   */
  static validateRequiredFields(
    templateData: Record<string, string>,
    mappings: ZaloFieldMapping[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const mapping of mappings) {
      if (mapping.is_required) {
        const value = templateData[mapping.zalo_field_name];
        if (!value || value.trim() === '') {
          missing.push(mapping.zalo_field_name);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
