# SurveyMania Design System (Google Forms–inspired)

This design system defines the UX, UI tokens, components, and behaviors for both the Form Builder and the Respondent Form surfaces, modeled after well‑known Google Forms patterns. It should feel immediately familiar, clean, and accessible, while remaining brandable and implementation‑agnostic.


## 1) Principles
- Familiarity first: mirror Google Forms’ mental models (cards, sections, branching, quiz mode).
- Clarity over decoration: minimal chrome, strong affordances, obvious states.
- One primary action per surface: “Send/Preview” in builder; “Submit” for respondents.
- Accessible by default: WCAG 2.1 AA, complete keyboard support, screen reader friendly.
- Responsive always: single column on mobile; generous content width on desktop.
- Autosave everywhere: builder changes persist instantly; respondent inputs saved locally until submit.
- Themeable but consistent: one accent color drives surfaces, components, and states.


## 2) Surfaces
- Builder: editing canvas with question cards, a floating composer toolbar, and a top app bar for global actions (Theme, Preview, Settings, Send).
- Form (Respondent): read‑only questions with input controls, optional progress bar, and submit/success flow.
- Shared primitives: colors, typography, spacing, elevation, radii, motion.


## 3) Design Tokens
Use CSS custom properties (or your platform’s equivalent) with a small, legible set of tokens. These are the only values design consumes directly.

```css
:root {
  /* Color (light) */
  --gform-color-primary:        #673ab7; /* brand accent */
  --gform-color-on-primary:     #ffffff;
  --gform-color-surface:        #ffffff;
  --gform-color-surface-alt:    #fafafa;
  --gform-color-background:     #f5f5f5;
  --gform-color-text:           #1f1f1f;
  --gform-color-text-secondary: #5f6368;
  --gform-color-border:         #e0e0e0;
  --gform-color-focus:          #1a73e8; /* focus ring */
  --gform-color-success:        #188038;
  --gform-color-warning:        #f9ab00;
  --gform-color-error:          #d93025;

  /* Elevation (shadows) */
  --gform-elevation-0: none;
  --gform-elevation-1: 0 1px 2px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.08);
  --gform-elevation-2: 0 2px 6px rgba(0,0,0,.12), 0 2px 4px rgba(0,0,0,.08);
  --gform-elevation-3: 0 4px 12px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.10);

  /* Radii */
  --gform-radius-card: 8px;
  --gform-radius-control: 4px;

  /* Spacing scale (4px base) */
  --gform-space-1: 4px;  --gform-space-2: 8px;  --gform-space-3: 12px;
  --gform-space-4: 16px; --gform-space-5: 20px; --gform-space-6: 24px;
  --gform-space-8: 32px; --gform-space-12: 48px; --gform-space-16: 64px;

  /* Typography */
  --gform-font-family:  ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --gform-font-weight-regular: 400;
  --gform-font-weight-medium:  500;
  --gform-font-weight-bold:    700;

  --gform-type-display:  22px/28px var(--gform-font-family);
  --gform-type-title:    18px/24px var(--gform-font-family);
  --gform-type-subtitle: 16px/22px var(--gform-font-family);
  --gform-type-body:     14px/20px var(--gform-font-family);
  --gform-type-caption:  12px/16px var(--gform-font-family);

  /* Focus ring */
  --gform-focus-ring: 0 0 0 3px color-mix(in srgb, var(--gform-color-focus) 30%, transparent);

  /* Z-index */
  --gform-z-appbar: 100;
  --gform-z-fab:    110;
  --gform-z-dialog: 200;
}
```

Dark theme mirrors these tokens with adjusted surfaces; prefer auto‑generation from `--gform-color-primary` with semantic overrides.


## 4) Layout & Grid
- Content width: 640px max for Form; 768px max for Builder canvas. Center on large screens.
- Builder frame: top app bar; canvas scroll for cards; floating composer toolbar docked on the right.
- Form frame: header band with accent color; optional cover image; body is a column of question cards.
- Breakpoints: mobile <600, tablet 600–1024, desktop >1024. Single column at all sizes; denser spacing on desktop.
- Card rhythm: 24px vertical gaps; 16px padding inside cards.


## 5) Shared Components
- App Bar: left-aligned form title (editable in Builder), right actions: Theme, Preview, Settings, Send.
- Card: rounded, elevated container for questions/sections; selected card shows a 3px primary left bar in Builder.
- Buttons: primary filled, tonal/outlined secondary, text buttons for subtle actions.
- Text Field: underlined or filled; label floats on focus/with value; helper and error areas reserved.
- Radio/Checkbox: Material‑style, 40px min touch target, label click selects.
- Select/Dropdown: menu anchored to field; keyboard nav; typeahead on desktop.
- Switch: used for Required toggles and settings.
- Icon Button: 40px touch target; shows tooltip on hover/focus.
- Divider: 1px `--gform-color-border`.
- Snackbar/Toast: bottom center; 4s default; action button optional.
- Tooltip: subtle elevation, 8px radius; 12px caption text.
- Dialog/Sheet: centered dialog for Settings; side sheet for Theme.

States for all inputs: default, hover, focus (3:1 ring), active/pressed, disabled (40% alpha on text/icon), error, success.


## 6) Question Pattern (Anatomy)
Each question (any type) follows the same structure:
1) Label row: question title, optional “Required” asterisk, optional points (quiz), optional media icon.
2) Description (optional): body text.
3) Control area: input(s), options list, or grid.
4) Helper/error space: reserved line; error text in `--gform-color-error`.
5) Builder‑only footer: validation chips, branching, duplicate/delete.

Required indicator: red asterisk after title. Error copy examples:
- Required: “This question is required.”
- Pattern: “Enter a valid value.”
- Range: “Enter a number between 1 and 10.”


## 7) Question Types & Behaviors
- Short answer: single‑line text; optional validation (length, regex, email, URL, number).
- Paragraph: multi‑line text; same validations as short answer.
- Multiple choice: one selection; options list; optional “Other” with free text; optional image per option.
- Checkboxes: multiple selections; optional “Other”; supports “Select at most N”.
- Dropdown: one selection; compact; typeahead on desktop.
- Linear scale: 1–5 (default) up to 1–10; left/right labels; numeric buttons; show active state.
- Multiple choice grid: columns (choices) × rows (statements); one per row; required per row optional.
- Checkbox grid: same grid but multiple per row; enforce at most N per row optional.
- Date: native date picker fallback; locale‑aware format; optional include time.
- Time: time picker; optional duration mode.
- File upload (optional feature): size/type limits, per‑file count; display upload status and file list.

Shared interactions:
- Add option: last row is “Add option” ghost; Enter commits; Shift+Enter newline; Escape cancels.
- Reorder options: drag handle or keyboard (Alt+Arrow keys).
- Shuffle order (Form only): render randomized; Builder maintains canonical order.
- “Other” option: selecting focuses sibling text input; included in answer payload.


## 8) Validation Rules (Builder)
- Rule chips per question: Length, Regex, Number, Date range, Select count, Required.
- Clear error copy defaults; allow custom message.
- Validate on blur and on submit; scroll to first invalid on submit.


## 9) Sections & Branching
- Section card: Title + description; optional cover image.
- Navigation: Next/Back buttons between sections; optional progress bar (% by answered questions or by section count).
- Branching: on Multiple choice and Dropdown, “Go to section based on answer”. In Builder, show mapping UI beneath options. In Form, route to target sections after Next.
- Submit page: confirmation message, optional “Submit another response”, link to view score (quiz), edit after submit (if enabled).


## 10) Builder Surface (Editing)
- App Bar actions:
  - Theme palette button: opens side sheet to change primary color + header image.
  - Preview (eye): opens Form in read‑only mode.
  - Settings (gear): dialog with tabs: General, Presentation, Quizzes.
  - Send (paper plane): share dialog (link, email embed, HTML snippet).
- Floating Composer Toolbar (dock right):
  - + Question, Title & description, Image, Video, Section.
- Question Card (edit mode):
  - Header row: drag handle, question title field, question type select, Required switch.
  - Tools: duplicate, delete, more menu (description, shuffle options, validation, response limit).
  - Answer key (quiz mode): toggle to mark correct options, set points, add feedback.
  - Selected state: 3px primary left bar; keyboard focus ring.
- Reordering:
  - Drag and drop across cards/sections; drop targets with animated gaps.
  - Keyboard: Alt+ArrowUp/Down moves card; announces new index for screen readers.
- Autosave & presence:
  - Save indicator near title (“Saved” / spinner while saving).
  - Optional collaborator avatars with cursors.

Keyboard shortcuts (Builder):
- A: add question; S: add section; T: add title/description.
- Cmd/Ctrl+D: duplicate question; Delete/Backspace: delete.
- Cmd/Ctrl+K: toggle Required.
- Cmd/Ctrl+P: preview; Cmd/Ctrl+/: show shortcuts.
- Alt+ArrowUp/Down: reorder card; Alt+ArrowLeft/Right: indent/outdent section jump (if needed).


## 11) Form Surface (Respondent)
- Header: accent color band; optional image; form title and description.
- Questions: stacked cards; only one visual focus at a time.
- Required: asterisk next to label; error message below control.
- Progress: optional progress bar; section count text (“Page 1 of 3”).
- Navigation: Next/Back within sections; primary action is Submit in the last section.
- Success: confirmation screen with message and optional actions.


## 12) Accessibility
- Semantics: each question uses a group with `role="group"` or fieldset/legend; radios/checkboxes use native inputs; grids use table semantics with proper headers.
- Labels: `label` is programmatically associated; helper and error text referenced via `aria-describedby`.
- Required: `aria-required="true"`; error state sets `aria-invalid="true"` and focuses first invalid field on submit.
- Focus: 3px visible ring (`--gform-focus-ring`), 3:1 minimum contrast.
- Keyboard:
  - Tab/Shift+Tab move between interactive elements; Arrow keys for radio groups and grids; Space toggles.
  - Reorder (Builder): Alt+Arrow keys with live region announcements.
- Color contrast: 4.5:1 for text; 3:1 for large text and UI components.
- Motion: respect `prefers-reduced-motion`; avoid essential info in animation only.


## 13) Theming
- Primary‑driven theme: set `--gform-color-primary`; derive header band, selection states, and chips from it.
- Surface: keep cards white/near‑white for familiarity; allow subtle background tint with `--gform-color-surface-alt`.
- Header image: optional; scales to width; height 160–240px.
- Token overrides: allow per‑form theme; store token deltas with the form.

Quick theming API sketch:
```css
/* Accent derivatives */
.form-header { background: var(--gform-color-primary); color: var(--gform-color-on-primary); }
.radio input:checked + .control { border-color: var(--gform-color-primary); }
.button--primary { background: var(--gform-color-primary); color: var(--gform-color-on-primary); }
```


## 14) Motion
- Enter/exit: 150–200ms; standard ease-out.
- Press/hover: 100ms; linear → ease-out.
- Reorder placeholder: subtle 4px lift with `--gform-elevation-2`.
- FAB and tooltips: scale/opacity with springy ease (reduce motion alternative: fade only).


## 15) Content & Copy
- Asterisk note under first required question: “Asterisk (*) indicates required question”.
- Error messages short, specific, friendly; no exclamation marks.
- Button labels are verbs: Next, Back, Submit, Preview, Send.


## 16) Data Model (Guidance)
Field names shown for consistency across web/mobile implementations.

```ts
Form {
  id: string;
  title: string;
  description?: string;
  theme?: ThemeTokens; // subset of tokens overriding defaults
  settings: {
    collectEmail?: boolean;
    limitToOneResponse?: boolean;
    editAfterSubmit?: boolean;
    showProgressBar?: boolean;
    shuffleQuestionOrder?: boolean;
    confirmationMessage?: string;
    quiz?: { enabled: boolean; releaseGrade: 'immediately'|'later'; respondentCanSee: { missed: boolean; correct: boolean; pointValues: boolean; } };
  };
  sections: Section[]; // first section is index 0
}

Section {
  id: string;
  title?: string;
  description?: string;
  questions: Question[];
}

Question {
  id: string;
  type: 'short'|'paragraph'|'radio'|'checkbox'|'dropdown'|'scale'|'grid'|'checkbox_grid'|'date'|'time'|'file';
  title: string;
  description?: string;
  required?: boolean;
  options?: Option[]; // for choice types
  grid?: { rows: string[]; columns: string[] };
  scale?: { min: number; max: number; leftLabel?: string; rightLabel?: string };
  validation?: ValidationRule[];
  branching?: { optionId: string; toSectionId: string }[]; // for radio/dropdown
  quiz?: { points: number; correctOptionIds?: string[]; feedback?: string };
}

Option { id: string; label: string; hasOther?: boolean; imageUrl?: string }
ValidationRule { kind: 'required'|'length'|'regex'|'number'|'date'|'selectCount'; message?: string; config?: any }
```


## 17) Settings Dialog (Builder)
- General: collect email, limit to 1 response, edit after submit, responders can see summary charts.
- Presentation: show progress bar, shuffle question order, show link to submit another response, confirmation message.
- Quizzes: enable quiz, default question point value, release grade timing, what respondents can see.


## 18) Responsive Rules
- Touch target min 40×40px; icon buttons 40px box.
- Form width clamps to 95vw on small screens; maintain 16px gutters.
- Grid questions stack: rows become groups; columns become options within each group.
- Linear scale can switch to compact buttons with horizontal scroll on small screens.


## 19) Implementation Notes
- Builder selection: only one card is “active” at a time; ensure strong focus + left color bar.
- Autosave debounce: 300–800ms after changes; optimistic UI, show transient “Saving…”
- Unsaved changes guard when settings/theme dialogs close.
- Preview mirrors Form rendering exactly, using the same component library with read‑only flags.
- Error summary: on submit, show toast and focus first error; also mark all invalid questions.


## 20) QA Checklist
- Visual: spacing, typography, and hover/focus states match tokens.
- Keyboard: tab order, arrow nav in radios/grids, reordering.
- Screen reader: labels, legends, error associations, branching announcements.
- Validation: correct messages/triggers; prevents submit; scrolls to first.
- Theming: primary change propagates; contrast remains acceptable.
- Mobile: touch targets, on‑screen keyboard covers not obscuring fields, sticky submit visible.


## 21) Example Markup Snippets
Question card (Form):
```html
<article class="card question" aria-labelledby="q1-label">
  <header class="question__header">
    <h3 id="q1-label">Your email <span aria-hidden="true" class="req">*</span></h3>
    <p class="question__desc">We’ll send your receipt here.</p>
  </header>
  <div class="question__control">
    <input type="email" aria-describedby="q1-help" required>
  </div>
  <p id="q1-help" class="question__help">We will not share your email.</p>
  </article>
```

Selected card (Builder) left bar:
```css
.card.question.is-selected { position: relative; box-shadow: var(--gform-elevation-3); }
.card.question.is-selected::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--gform-color-primary);
}
```


## 22) Non‑Goals (for now)
- Advanced theme generator with dynamic palettes beyond a single primary.
- Deep analytics UI in Builder.
- Custom component skins per question type.


## 23) Roadmap Ideas
- Collaborator cursors/comments on questions.
- Template gallery with preview and one‑click start.
- Addons/Integrations (webhooks, spreadsheets, email providers).
- Response import/export and versioned drafts.


---

## 24) Implementation Guide for Current Codebase

This section maps the design system to the existing SurveyMania implementation, identifying what exists, what's missing, and how to bridge the gaps.

### Current State Analysis

**What's Working:**
- ✅ Radix UI Select components (`lib/components/ui/select.tsx`) - proper foundation
- ✅ Tailwind CSS with HSL color system
- ✅ Component structure in `components/ui/index.tsx`
- ✅ React Hook Form for validation
- ✅ TypeScript types for questions/surveys

**Critical Gaps:**
- ❌ `.btn` and `.input` classes referenced but **not defined** in CSS
- ❌ Primary color is black (`hsl(0 0% 9%)`) instead of purple
- ❌ No elevation/shadow system implemented
- ❌ No selection state for QuestionEditor cards
- ❌ Inconsistent spacing (mix of space-y-3/4/5/6)
- ❌ Survey page lacks header band and card-per-question layout
- ❌ No drag handles or visual affordances in builder

### CSS Class Definitions Needed

Add to `app/globals.css` after Tailwind imports:

```css
@layer components {
  /* Button variants matching design tokens */
  .btn {
    @apply inline-flex items-center justify-center gap-2
           px-4 py-2.5 rounded-xl
           font-medium text-sm
           transition-all duration-150
           disabled:opacity-50 disabled:cursor-not-allowed
           focus:outline-none focus:ring-2 focus:ring-[var(--gform-color-focus)] focus:ring-offset-2;
  }

  .btn-primary {
    @apply bg-[var(--gform-color-primary)] text-white
           hover:opacity-90
           shadow-sm hover:shadow;
  }

  .btn-secondary {
    @apply border-2 border-gray-300 bg-white text-gray-700
           hover:bg-gray-50
           shadow-sm;
  }

  .btn-text {
    @apply text-[var(--gform-color-primary)]
           hover:bg-gray-100;
  }

  /* Input base class */
  .input {
    @apply w-full px-3 py-2 rounded
           border border-gray-300 bg-white
           text-sm text-gray-900
           placeholder:text-gray-400
           transition-colors duration-150
           focus:outline-none focus:ring-2 focus:ring-[var(--gform-color-focus)] focus:ring-opacity-30
           focus:border-[var(--gform-color-focus)]
           disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500;
  }

  /* Card elevation variants */
  .card {
    box-shadow: var(--gform-elevation-1);
    transition: box-shadow 150ms ease-out;
  }

  .card-hover:hover {
    box-shadow: var(--gform-elevation-2);
  }

  .card-selected {
    box-shadow: var(--gform-elevation-3);
    position: relative;
  }

  /* Purple left bar for selected cards (Builder) */
  .card-selected::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--gform-color-primary);
    border-radius: var(--gform-radius-card) 0 0 var(--gform-radius-card);
  }

  /* Form header band */
  .form-header {
    background: var(--gform-color-primary);
    color: var(--gform-color-on-primary);
    padding: var(--gform-space-8) var(--gform-space-6);
    border-radius: var(--gform-radius-card) var(--gform-radius-card) 0 0;
    margin: calc(var(--gform-space-6) * -1) calc(var(--gform-space-6) * -1) var(--gform-space-6);
  }

  /* Drag handle */
  .drag-handle {
    @apply flex items-center justify-center
           w-8 h-8 rounded
           text-gray-400 hover:text-gray-600 hover:bg-gray-100
           cursor-grab active:cursor-grabbing
           transition-colors;
  }

  /* Progress bar */
  .progress-bar {
    @apply h-2 bg-gray-200 rounded-full overflow-hidden;
  }

  .progress-bar__fill {
    @apply h-full bg-[var(--gform-color-primary)] transition-all duration-300 ease-out;
  }
}
```

### Tailwind Config Updates

Update `tailwind.config.ts` to align with design tokens:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#673ab7',
          light: '#9575cd',
          dark: '#512da8',
        },
        // Map to CSS variables
        surface: 'var(--gform-color-surface)',
        'surface-alt': 'var(--gform-color-surface-alt)',
        background: 'var(--gform-color-background)',
      },
      boxShadow: {
        'elevation-1': 'var(--gform-elevation-1)',
        'elevation-2': 'var(--gform-elevation-2)',
        'elevation-3': 'var(--gform-elevation-3)',
      },
      borderRadius: {
        'card': 'var(--gform-radius-card)',
        'control': 'var(--gform-radius-control)',
      },
      fontFamily: {
        sans: 'var(--gform-font-family)',
      },
      fontSize: {
        'display': ['22px', '28px'],
        'title': ['18px', '24px'],
        'subtitle': ['16px', '22px'],
      },
    }
  }
}
```

### Component Refactoring Checklist

**Priority 1: Foundation (Critical)**
- [ ] Add design tokens to `app/globals.css` (Section 3 CSS variables)
- [ ] Define `.btn`, `.input`, `.card` classes (above)
- [ ] Update Tailwind config with primary purple color
- [ ] Test build and verify no hydration errors

**Priority 2: Core Components**
- [ ] `components/ui/index.tsx`:
  - [ ] Update Button to use `.btn` base + variant classes
  - [ ] Update Input to use `.input` base class
  - [ ] Update Card to use `.card` and elevation classes
- [ ] `lib/components/ui/select.tsx`:
  - [ ] Change focus ring to `ring-[#1a73e8]`
  - [ ] Add elevation-2 shadow on open state

**Priority 3: Builder Experience**
- [ ] `components/QuestionEditor.tsx`:
  - [ ] Add selection state management (useState for active question)
  - [ ] Add `.card-selected` class when selected
  - [ ] Add drag handle: `<GripVertical />` from lucide-react
  - [ ] Replace type Badge with icon + text
  - [ ] Consistent spacing: `space-y-3` for controls, `p-4` for cards
- [ ] `components/LogicBuilder.tsx`:
  - [ ] Use softer background: `bg-purple-50` instead of `bg-gray-50`
  - [ ] Add `.card` shadow to rule containers

**Priority 4: Survey Taking**
- [ ] `app/(public)/s/[id]/page.tsx`:
  - [ ] Add header band component with `.form-header`
  - [ ] Wrap each question in Card component
  - [ ] Add progress bar if `survey.settings.showProgressBar`
  - [ ] Improve submit button: large, primary variant
  - [ ] Consistent spacing: `space-y-6` between question cards

**Priority 5: Polish**
- [ ] Add app bar to builder pages
- [ ] Add floating composer toolbar
- [ ] Add autosave indicator
- [ ] Keyboard shortcuts implementation
- [ ] Toast component color refinement

### Migration Path

**Phase 1: CSS Foundation (1-2 hours)**
```bash
# 1. Add design tokens to globals.css
# 2. Define component classes (.btn, .input, .card)
# 3. Update tailwind.config.ts
# 4. Run build: npm run build
# 5. Verify no errors
```

**Phase 2: Component Updates (2-3 hours)**
```bash
# 1. Update Button component
# 2. Update Input component
# 3. Update Card component
# 4. Test all pages still render
# 5. Fix any broken styles
```

**Phase 3: Builder UX (3-4 hours)**
```bash
# 1. QuestionEditor selection state
# 2. Add drag handles
# 3. Card elevation on hover/select
# 4. Spacing consistency pass
```

**Phase 4: Survey UX (2-3 hours)**
```bash
# 1. Header band component
# 2. Card-per-question layout
# 3. Progress bar
# 4. Submit flow polish
```

**Total estimated time: 8-12 hours**

### Quick Wins (Do First)

These changes provide immediate visual improvement:

```css
/* Add to globals.css immediately */
:root {
  --background: 0 0% 96%;           /* Light gray background */
  --primary: 262 52% 47%;           /* Purple #673ab7 */
  --ring: 217 91% 60%;              /* Blue focus #1a73e8 */
}
```

```tsx
// Update Card in components/ui/index.tsx
export function Card({ className = '', children }: ...) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}
```

### Testing Checklist

After each phase:
- [ ] Build succeeds: `npm run build`
- [ ] No hydration errors in console
- [ ] All pages render correctly
- [ ] Forms still submit successfully
- [ ] Focus states visible (3px ring)
- [ ] Touch targets ≥40px on mobile
- [ ] Color contrast ≥4.5:1 (text) and ≥3:1 (UI)

### Common Pitfalls to Avoid

1. **Don't mix implementations**: Either use CSS classes OR Tailwind utilities, not both randomly
2. **Maintain spacing consistency**: Pick `space-y-6` for cards, `space-y-3` for controls, stick to it
3. **Test with real data**: Empty states look different than populated
4. **Mobile first**: Test every change at 375px width
5. **Accessibility**: Never remove focus rings, maintain ARIA labels

### Reference Implementation Examples

**Good Button Usage:**
```tsx
<button className="btn btn-primary">Submit Survey</button>
<button className="btn btn-secondary">Cancel</button>
<button className="btn btn-text">Skip</button>
```

**Good Card Usage:**
```tsx
<Card className="card card-hover p-4">
  {/* content */}
</Card>

{/* Selected state in builder */}
<Card className={`card p-4 ${isSelected ? 'card-selected' : 'card-hover'}`}>
  {/* content */}
</Card>
```

**Good Input Usage:**
```tsx
<input
  type="text"
  className="input"
  placeholder="Enter your answer"
  aria-label="Question response"
/>
```

### Files to Modify Summary

| File | Changes | Priority |
|------|---------|----------|
| `app/globals.css` | Add tokens + component classes | P1 |
| `tailwind.config.ts` | Purple primary, shadows, radii | P1 |
| `components/ui/index.tsx` | Button/Input/Card updates | P2 |
| `lib/components/ui/select.tsx` | Focus ring color | P2 |
| `components/QuestionEditor.tsx` | Selection state, drag handles | P3 |
| `components/LogicBuilder.tsx` | Softer backgrounds | P3 |
| `app/(public)/s/[id]/page.tsx` | Header band, card layout | P4 |
| `components/Toast.tsx` | Shadow, color refinement | P5 |

---

This document is the source of truth for visual and interaction patterns. When in doubt, choose the option closest to Google Forms' behavior and simplest to understand.

