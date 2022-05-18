export interface Weapon {
  name: string,
  label: string,
  ammoType?: string,
  attachments?: {name: string, label: string, hash: string}[],
  reason: string,
  type: string,
  attaching?: {
    canAttach: boolean,
    model: string,
    bone?: number,
    x?: number,
    y?: number,
    z?: number,
    xRotation?: number,
    yRotation?: number,
    zRotation?: number,
  }
}