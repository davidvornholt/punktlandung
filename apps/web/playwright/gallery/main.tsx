// The gallery loads the global stylesheet the app's root route links.
import '../../src/styles.css';

// Biome resolves only React's function exports by name, so StrictMode comes off the default export.
import React, { type ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

type Story = ComponentType<Record<string, unknown>>;
type StoryModule = Readonly<Record<string, Story | undefined>>;

// Vite resolves the glob statically, relative to this file, so it stays inline.
const storyModules = import.meta.glob<StoryModule>('../../src/**/*.story.tsx');

const sourcePrefix = /^(?:\.\.\/)+src\//u;
const storyExtension = /\.story\.tsx$/u;

const storyPath = (file: string) =>
  file.replace(sourcePrefix, '').replace(storyExtension, '');

const storyFile = (path: string) => {
  const files = Object.keys(storyModules);
  const exact = files.find((file) => storyPath(file) === path);
  if (exact !== undefined) {
    return exact;
  }
  const suffixed = files.filter((file) => storyPath(file).endsWith(`/${path}`));
  if (suffixed.length > 1) {
    throw new Error(`Ambiguous story path: ${path}`);
  }
  return suffixed[0];
};

/** A story id is `<path under src without .story.tsx>/<export name>`. */
const resolveStory = async (storyId: string): Promise<Story> => {
  const separator = storyId.lastIndexOf('/');
  const file =
    separator > 0 ? storyFile(storyId.slice(0, separator)) : undefined;
  const load = file === undefined ? undefined : storyModules[file];
  const story =
    load === undefined
      ? undefined
      : (await load())[storyId.slice(separator + 1)];
  if (story === undefined) {
    throw new Error(`Unknown story: ${storyId}`);
  }
  return story;
};

const container = document.querySelector('#root');
if (container === null) {
  throw new Error('The gallery page has no #root element.');
}

/*
 * React 19 reports an uncaught render error instead of throwing it. The
 * gallery still reports every one, and `mount()` rejects with the first error
 * its own render raised.
 */
const renderErrors: Array<unknown> = [];
const createGalleryRoot = (element: Element) =>
  createRoot(element, {
    onUncaughtError: (error) => {
      renderErrors.push(error);
      reportError(error);
    },
  });

let root: Root | undefined;

/*
 * Reusing the root lets `component.update()` reconcile instead of remounting.
 * StrictMode matches TanStack Start's client entry, which renders the app in it.
 */
const mount = async ({
  story,
  props,
}: {
  readonly story: string;
  readonly props?: Record<string, unknown>;
}) => {
  const Story = await resolveStory(story);
  const target = root ?? createGalleryRoot(container);
  root = target;
  renderErrors.splice(0);
  flushSync(() => {
    target.render(
      <React.StrictMode>
        <Story {...props} />
      </React.StrictMode>,
    );
  });
  if (renderErrors.length > 0) {
    throw renderErrors[0];
  }
};

const unmount = () => {
  root?.unmount();
  root = undefined;
  return Promise.resolve();
};

Object.assign(globalThis, { mount, unmount });
