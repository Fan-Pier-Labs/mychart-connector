import { describe, test, expect } from 'bun:test';
import { buildSummaryEmail, buildDetailedEmail } from '../templates';
import type { CategoryChange } from '../change-detector';

const sampleChanges: CategoryChange[] = [
  {
    category: 'Lab Results',
    newItems: [
      { orderName: 'CBC', resultName: 'WBC', status: 'Final', isAbnormal: true, date: '2026-03-12T08:00:00Z' },
      { orderName: 'BMP', resultName: 'Glucose', status: 'Final', isAbnormal: false, date: '2026-03-12T09:00:00Z' },
    ],
  },
  {
    category: 'Messages',
    newItems: [
      { subject: 'Follow-up', senderName: 'Dr. Smith', preview: 'Your results look good', sentDate: '2026-03-12T10:00:00Z' },
    ],
  },
];

describe('buildSummaryEmail', () => {
  test('creates correct subject with total count', () => {
    const email = buildSummaryEmail(sampleChanges, 'mychart.example.org');
    expect(email.subject).toBe('MyChart Update: 3 changes detected');
  });

  test('includes category names and counts in HTML', () => {
    const email = buildSummaryEmail(sampleChanges, 'mychart.example.org');
    expect(email.html).toContain('Lab Results');
    expect(email.html).toContain('(2)');
    expect(email.html).toContain('Messages');
    expect(email.html).toContain('(1)');
  });

  test('includes login link', () => {
    const email = buildSummaryEmail(sampleChanges, 'mychart.example.org');
    expect(email.html).toContain('https://mychart.example.org');
  });

  test('has no attachments', () => {
    const email = buildSummaryEmail(sampleChanges, 'mychart.example.org');
    expect(email.attachments).toHaveLength(0);
  });

  test('handles singular count', () => {
    const email = buildSummaryEmail([{ category: 'Messages', newItems: [{ text: 'hi' }] }], 'test.org');
    expect(email.subject).toBe('MyChart Update: 1 change detected');
  });

  test('escapes HTML in hostname', () => {
    const email = buildSummaryEmail(sampleChanges, 'test<script>.org');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('buildDetailedEmail', () => {
  test('includes actual medical content', () => {
    const email = buildDetailedEmail(sampleChanges, 'mychart.example.org');
    expect(email.html).toContain('CBC');
    expect(email.html).toContain('WBC');
    expect(email.html).toContain('Dr. Smith');
    expect(email.html).toContain('Your results look good');
  });

  test('includes image attachments with cid references', () => {
    const imageData = Buffer.from('fake-jpeg-data');
    const email = buildDetailedEmail(sampleChanges, 'test.org', [
      { filename: 'xray_chest.jpg', content: imageData },
    ]);
    expect(email.attachments).toHaveLength(1);
    expect(email.attachments[0].cid).toBe('xray-0');
    expect(email.html).toContain('cid:xray-0');
    expect(email.html).toContain('xray_chest.jpg');
  });

  test('works without image attachments', () => {
    const email = buildDetailedEmail(sampleChanges, 'test.org');
    expect(email.attachments).toHaveLength(0);
    expect(email.html).not.toContain('X-ray Images');
  });

  test('includes medical warning in footer', () => {
    const email = buildDetailedEmail(sampleChanges, 'test.org');
    expect(email.html).toContain('medical information');
  });
});
