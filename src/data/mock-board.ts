import { Column } from "@/components/board/board-layout";

// Mock card counts for demonstration
export const mockCardCounts: Record<string, number> = {
  "1": 6,    // Backlog (60% of limit)
  "1.1": 3,  // High Priority (no limit)
  "1.2": 2,  // Medium Priority (no limit)
  "1.3": 1,  // Low Priority (no limit)
  "2": 4,    // In Progress (80% of limit)
  "3": 3,    // Review (100% of limit)
  "4": 7,    // Done (no limit)
};

export const mockColumns: Column[] = [
  {
    id: "1",
    name: "Backlog",
    order: 1,
    wipLimit: 10,
    subColumns: [
      {
        id: "1.1",
        name: "High Priority",
        order: 1,
        parentId: "1",
      },
      {
        id: "1.2",
        name: "Medium Priority",
        order: 2,
        parentId: "1",
      },
      {
        id: "1.3",
        name: "Low Priority",
        order: 3,
        parentId: "1",
      }
    ]
  },
  {
    id: "2",
    name: "In Progress",
    order: 2,
    wipLimit: 5,
  },
  {
    id: "3",
    name: "Review",
    order: 3,
    wipLimit: 3,
  },
  {
    id: "4",
    name: "Done",
    order: 4,
  }
];