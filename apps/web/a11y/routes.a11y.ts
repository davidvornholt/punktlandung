import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';

/**
 * Nur die unauthentifizierte Oberfläche ist scanbar: die Anmeldung läuft
 * ausschließlich über GitHub-OAuth, daher gibt es (noch) keinen Weg, die
 * angemeldeten Seiten (/noten, /zeugnis, …) im Test zu erreichen. "/" ist
 * trotzdem gelistet, weil der Redirect auf /anmelden mitgeprüft werden soll.
 */
const routen = [
  { name: 'Anmelden', pfad: '/anmelden' },
  { name: 'Startseite (leitet auf /anmelden um)', pfad: '/' },
] as const;

for (const route of routen) {
  test(`${route.name} hat keine automatisierten WCAG-2.2-AA-Verstöße`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route.pfad);

    await expect(page.locator('main')).toBeVisible();
    expect(await scanWcag22AaViolations(page)).toEqual([]);
  });
}
