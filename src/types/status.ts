export interface Status {
  id: string;
  name: string;
  color?: string;
  order?: number;
  transitionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transition {
  id: string;
  name?: string;
  fromStatus: string;
  toStatus: string;
  userId?: string; // User relationship from diagram
  createdAt: string;
  updatedAt: string;
}

export interface StatusColumn {
  id: string;
  statusId: string;
  columnId: string;
  createdAt: string;
  updatedAt: string;
} 