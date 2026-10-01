export type ContainerId = string;

export function isRowContainer(id: string): boolean {
  return id.startsWith('row:');
}

export function rowKeyFromContainer(id: string): string {
  return id.slice(4);
}
