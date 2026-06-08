import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThread, compareByUpdatedDesc } from '../../src/modules/messages/thread-utils.js';

describe('messages/thread-utils.js', () => {
  describe('compareByUpdatedDesc()', () => {
    it('sorts newer items first', () => {
      const items = [
        { updatedAt: '2024-01-01T00:00:00Z' },
        { updatedAt: '2024-06-01T00:00:00Z' },
        { updatedAt: '2024-03-15T00:00:00Z' },
      ];
      const sorted = [...items].sort(compareByUpdatedDesc);
      assert.equal(sorted[0].updatedAt, '2024-06-01T00:00:00Z');
      assert.equal(sorted[1].updatedAt, '2024-03-15T00:00:00Z');
      assert.equal(sorted[2].updatedAt, '2024-01-01T00:00:00Z');
    });

    it('handles missing updatedAt gracefully', () => {
      const items = [{ updatedAt: '2024-01-01' }, {}];
      const sorted = [...items].sort(compareByUpdatedDesc);
      assert.equal(sorted[0].updatedAt, '2024-01-01');
    });
  });

  describe('normalizeThread()', () => {
    it('returns null/undefined for falsy input', () => {
      assert.equal(normalizeThread(null), null);
      assert.equal(normalizeThread(undefined), undefined);
    });

    it('normalizes a thread with messages array', () => {
      const thread = {
        id: 'thread-1',
        body: 'Original body',
        updatedAt: '2024-06-01T10:00:00Z',
        messages: [
          { id: 'm1', body: 'First message', createdAt: '2024-06-01T10:00:00Z' },
          { id: 'm2', body: 'Second message', createdAt: '2024-06-01T11:00:00Z' },
        ],
      };
      const result = normalizeThread(thread);
      assert(Array.isArray(result.messages), 'messages should be array');
      assert(result.messages.length >= 1, 'should have messages');
      assert(result.updatedAt, 'should have updatedAt');
    });

    it('preserves thread id and other fields', () => {
      const thread = {
        id: 'thread-preserve',
        studentId: 42,
        subject: 'Test Subject',
        body: 'Hello',
        messages: [],
        updatedAt: '2024-01-01',
      };
      const result = normalizeThread(thread);
      assert.equal(result.id, 'thread-preserve');
      assert.equal(result.studentId, 42);
      assert.equal(result.subject, 'Test Subject');
    });

    it('provides lastMessagePreview fallback', () => {
      const thread = {
        id: 'thread-preview',
        body: 'The body',
        messages: [{ body: 'Last msg', createdAt: '2024-01-01' }],
        updatedAt: '2024-01-01',
      };
      const result = normalizeThread(thread);
      assert(result.lastMessagePreview, 'should have lastMessagePreview');
    });
  });
});
