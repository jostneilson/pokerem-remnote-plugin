import type { RNPlugin } from '@remnote/plugin-sdk';

export async function shouldShowPokeRemNotification(plugin: RNPlugin): Promise<boolean> {
  try {
    const visible = await plugin.storage.getSession('pokerem.sidebarVisible');
    return visible !== true;
  } catch {
    return true;
  }
}

