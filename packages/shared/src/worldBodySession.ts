import type { WorldProject } from './index';
import { activeWorldBodyId, readWorldBodyCatalog } from './worldBodies';

const activeBodyByProject = new Map<string, string>();

export function rememberSessionActiveWorldBody(project: WorldProject, bodyId: string): boolean {
  const catalog = readWorldBodyCatalog(project);
  if (!catalog.bodies.some((body) => body.bodyId === bodyId)) return false;
  activeBodyByProject.set(project.projectId, bodyId);
  return true;
}

export function sessionActiveWorldBodyId(project: WorldProject): string {
  const remembered = activeBodyByProject.get(project.projectId);
  const catalog = readWorldBodyCatalog(project);
  if (remembered && catalog.bodies.some((body) => body.bodyId === remembered)) return remembered;
  return activeWorldBodyId(project);
}

export function resetSessionActiveWorldBody(projectId?: string): void {
  if (projectId) activeBodyByProject.delete(projectId);
  else activeBodyByProject.clear();
}
