export const changeSchoolYear = (
  select: HTMLSelectElement,
  focus: { readonly rememberTrigger: (trigger: HTMLElement) => void },
  setters: {
    readonly setEditTarget: (target: null) => void;
    readonly setSchoolYear: (schoolYear: string) => void;
  },
) => {
  focus.rememberTrigger(select);
  setters.setEditTarget(null);
  setters.setSchoolYear(select.value);
};
