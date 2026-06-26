# CSS Modules Checklist

Use this checklist when the diff adds, modifies, or deletes a
`*.module.css` file, or when a component file in the diff changes its
`import ... from "*.module.css"` line.

Skip this phase if no `.module.css` files appear in the diff and no
module-CSS imports change.

- Each component should own its own `.module.css` file living next to it
  in the same directory. Do not import a sibling or ancestor's
  `.module.css` to reuse class names. When you split a component into
  sub-components, split the stylesheet at the same time so each
  sub-component has its own module CSS file with only the rules it
  actually uses.

  **Find candidates** (TSX/JSX files importing a `.module.css` that is
  not in the same directory):

  ```bash
  grep -rEn 'from "\.\.[^"]*\.module\.css"' --include="*.tsx" --include="*.jsx" .
  ```

  Each hit reaches out of the component's own folder into a parent or
  sibling for class names; flag and propose colocating the styles.

  This is bad:

  ```
  ChatThread/
    ChatThread.tsx
    ChatThread.module.css        // contains .userRow, .userBubble,
                                  // .assistantRow, .assistantBubble,
                                  // .messageText, etc.
    UserMessage/
      UserMessage.tsx            // imports "../ChatThread.module.css"
    AssistantMessage/
      AssistantMessage.tsx       // imports "../ChatThread.module.css"
  ```

  This is good:

  ```
  ChatThread/
    ChatThread.tsx
    ChatThread.module.css        // only thread-level layout rules
    UserMessage/
      UserMessage.tsx
      UserMessage.module.css     // .userMessageRow, .userMessageBubble
    AssistantMessage/
      AssistantMessage.tsx
      AssistantMessage.module.css // .assistantMessageRow,
                                   // .assistantMessageBubble
  ```

- CSS Module class names should be domain-prefixed to match the component
  they style (for example `userMessageRow`, not `row`). The prefix makes
  the class self-describing in the rendered DOM and prevents accidental
  collisions if two CSS module files are ever merged.
