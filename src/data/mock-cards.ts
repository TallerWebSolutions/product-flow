import { Card } from "@/components/board/card";

// Mock board ID
const BOARD_ID = "d3d5e773-107f-4bd6-8249-345d0b3b737a";

// Mock column IDs - should match the IDs in mock-board.ts
const COLUMN_IDS = {
  BACKLOG: "col_1",
  IN_PROGRESS: "col_2",
  REVIEW: "col_3",
  DONE: "col_4"
};

// Mock cards data
export const mockCards: Card[] = [
  // Backlog cards
  {
    id: "card_1",
    title: "Research user needs",
    description: "Conduct user interviews and surveys to understand requirements",
    order: 1,
    columnId: COLUMN_IDS.BACKLOG,
    boardId: BOARD_ID
  },
  {
    id: "card_2",
    title: "Create wireframes",
    description: "Design initial wireframes for the main dashboard",
    order: 2,
    columnId: COLUMN_IDS.BACKLOG,
    boardId: BOARD_ID
  },
  {
    id: "card_3",
    title: "Setup CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment",
    order: 3,
    columnId: COLUMN_IDS.BACKLOG,
    boardId: BOARD_ID
  },

  // In Progress cards
  {
    id: "card_4",
    title: "Implement authentication",
    description: "Add user signup, login, and password reset functionality",
    order: 1,
    columnId: COLUMN_IDS.IN_PROGRESS,
    boardId: BOARD_ID
  },
  {
    id: "card_5",
    title: "Create database schema",
    description: "Design and implement initial database structure",
    order: 2,
    columnId: COLUMN_IDS.IN_PROGRESS,
    boardId: BOARD_ID
  },

  // Review cards
  {
    id: "card_6",
    title: "User profile page",
    description: "Implement profile view and edit functionality",
    order: 1,
    columnId: COLUMN_IDS.REVIEW,
    boardId: BOARD_ID
  },

  // Done cards
  {
    id: "card_7",
    title: "Project setup",
    description: "Initialize repository and configure basic project structure",
    order: 1,
    columnId: COLUMN_IDS.DONE,
    boardId: BOARD_ID
  },
  {
    id: "card_8",
    title: "Design system",
    description: "Create basic design tokens and component standards",
    order: 2,
    columnId: COLUMN_IDS.DONE,
    boardId: BOARD_ID
  }
];