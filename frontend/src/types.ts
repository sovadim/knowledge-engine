export enum NodeStatus {
  PASSED = "passed",
  FAILED = "failed",
  IN_PROGRESS = "in_progress",
  NOT_REACHED = "not_reached",
  DISABLED = "disabled",
}

export enum NodeLevel {
  A1 = "A1",
  A2 = "A2",
  A3 = "A3",
}

export interface Node {
  id: number;
  name: string;
  status: NodeStatus;
  level: NodeLevel;
  child_nodes: number[];
  parent_nodes: number[];
  question?: string;
  criteria?: string;
}
