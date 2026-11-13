import { ApplicationAdapter } from './base.adapter';
import { RiotAdapter } from './riot.adapter';
import { SteamAdapter } from './steam.adapter';
import { GenericAdapter } from './generic.adapter';

export class AdapterRegistry {
  private static adapters: Map<string, ApplicationAdapter> = new Map();

  static {
    this.register(new RiotAdapter());
    this.register(new SteamAdapter());
    this.register(new GenericAdapter());
  }

  public static register(adapter: ApplicationAdapter): void {
    this.adapters.set(adapter.id.toLowerCase(), adapter);
  }

  public static get(adapterId: string = 'generic'): ApplicationAdapter {
    const found = this.adapters.get(adapterId.toLowerCase());
    return found || this.adapters.get('generic')!;
  }

  public static list(): ApplicationAdapter[] {
    return Array.from(this.adapters.values());
  }
}
