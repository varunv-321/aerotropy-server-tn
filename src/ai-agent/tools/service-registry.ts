/**
 * Global service registry to share services with AI tools
 * This pattern allows us to bypass limitations in the current tool context system
 */

import { DashboardService } from '../../dashboard/dashboard.service';

// Global registry to hold service instances
class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service in the registry
   */
  public registerService(name: string, service: any): void {
    this.services.set(name, service);
  }

  /**
   * Get a service from the registry
   */
  public getService<T>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Check if a service exists in the registry
   */
  public hasService(name: string): boolean {
    return this.services.has(name);
  }
}

// Export the singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Convenience methods for common services
export const getDashboardService = (): DashboardService | undefined => {
  return serviceRegistry.getService<DashboardService>('dashboardService');
};
