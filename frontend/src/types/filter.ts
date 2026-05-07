
// filter type
export type FilterType = "ip" | "fqdn" | "port" | "process" | "subnet" | "service";

export type FilterOperation = "include" | "exclude";


export type filter = {
  id: string;
  type: FilterType;
  operation: FilterOperation;
  value: string;
};

