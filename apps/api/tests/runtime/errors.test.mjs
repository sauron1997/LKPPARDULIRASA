import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensure, createServiceError } from '../../src/runtime/errors.js';

describe('runtime/errors.js', () => {
  describe('ensure()', () => {
    it('does not throw on truthy condition', () => {
      assert.doesNotThrow(() => ensure(true, 'should not throw'));
      assert.doesNotThrow(() => ensure(1, 'truthy'));
      assert.doesNotThrow(() => ensure('non-empty', 'truthy'));
    });

    it('throws on falsy condition with correct properties', () => {
      try {
        ensure(false, 'Wajib diisi', 400, 'FIELD_REQUIRED');
        assert.fail('should have thrown');
      } catch (err) {
        assert.equal(err.message, 'Wajib diisi');
        assert.equal(err.status, 400);
        assert.equal(err.code, 'FIELD_REQUIRED');
      }
    });

    it('throws on null/undefined/0/empty-string', () => {
      assert.throws(() => ensure(null, 'null'));
      assert.throws(() => ensure(undefined, 'undefined'));
      assert.throws(() => ensure(0, 'zero'));
      assert.throws(() => ensure('', 'empty'));
    });

    it('has a numeric status when thrown', () => {
      try {
        ensure(false, 'test');
        assert.fail('should have thrown');
      } catch (err) {
        assert(typeof err.status === 'number', 'status should be a number');
        assert(err.status >= 400, 'status should be >= 400');
      }
    });
  });

  describe('createServiceError()', () => {
    it('creates error with message, status, code', () => {
      const err = createServiceError(404, 'Not found', 'NOT_FOUND');
      assert.equal(err.message, 'Not found');
      assert.equal(err.status, 404);
      assert.equal(err.code, 'NOT_FOUND');
      assert(err instanceof Error);
    });
  });
});
