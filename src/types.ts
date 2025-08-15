export interface Task {
  id: number;
  phase: string;
  name: string;
  owner: 'sena' | 'LS' | 'Joint';
  ownerDisplay: string;
  start: string;
  end: string;
  deliverable: string;
  deps: number[];
  startDate?: Date;
  endDate?: Date;
}

export interface Milestone {
  name: string;
  date: string;
}

export interface Owner {
  key: string;
  label: string;
}

export interface Action {
  what: string;
  cadence: string;
  kpi: string;
}

export interface Goal {
  person: string;
  role: string;
  period: string;
  revenueTarget: number;
  grossTarget: number;
  salary: number;
  skills: string[];
  principles: string[];
  actions: Action[];
}

export interface ChartDataItem extends Task {
  i: number;
  label: string;
  offset: number;
  duration: number;
  color: string;
}