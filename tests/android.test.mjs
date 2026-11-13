import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('APK sem cópia de segurança automática (as medições não saem do aparelho)', () => {
  const m = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  assert.match(m, /android:allowBackup="false"/);
  assert.doesNotMatch(m, /android:allowBackup="true"/);
});
