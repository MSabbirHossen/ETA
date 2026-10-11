import { describe, it, expect } from 'vitest';
import { slugify, calculatePaginationMeta, assertDefined } from '@eta/utils';

describe('slugify', () => {
  it('converts a title to a URL-safe slug', () => {
    expect(slugify('Introduction to Web Development')).toBe('introduction-to-web-development');
  });

  it('handles special characters', () => {
    expect(slugify('Course: Advanced C++ & Algorithms')).toBe('course-advanced-c-algorithms');
  });

  it('trims and collapses whitespace', () => {
    expect(slugify('  hello   world  ')).toBe('hello-world');
  });
});

describe('calculatePaginationMeta', () => {
  it('returns correct pagination metadata', () => {
    const result = calculatePaginationMeta(95, 2, 20);
    expect(result).toEqual({ page: 2, limit: 20, total: 95, pages: 5 });
  });

  it('handles exact page boundary', () => {
    const result = calculatePaginationMeta(40, 1, 20);
    expect(result).toEqual({ page: 1, limit: 20, total: 40, pages: 2 });
  });

  it('handles zero total', () => {
    const result = calculatePaginationMeta(0, 1, 20);
    expect(result).toEqual({ page: 1, limit: 20, total: 0, pages: 0 });
  });
});

describe('assertDefined', () => {
  it('returns the value when defined', () => {
    expect(assertDefined('hello', 'test')).toBe('hello');
  });

  it('throws for null', () => {
    expect(() => assertDefined(null, 'test')).toThrow('Expected test to be defined');
  });

  it('throws for undefined', () => {
    expect(() => assertDefined(undefined, 'test')).toThrow('Expected test to be defined');
  });
});
