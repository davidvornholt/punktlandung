import { expect, it } from 'bun:test';
import { file } from 'bun';

import { easeStandardCss } from './motion';

it("motion constant matches the theme's --ease-standard token", async () => {
  const theme = await file(new URL('theme.css', import.meta.url)).text();
  expect(theme).toContain(`--ease-standard: ${easeStandardCss};`);
});
