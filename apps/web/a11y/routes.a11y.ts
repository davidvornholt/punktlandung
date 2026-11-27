import { scanWcag22AaViolations } from '@davidvornholt/a11y-testing/axe';
import { expect, test } from '@playwright/test';

/**
 * Nur die unauthentifizierte Oberfläche ist scanbar: die Anmeldung läuft
 * ausschließlich über GitHub-OAuth, daher gibt es (noch) keinen Weg, die
 * angemeldeten Seiten (/noten, /zeugnis, …) im Test zu erreichen. "/" ist
 * trotzdem gelistet, weil der Redirect auf /anmelden mitgeprüft werden soll,
 * und eine unbekannte Adresse, weil sie ohne Anmeldung eine eigene Seite zeigt.
 */
const signIn = {
  heading: 'Punktlandung',
  action: { role: 'button', name: 'Mit GitHub anmelden' },
} as const;

const routes = [
  { name: 'Anmelden', path: '/anmelden', ...signIn },
  { name: 'Startseite (leitet auf /anmelden um)', path: '/', ...signIn },
  {
    name: 'Unbekannte Adresse',
    path: '/gibt-es-nicht',
    heading: 'Diese Seite gibt es nicht',
    action: { role: 'link', name: 'Zur Übersicht' },
  },
] as const;

/** Hell und dunkel sind zwei Farbsätze mit eigenen Kontrasten, also wird jede Seite in beiden geprüft. */
const colorSchemes = [
  { name: 'hell', value: 'light' },
  { name: 'dunkel', value: 'dark' },
] as const;

for (const route of routes) {
  for (const colorScheme of colorSchemes) {
    test(`${route.name} hat ${colorScheme.name} keine automatisierten WCAG-2.2-AA-Verstöße`, async ({
      page,
    }) => {
      await page.emulateMedia({
        colorScheme: colorScheme.value,
        reducedMotion: 'reduce',
      });
      await page.goto(route.path);

      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(
        page.getByRole(route.action.role, { name: route.action.name }),
      ).toBeVisible();
      expect(await scanWcag22AaViolations(page)).toEqual([]);
    });
  }
}
