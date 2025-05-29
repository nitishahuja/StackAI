# Stack AI Drive Picker

A modern, premium UI for connecting, browsing, and managing files from Google Drive (or other sources) with Stack AI.

---

## Project Structure

```
drive-picker/
├── public/                   # Static assets (favicon, logo, etc.)
├── src/
│   ├── app/                  # Next.js app directory (routing, layout, global CSS)
│   │   ├── dashboard/        # Dashboard route (main app UI)
│   │   │   └── page.tsx      # Main dashboard page (entry point after login)
│   │   ├── layout.tsx        # Global layout, metadata, favicon, fonts
│   │   ├── page.tsx          # (Optional) Root landing page
│   │   └── globals.css       # Global Tailwind and custom CSS
│   ├── components/
│   │   ├── file-picker/      # FilePicker and related UI logic
│   │   │   └── FilePicker.tsx# Main file/folder browser component
│   │   └── ui/               # Reusable UI primitives (Button, Card, Table, Tooltip, etc.)
│   ├── hooks/                # Custom React hooks for data fetching and logic
│   │   ├── useFolderResources.ts # Fetches root folder resources
│   │   ├── useFolderChildren.ts  # Fetches children for a given folder
│   │   ├── useKnowledgeBaseIndex.ts # Knowledge base indexing logic
│   │   └── useAuth.ts             # Auth-related hooks
│   ├── lib/                  # Utilities, API functions, and icons
│   │   ├── api.ts            # All API calls (auth, connections, knowledge base, etc.)
│   │   ├── utils.ts          # Utility functions (formatting, classnames, etc.)
│   │   └── fileIcons.tsx     # Returns the correct icon for a file type
│   ├── store/                # Zustand stores for global state management
│   │   ├── auth.store.ts     # Auth state (user, tokens, org)
│   │   ├── filePicker.store.ts   # File/folder state, breadcrumbs, etc.
│   │   └── indexing.store.ts     # Indexing state (which files are indexed, etc.)
│   ├── types/                # TypeScript types and interfaces
│   │   └── index.ts          # Core types (FileResource, User, etc.)
│   └── middleware.ts         # (Optional) Next.js middleware
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
├── README.md                 # (You are here!)
└── ...other config files
```

---

## Key Files & Folders

- **public/**  
  Static files served at the root. Place your favicon, logo, etc. here.

- **src/app/**

  - `layout.tsx`: Global HTML structure, metadata, favicon, and font setup.
  - `dashboard/page.tsx`: Main dashboard page, handles connection selection, user info, and renders the FilePicker.
  - `globals.css`: Global Tailwind and custom CSS.

- **src/components/file-picker/FilePicker.tsx**  
  The main file/folder browser. Handles:

  - Displaying files/folders in a table
  - Filtering, searching, sorting
  - Indexing and deleting files
  - Dynamic icons and tooltips
  - Scrollable, modal-like UI

- **src/components/ui/**  
  Reusable UI primitives (Button, Card, Table, Tooltip, etc.) for consistent design.

- **src/hooks/**  
  Custom hooks for fetching folder resources and children using SWR, and for knowledge base and auth logic.

- **src/lib/api.ts**  
  All API calls: authentication, fetching connections/resources, knowledge base actions, etc.

- **src/lib/utils.ts**  
  Utility functions: formatting file sizes, dates, classnames, etc.

- **src/lib/fileIcons.tsx**  
  Returns the correct icon (Lucide) for a file type based on extension.

- **src/store/**  
  Zustand stores for global state:

  - `auth.store.ts`: Auth/user state
  - `filePicker.store.ts`: File/folder state, breadcrumbs, etc.
  - `indexing.store.ts`: Indexing state (which files are indexed, etc.)

- **src/types/index.ts**  
  TypeScript interfaces for all core data structures.

---

## How it Works

- **Authentication:**  
  User logs in, and their session is managed in the auth store.

- **Connections:**  
  User selects a Google Drive connection. The app fetches and displays files/folders for that connection.

- **File Picker:**

  - Displays files/folders in a scrollable, modal-like table.
  - Supports filtering, searching, and sorting.
  - Shows dynamic icons for each file type.
  - Allows indexing files (adding to knowledge base) and removing them.
  - UI is responsive and premium, with tooltips and smooth interactions.

- **State Management:**  
  Zustand is used for global state (auth, file picker, indexing).

- **API Layer:**  
  All backend communication is handled in `lib/api.ts`.

---

## Customization

- **Add new file types:**  
  Edit `lib/fileIcons.tsx` to add more icons/extensions.
- **UI tweaks:**  
  Adjust styles in `FilePicker.tsx` or UI components in `components/ui/`.
- **API endpoints:**  
  Update `lib/api.ts` as needed for your backend.
