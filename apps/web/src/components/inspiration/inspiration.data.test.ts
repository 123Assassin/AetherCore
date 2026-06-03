import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  availableInspirationSubjectsByGrade,
  defaultInspirationFormValues,
  featuredInspirationCases,
} from './inspiration.data';

const configuredSubjectsByGrade: Record<string, readonly string[]> =
  availableInspirationSubjectsByGrade;

test('default inspiration form values use a configured agent classification', () => {
  assert.ok(
    configuredSubjectsByGrade[defaultInspirationFormValues.grade]?.includes(
      defaultInspirationFormValues.subject
    ),
    'default form values should use a configured inspiration agent classification'
  );
});

test('featured inspiration cases use configured agent classifications', () => {
  for (const item of featuredInspirationCases) {
    assert.ok(
      configuredSubjectsByGrade[item.grade]?.includes(item.subject),
      `${item.title} should use a configured inspiration agent classification`
    );
  }
});
