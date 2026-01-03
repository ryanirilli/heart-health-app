---
description: "Use shadcn/ui components for all UI elements in this Next.js project"
alwaysApply: true
---

# shadcn/ui Component Usage

This project uses **shadcn/ui** (new-york style) with Tailwind CSS. Always prefer shadcn/ui components over custom implementations or other UI libraries.

## Installation

To install a new shadcn component, use:

```bash
bunx shadcn@latest add <component-name>
```

## Available Components

Use these shadcn/ui components when building UI. If a component isn't installed yet, install it first:

### Layout & Structure
- `accordion` - Collapsible content sections
- `aspect-ratio` - Maintain aspect ratios
- `card` - Container with header, content, footer
- `collapsible` - Show/hide content
- `resizable` - Resizable panel groups
- `scroll-area` - Custom scrollable areas
- `separator` - Visual divider
- `tabs` - Tabbed interfaces

### Navigation
- `breadcrumb` - Breadcrumb navigation
- `dropdown-menu` - Dropdown menus
- `context-menu` - Right-click context menus
- `menubar` - Horizontal menu bar
- `navigation-menu` - Site navigation
- `pagination` - Page navigation
- `sidebar` - Collapsible sidebar navigation

### Forms & Inputs
- `button` - Buttons with variants
- `button-group` - Grouped buttons
- `checkbox` - Checkboxes
- `combobox` - Searchable select (uses command + popover)
- `date-picker` - Date selection (uses calendar + popover)
- `form` - Form with react-hook-form integration
- `input` - Text inputs
- `input-group` - Input with addons
- `input-otp` - OTP/verification code input
- `label` - Form labels
- `native-select` - Native HTML select
- `radio-group` - Radio button groups
- `select` - Custom select dropdowns
- `slider` - Range sliders
- `switch` - Toggle switches
- `textarea` - Multi-line text input

### Feedback & Overlays
- `alert` - Alert messages
- `alert-dialog` - Confirmation dialogs
- `dialog` - Modal dialogs
- `drawer` - Slide-out panels
- `hover-card` - Hover information cards
- `popover` - Floating content
- `sheet` - Side panels
- `sonner` - Toast notifications (recommended)
- `toast` - Toast notifications (legacy)
- `tooltip` - Hover tooltips

### Data Display
- `avatar` - User avatars
- `badge` - Status badges
- `calendar` - Calendar display
- `carousel` - Image/content carousels
- `chart` - Data visualization (uses Recharts)
- `data-table` - Advanced tables (uses TanStack Table)
- `progress` - Progress bars
- `skeleton` - Loading placeholders
- `spinner` - Loading spinner
- `table` - Data tables

### Utility
- `command` - Command palette / search
- `empty` - Empty state placeholder
- `field` - Form field wrapper
- `item` - List item component
- `kbd` - Keyboard shortcut display
- `toggle` - Toggle buttons
- `toggle-group` - Grouped toggles
- `typography` - Text styling components

## Project Configuration

- **Style**: new-york
- **Components path**: `@/components/ui`
- **Utils path**: `@/lib/utils`
- **Icon library**: lucide-react
- **CSS Variables**: enabled

## Guidelines

1. **Always check if a shadcn component exists** before creating custom UI
2. **Install missing components** using `bunx shadcn@latest add <name>`
3. **Use the `cn()` utility** from `@/lib/utils` for conditional classes
4. **Follow the component API** from shadcn/ui documentation
5. **Compose components** - shadcn components are designed to be composed together
6. **Use Tailwind CSS** for custom styling on top of components

