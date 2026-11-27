import { expect, test as it } from '@playwright/test';
import type { Shell, SignIn, Standalone } from './shell-frame.story.tsx';

const shell = 'shared/ui/shell-frame/Shell';
const signIn = 'shared/ui/shell-frame/SignIn';
const standalone = 'shared/ui/shell-frame/Standalone';

const phone = { width: 390, height: 800 } as const;

it('marks the page that is open and follows to the next', async ({ mount }) => {
  const component = await mount(shell);
  const nav = component.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(nav.getByRole('link', { name: 'Übersicht' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await nav.getByRole('link', { name: 'Zeugnis' }).click();
  await expect(
    component.getByRole('heading', { level: 1, name: 'Zeugnis' }),
  ).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Zeugnis' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  // The disc is drawn where `data-open` is, which follows the page that is drawn.
  await expect(nav.getByRole('link', { name: 'Zeugnis' })).toHaveAttribute(
    'data-open',
    '',
  );
  await expect(nav.locator('[data-open]')).toHaveCount(1);
});

it('counts the page of a Leistung as Noten', async ({ mount }) => {
  const component = await mount<typeof Shell>(shell, { at: '/noten/k-1' });
  await expect(
    component.getByRole('heading', { level: 1, name: 'Klausur · Analysis' }),
  ).toBeVisible();
  const noten = component
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Noten' });
  await expect(noten).toHaveAttribute('aria-current', 'page');
  await expect(noten).toHaveAttribute('data-open', '');
});

it('opens Noten ready for a new Note', async ({ mount }) => {
  const component = await mount<typeof Shell>(shell, { at: '/zeugnis' });
  await component.getByRole('link', { name: 'Note eintragen' }).click();
  await expect(component.getByText('Adresse: /noten?neu=true')).toBeVisible();
});

it('jumps over the bar to the content', async ({ mount, page }) => {
  const component = await mount(shell);
  const skip = component.getByRole('link', { name: 'Zum Inhalt springen' });
  // The router draws its first page a moment after the story is mounted, and a key pressed before that goes nowhere.
  await expect(skip).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(component.getByRole('main')).toBeFocused();
});

it('signs out', async ({ mount }) => {
  const component = await mount(shell);
  await component.getByRole('button', { name: 'Abmelden' }).click();
  await expect(component.getByText('Abgemeldet')).toBeVisible();
});

it('says that signing out failed and lets it be tried again', async ({
  mount,
}) => {
  const component = await mount<typeof Shell>(shell, { signOutFails: true });
  const signOut = component.getByRole('button', { name: 'Abmelden' });
  await signOut.click();
  await expect(component.getByRole('alert')).toHaveText(
    'Die Abmeldung ist fehlgeschlagen. Du bleibst angemeldet; prüfe die Verbindung und versuche es erneut.',
  );
  await expect(signOut).toBeEnabled();
});

it('keeps the rare pages of a phone behind "Mehr"', async ({ mount, page }) => {
  await page.setViewportSize(phone);
  const component = await mount(shell);
  const nav = component.getByRole('navigation', { name: 'Hauptnavigation' });
  const more = nav.getByRole('button', { name: 'Mehr' });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link', { name: 'Fächer' })).toHaveCount(0);

  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: 'Einstellungen' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Abmelden' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(nav.getByRole('link', { name: 'Fächer' })).toHaveCount(0);
  await expect(more).toBeFocused();

  await more.click();
  await component.getByRole('heading', { level: 1 }).click();
  await expect(nav.getByRole('link', { name: 'Fächer' })).toHaveCount(0);

  await more.click();
  await nav.getByRole('link', { name: 'Fächer' }).click();
  await expect(
    component.getByRole('heading', { level: 1, name: 'Fächer' }),
  ).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Fächer' })).toHaveCount(0);
  await expect(more).toHaveAttribute('data-open', '');
  await expect(more).toBeFocused();
});

it('enters a Note and signs out from the tab bar of a phone', async ({
  mount,
  page,
}) => {
  await page.setViewportSize(phone);
  const component = await mount<typeof Shell>(shell, { signOutFails: true });
  const nav = component.getByRole('navigation', { name: 'Hauptnavigation' });
  await nav.getByRole('link', { name: 'Note eintragen' }).click();
  await expect(component.getByText('Adresse: /noten?neu=true')).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Noten' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await nav.getByRole('button', { name: 'Mehr' }).click();
  await nav.getByRole('button', { name: 'Abmelden' }).click();
  await expect(component.getByRole('alert')).toBeInViewport();
});

it('names an address that leads nowhere and offers the way back', async ({
  mount,
}) => {
  const component = await mount<typeof Shell>(shell, { at: '/gibt-es-nicht' });
  await expect(
    component.getByRole('heading', {
      level: 1,
      name: 'Diese Seite gibt es nicht',
    }),
  ).toBeVisible();
  await component
    .getByRole('link', { name: 'Zur Übersicht', exact: true })
    .click();
  await expect(
    component.getByRole('heading', { level: 1, name: 'Übersicht' }),
  ).toBeVisible();
});

it('offers the one way to sign in', async ({ mount }) => {
  const component = await mount(signIn);
  await expect(
    component.getByRole('heading', { level: 1, name: 'Punktlandung' }),
  ).toBeVisible();
  await component.getByRole('button', { name: 'Mit GitHub anmelden' }).click();
  await expect(
    component.getByRole('button', { name: 'GitHub-Anmeldung wird geöffnet …' }),
  ).toBeDisabled();
});

it('says that the sign-in could not be started', async ({ mount }) => {
  const component = await mount<typeof SignIn>(signIn, { fails: true });
  const start = component.getByRole('button', { name: 'Mit GitHub anmelden' });
  await start.click();
  await expect(component.getByRole('alert')).toHaveText(
    'Die GitHub-Anmeldung konnte nicht gestartet werden. Prüfe die Verbindung und versuche es erneut.',
  );
  await expect(start).toBeEnabled();
});

it('says that the first page is still loading', async ({ mount }) => {
  const component = await mount<typeof Standalone>(standalone, {
    view: 'pending',
  });
  await expect(component.getByRole('status')).toHaveText(
    'Punktlandung wird geladen …',
  );
});

it('names an address outside the shell that leads nowhere', async ({
  mount,
}) => {
  const component = await mount<typeof Standalone>(standalone, {
    view: 'notFound',
  });
  await expect(
    component.getByRole('heading', {
      level: 1,
      name: 'Diese Seite gibt es nicht',
    }),
  ).toBeVisible();
  await expect(
    component.getByRole('link', { name: 'Zur Übersicht' }),
  ).toHaveAttribute('href', '/');
});

it('loads a page again that could not be loaded', async ({ mount }) => {
  const component = await mount<typeof Standalone>(standalone, {
    view: 'loadError',
  });
  await expect(
    component.getByRole('heading', {
      level: 1,
      name: 'Die Seite konnte nicht geladen werden',
    }),
  ).toBeVisible();
  await component.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(component.getByText('Geladen')).toBeVisible();
});

it('lets the disc of the mark hop when the name is pressed', async ({
  mount,
}) => {
  const component = await mount(shell);
  const mark = component
    .getByRole('link', { name: 'Punktlandung, zur Übersicht' })
    .locator('[data-part="brand-mark"]');
  await expect(mark).not.toHaveAttribute('data-motion');

  await component
    .getByRole('link', { name: 'Punktlandung, zur Übersicht' })
    .click();
  await expect(mark).toHaveAttribute('data-motion', 'hops');
  // The hop ends by itself, so the mark can sway again while something loads.
  await expect(mark).not.toHaveAttribute('data-motion');
});

it('keeps the mark still for those who asked for less motion', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(shell);
  const name = component.getByRole('link', {
    name: 'Punktlandung, zur Übersicht',
  });
  await name.click();
  await expect(name.locator('[data-part="brand-mark"]')).not.toHaveAttribute(
    'data-motion',
  );
});
