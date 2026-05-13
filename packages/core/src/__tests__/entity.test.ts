import { describe, it, expect } from 'vitest';
import { EntityDefinitionSchema, FieldDefinitionSchema, FieldType } from '../primitives/entity.js';

describe('FieldDefinitionSchema', () => {
  it('parses a valid text field', () => {
    const result = FieldDefinitionSchema.safeParse({
      name: 'first_name',
      type: 'text',
      label: 'First Name',
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects field names that start with a digit', () => {
    const result = FieldDefinitionSchema.safeParse({
      name: '1bad',
      type: 'text',
      label: 'Bad',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown field types', () => {
    const result = FieldDefinitionSchema.safeParse({
      name: 'score',
      type: 'vector',
      label: 'Score',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid FieldType values', () => {
    const types: FieldType[] = [
      'text', 'number', 'money', 'date', 'datetime', 'boolean',
      'reference', 'enum', 'json', 'file', 'email', 'phone', 'url',
    ];
    for (const type of types) {
      const result = FieldDefinitionSchema.safeParse({ name: 'f', type, label: 'F' });
      expect(result.success, `Expected type "${type}" to be valid`).toBe(true);
    }
  });
});

describe('EntityDefinitionSchema', () => {
  const baseEntity = {
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000002',
    name: 'Customer',
    pluralName: 'Customers',
    label: 'Customer',
    pluralLabel: 'Customers',
    fields: [],
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('parses a valid entity definition', () => {
    expect(EntityDefinitionSchema.safeParse(baseEntity).success).toBe(true);
  });

  it('rejects entity names that do not start with uppercase', () => {
    const result = EntityDefinitionSchema.safeParse({ ...baseEntity, name: 'customer' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUIDs', () => {
    const result = EntityDefinitionSchema.safeParse({ ...baseEntity, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
