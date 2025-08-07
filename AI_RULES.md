# AI Development Rules

This document outlines the technical stack and coding conventions for this project. Following these rules ensures consistency, maintainability, and leverages the strengths of our chosen libraries.

## Tech Stack

-   **Framework**: React with Vite for a fast development experience.
-   **Language**: TypeScript for type safety and improved developer experience.
-   **Backend & Database**: Supabase for authentication, database, and serverless functions.
-   **Styling**: Tailwind CSS for utility-first styling.
-   **UI Components**: A comprehensive set of reusable components from `shadcn/ui`.
-   **Routing**: React Router (`react-router-dom`) for all client-side navigation.
-   **State Management**: React Context API (`AppContext.tsx`) for global state and `useState` for local state.
-   **Icons**: `lucide-react` for a consistent and clean icon set.
-   **Notifications**: `sonner` for toast notifications.

## Library Usage Rules

### 1. UI and Styling

-   **Component Library**: **Always** use components from the `shadcn/ui` library (`@/components/ui/*`) when available. Do not build custom components for elements like buttons, inputs, dialogs, etc., that already exist.
-   **Styling**: Use **Tailwind CSS** for all styling. Avoid writing custom CSS files. Use the `cn` utility from `@/lib/utils.ts` to conditionally apply classes.
-   **Icons**: Exclusively use icons from the `lucide-react` package.

### 2. Application Logic

-   **Routing**: All client-side routes must be managed using `react-router-dom`. Keep route definitions centralized in `src/App.tsx`.
-   **State Management**:
    -   For global application state (e.g., user data, products, orders), use the shared `AppContext`.
    -   For local component state, use React's built-in `useState` and `useReducer` hooks.
-   **Forms**: For complex forms requiring validation, use `react-hook-form` with `zod` for schema validation. For simple forms, controlled components are acceptable.

### 3. Data and Backend

-   **Backend Interaction**: All communication with the backend (database queries, authentication) **must** go through the Supabase client available at `@/integrations/supabase/client.ts`.
-   **Data Fetching & Caching**: While `useEffect` is used for initial data loads in `AppContext`, consider using TanStack React Query for more complex server state management if needed (e.g., caching, background refetching).
-   **Date & Time**: Use `date-fns` for all date and time formatting and manipulation to ensure consistency.

### 4. User Feedback

-   **Notifications**: Use the `sonner` library for toast notifications to provide users with feedback on actions (e.g., "Sale created successfully," "Error updating stock").